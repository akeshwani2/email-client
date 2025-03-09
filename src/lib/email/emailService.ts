import { google } from 'googleapis';
import { EmailAccount, Email, EmailProvider, EmailAction, EmailImportance, Label, AIResponse, EmailCategory } from '@/types/email';
import nodemailer from 'nodemailer';
import { EmailAnalyzer } from '../ai/emailAnalyzer';
import { gmail_v1 } from 'googleapis';

export class EmailService {
  private emailAnalyzer: EmailAnalyzer;
  private historyId: string | null = null;
  private lastCheckTime: Date | null = null;
  private processedEmails: Set<string> = new Set();
  
  constructor(aiApiKey: string) {
    this.emailAnalyzer = new EmailAnalyzer(aiApiKey);
  }

  async connectAccount(account: EmailAccount) {
    switch (account.provider) {
      case EmailProvider.GMAIL:
        return this.connectGmail(account);
      case EmailProvider.OUTLOOK:
        return this.connectOutlook(account);
      case EmailProvider.IMAP:
        return this.connectIMAP(account);
      default:
        throw new Error('Unsupported email provider');
    }
  }

  private async connectGmail(account: EmailAccount) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      throw new Error('Missing required Google OAuth credentials in environment variables');
    }

    if (!account.accessToken) {
      throw new Error('Missing Gmail access token');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    try {
      oauth2Client.setCredentials({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Test the connection by making a simple API call
      await gmail.users.getProfile({ userId: 'me' });
      
      return gmail;
    } catch (error) {
      console.error('Error connecting to Gmail:', error);
      if (error instanceof Error) {
        if (error.message.includes('invalid_grant')) {
          throw new Error('Gmail authentication failed. Please reconnect your account.');
        }
        throw new Error(`Gmail connection error: ${error.message}`);
      }
      throw new Error('Failed to connect to Gmail');
    }
  }

  private async connectOutlook(account: EmailAccount) {
    // Implement Outlook connection
    throw new Error('Outlook connection not implemented yet');
  }

  private async connectIMAP(account: EmailAccount) {
    // Implement IMAP connection
    throw new Error('IMAP connection not implemented yet');
  }

  async fetchEmails(account: EmailAccount, maxResults: number = 50): Promise<Email[]> {
    switch (account.provider) {
      case EmailProvider.GMAIL:
        return this.fetchGmailEmails(account, maxResults);
      case EmailProvider.OUTLOOK:
        return this.fetchOutlookEmails(account, maxResults);
      case EmailProvider.IMAP:
        return this.fetchIMAPEmails(account, maxResults);
      default:
        throw new Error('Unsupported email provider');
    }
  }

  private async fetchGmailEmails(account: EmailAccount, maxResults: number): Promise<Email[]> {
    console.log('Attempting to connect to Gmail...');
    const gmail = await this.connectGmail(account);
    console.log('Gmail connection established');
    
    // First fetch all labels to have the mapping
    const allLabels = await this.fetchGmailLabels(account);
    const labelMap = new Map(allLabels.map(label => [label.gmailLabelId!, label]));
    
    console.log('Fetching message list...');
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,  // Just get 3 most recent emails
      labelIds: ['CATEGORY_PERSONAL']  // Only fetch emails from Primary category
    });
    console.log(`Found ${response.data.messages?.length || 0} messages to process`);

    const emails: Email[] = [];
    
    for (const message of response.data.messages || []) {
      console.log('Fetching full message:', message.id);
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
      });
      console.log('Got full message');

      const headers = fullMessage.data.payload?.headers;
      const from = headers?.find((h: gmail_v1.Schema$MessagePartHeader) => h.name === 'From')?.value || '';
      const subject = headers?.find((h: gmail_v1.Schema$MessagePartHeader) => h.name === 'Subject')?.value || '';
      const to = headers?.find((h: gmail_v1.Schema$MessagePartHeader) => h.name === 'To')?.value?.split(',') || [];
      
      // Skip sent emails and non-primary category emails
      const isInPrimary = fullMessage.data.labelIds?.includes('CATEGORY_PERSONAL') || false;
      const isSentEmail = fullMessage.data.labelIds?.includes('SENT') || false;
      
      if (!isInPrimary || isSentEmail) {
        console.log('Skipping non-primary or sent email from:', from, '(ID:', message.id, ')');
        continue;
      }
      
      // Map Gmail label IDs to our label objects
      const emailLabels = (fullMessage.data.labelIds || [])
        .map(labelId => labelMap.get(labelId))
        .filter((label): label is Label => label !== undefined);
      
      console.log('Email labels:', fullMessage.data.labelIds);  // Debug log

      const email: Email = {
        id: message.id!,
        threadId: fullMessage.data.threadId!,
        from,
        to,
        subject,
        body: this.decodeBody(fullMessage.data),
        timestamp: new Date(parseInt(fullMessage.data.internalDate || '0')),
        read: !fullMessage.data.labelIds?.includes('UNREAD'),
        handled: false,
        importance: EmailImportance.MEDIUM,
        labels: emailLabels
      };

      // Check if email has any of our custom labels (ignore Gmail's system labels)
      const systemLabels = ['INBOX', 'SENT', 'IMPORTANT', 'UNREAD', 'DRAFT', 'SPAM', 'TRASH', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'];
      const hasCustomLabel = fullMessage.data.labelIds?.some(labelId => !systemLabels.includes(labelId)) || false;

      // Only analyze with AI if the email has no custom labels yet
      if (!hasCustomLabel) {
        try {
          console.log('Analyzing unlabeled email from:', from, '(ID:', email.id, ')');
          const analysis = await this.emailAnalyzer.analyzeEmail(email, allLabels);
          email.category = analysis.category;
          email.importance = analysis.importance;
          email.aiSummary = analysis.summary;
          email.suggestedAction = analysis.suggestedAction;
          email.suggestedResponse = analysis.suggestedResponse;
          console.log('AI analysis complete for email from:', from, '(ID:', email.id, ')');

          // Apply the suggested label if one was provided
          if (analysis.suggestedLabel?.gmailLabelId) {
            try {
              await this.addLabelToEmail(account, email.id, analysis.suggestedLabel.gmailLabelId);
              console.log(`Applied ${analysis.suggestedLabel.name} label to email from:`, from, '(ID:', email.id, ')');
              email.labels = [...email.labels, analysis.suggestedLabel];
            } catch (error) {
              console.error(`Failed to apply ${analysis.suggestedLabel.name} label to email from:`, from, '(ID:', email.id, ')', error);
            }
          }
        } catch (error) {
          console.error('Error in AI processing for email from:', from, '(ID:', email.id, ')', error);
        }
      } else {
        console.log('Skipping AI analysis for already labeled email from:', from, '(ID:', email.id, ')');
      }

      emails.push(email);
    }

    console.log('Returning', emails.length, 'emails');
    return emails;
  }

  private decodeBody(message: any): string {
    if (message.payload?.body?.data) {
      return Buffer.from(message.payload.body.data, 'base64').toString();
    }
    
    if (message.payload?.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString();
        }
      }
    }
    
    return '';
  }

  private async determineImportance(from: string, subject: string) {
    // Implement your importance determination logic
    // This could be based on sender, keywords, etc.
    return 'MEDIUM';
  }

  async executeAction(email: Email, action: EmailAction, account: EmailAccount) {
    switch (action) {
      case EmailAction.REPLY:
        if (email.suggestedResponse) {
          await this.sendEmail({
            from: account.email,
            to: [email.from],
            subject: `Re: ${email.subject}`,
            body: email.suggestedResponse,
            threadId: email.threadId
          }, account);
          console.log('Created draft reply for:', email.subject);
        }
        break;
      case EmailAction.ARCHIVE:
        await this.archiveEmail(email, account);
        break;
      case EmailAction.DELETE:
        await this.deleteEmail(email, account);
        break;
      // Implement other actions
    }
  }

  private async sendEmail(email: { from: string, to: string[], subject: string, body: string, threadId: string }, account: EmailAccount) {
    switch (account.provider) {
      case EmailProvider.GMAIL:
        const gmail = await this.connectGmail(account);
        const raw = this.createRawEmail(email);
        // Create a draft instead of sending
        await gmail.users.drafts.create({
          userId: 'me',
          requestBody: {
            message: {
              raw,
              threadId: email.threadId
            }
          }
        });
        console.log('Created draft response for email from:', email.from);
        break;
      // Implement other providers
    }
  }

  private createRawEmail(email: { from: string, to: string[], subject: string, body: string }): string {
    const message = [
      `From: ${email.from}`,
      `To: ${email.to.join(', ')}`,
      `Subject: ${email.subject}`,
      '',
      email.body,
    ].join('\n');

    return Buffer.from(message).toString('base64url');
  }

  private async archiveEmail(email: Email, account: EmailAccount) {
    // Implement archive logic for different providers
  }

  private async deleteEmail(email: Email, account: EmailAccount) {
    // Implement delete logic for different providers
  }

  private async fetchOutlookEmails(account: EmailAccount, maxResults: number): Promise<Email[]> {
    throw new Error('Outlook email fetching not implemented yet');
  }

  private async fetchIMAPEmails(account: EmailAccount, maxResults: number): Promise<Email[]> {
    throw new Error('IMAP email fetching not implemented yet');
  }

  async createGmailLabel(account: EmailAccount, label: Label): Promise<Label> {
    console.log('Creating Gmail label:', label);
    const gmail = await this.connectGmail(account);
    
    try {
      const response = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: label.name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show'
        }
      });

      console.log('Gmail label creation response:', response.data);

      if (!response.data.id) {
        throw new Error('Gmail did not return a label ID');
      }

      return {
        ...label,
        gmailLabelId: response.data.id
      };
    } catch (error) {
      console.error('Error creating Gmail label:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to create Gmail label: ${error.message}`);
      }
      throw new Error('Failed to create Gmail label: Unknown error');
    }
  }

  async addLabelToEmail(account: EmailAccount, emailId: string, labelId: string): Promise<void> {
    const gmail = await this.connectGmail(account);
    
    await gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        addLabelIds: [labelId]
      }
    });
  }

  async removeLabelFromEmail(account: EmailAccount, emailId: string, labelId: string): Promise<void> {
    const gmail = await this.connectGmail(account);
    
    await gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        removeLabelIds: [labelId]
      }
    });
  }

  async fetchGmailLabels(account: EmailAccount): Promise<Label[]> {
    const gmail = await this.connectGmail(account);
    
    const response = await gmail.users.labels.list({
      userId: 'me'
    });

    return (response.data.labels || []).map(label => ({
      id: label.id!,
      name: label.name!,
      color: this.convertHexToTailwind(label.color?.backgroundColor || '#ffffff'),
      gmailLabelId: label.id || undefined  // Handle null case by converting to undefined
    }));
  }

  private convertTailwindToHex(tailwindColor: string): { backgroundColor: string; textColor: string } {
    // Gmail's official color palette
    const colorMap: Record<string, { backgroundColor: string; textColor: string }> = {
      'bg-red-100': {
        backgroundColor: '#fce8e6',
        textColor: '#d93025'
      },
      'bg-blue-100': {
        backgroundColor: '#e8f0fe',
        textColor: '#1a73e8'
      },
      'bg-green-100': {
        backgroundColor: '#e6f4ea',
        textColor: '#137333'
      },
      'bg-yellow-100': {
        backgroundColor: '#fef7e0',
        textColor: '#ea8600'
      },
      'bg-purple-100': {
        backgroundColor: '#f3e8fd',
        textColor: '#a142f4'
      },
      'bg-gray-100': {
        backgroundColor: '#f1f3f4',
        textColor: '#5f6368'
      }
    };
    return colorMap[tailwindColor] || colorMap['bg-gray-100'];
  }

  private convertHexToTailwind(hex: string): string {
    // Reverse mapping from Gmail colors to Tailwind
    const colorMap: Record<string, string> = {
      '#fce8e6': 'bg-red-100',
      '#e8f0fe': 'bg-blue-100',
      '#e6f4ea': 'bg-green-100',
      '#fef7e0': 'bg-yellow-100',
      '#f3e8fd': 'bg-purple-100',
      '#f1f3f4': 'bg-gray-100'
    };
    return colorMap[hex.toLowerCase()] || 'bg-gray-100';
  }

  async startEmailMonitoring(account: EmailAccount) {
    if (account.provider !== EmailProvider.GMAIL) {
      throw new Error('Real-time monitoring currently only supported for Gmail');
    }

    try {
      console.log('Starting email monitoring...');
      // Initial check
      await this.checkNewEmails(account);
      
      // Start polling every 30 seconds
      setInterval(() => this.checkNewEmails(account), 30000);
      
      console.log('Email monitoring started successfully');
    } catch (error) {
      console.error('Failed to start email monitoring:', error);
      throw error;
    }
  }

  private async checkNewEmails(account: EmailAccount) {
    const gmail = await this.connectGmail(account);
    
    try {
      // Get all unprocessed primary emails from the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const query = `in:inbox category:primary after:${Math.floor(oneHourAgo.getTime() / 1000)}`;
      
      console.log('Checking for new emails with query:', query);

      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50  // Increased to handle more emails
      });

      if (!response.data.messages?.length) {
        console.log('No new messages found');
        return;
      }

      console.log(`Found ${response.data.messages.length} messages to check`);

      for (const message of response.data.messages) {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full'  // Get full message data including threadId
        });

        // Skip if we've already processed this email
        if (this.processedEmails.has(message.id!)) {
          console.log('Skipping already processed email:', message.id);
          continue;
        }

        await this.processNewEmail(account, fullMessage.data);
        
        // Mark as processed
        this.processedEmails.add(message.id!);
      }
    } catch (error) {
      console.error('Error checking for new emails:', error);
    }
  }

  private async processNewEmail(account: EmailAccount, message: gmail_v1.Schema$Message) {
    const headers = message.payload?.headers;
    const from = headers?.find(h => h.name === 'From')?.value || '';
    const subject = headers?.find(h => h.name === 'Subject')?.value || '';
    const to = headers?.find(h => h.name === 'To')?.value?.split(',') || [];

    // Skip if it's a sent email
    if (message.labelIds?.includes('SENT')) {
      console.log('Skipping sent email from:', from);
      return;
    }

    console.log('Processing new email from:', from, 'Subject:', subject);
    console.log('Email labels:', message.labelIds);  // Debug log

    const allLabels = await this.fetchGmailLabels(account);
    const labelMap = new Map(allLabels.map(label => [label.gmailLabelId!, label]));
    
    const emailLabels = (message.labelIds || [])
      .map(labelId => labelMap.get(labelId))
      .filter((label): label is Label => label !== undefined);

    const email: Email = {
      id: message.id!,
      threadId: message.threadId!,
      from,
      to,
      subject,
      body: this.decodeBody(message),
      timestamp: new Date(parseInt(message.internalDate || '0')),
      read: !message.labelIds?.includes('UNREAD'),
      handled: false,
      importance: EmailImportance.MEDIUM,
      labels: emailLabels
    };

    // Check if email has any of our custom labels (ignore Gmail's system labels)
    const systemLabels = ['INBOX', 'SENT', 'IMPORTANT', 'UNREAD', 'DRAFT', 'SPAM', 'TRASH', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'];
    const hasCustomLabel = message.labelIds?.some(labelId => !systemLabels.includes(labelId)) || false;

    // Only analyze with AI if the email has no custom labels yet
    if (!hasCustomLabel) {
      try {
        console.log('Analyzing new email from:', from, '(ID:', email.id, ')');
        const analysis = await this.emailAnalyzer.analyzeEmail(email, allLabels);
        email.category = analysis.category;
        email.importance = analysis.importance;
        email.aiSummary = analysis.summary;
        email.suggestedAction = analysis.suggestedAction;
        email.suggestedResponse = analysis.suggestedResponse;

        // Apply the suggested label from AI analysis
        if (analysis.suggestedLabel?.gmailLabelId) {
          await this.addLabelToEmail(account, email.id, analysis.suggestedLabel.gmailLabelId);
          console.log(`Applied ${analysis.suggestedLabel.name} label to new email from:`, from);
          email.labels = [...email.labels, analysis.suggestedLabel];

          // Check for automations that match this label
          await this.checkAndExecuteAutomations(email, account, analysis.suggestedLabel);
        }

        // If action is needed, apply the "Needs Action" label
        if (analysis.suggestedAction !== EmailAction.NONE) {
          const needsActionLabel = allLabels.find(label => label.name === 'Needs Action');
          if (needsActionLabel?.gmailLabelId) {
            await this.addLabelToEmail(account, email.id, needsActionLabel.gmailLabelId);
            console.log('Applied "Needs Action" label');
            email.labels = [...email.labels, needsActionLabel];

            // Check for automations that match this label
            await this.checkAndExecuteAutomations(email, account, needsActionLabel);
          }
        }

        // If it's an investor email, apply the "Investor Email" label
        if (analysis.category === EmailCategory.IMPORTANT || /investor|investment|funding|venture|capital/i.test(email.subject + ' ' + email.body)) {
          const investorLabel = allLabels.find(label => label.name === 'Investor Email');
          if (investorLabel?.gmailLabelId) {
            await this.addLabelToEmail(account, email.id, investorLabel.gmailLabelId);
            console.log('Applied "Investor Email" label');
            email.labels = [...email.labels, investorLabel];

            // Check for automations that match this label
            await this.checkAndExecuteAutomations(email, account, investorLabel);
          }
        }
      } catch (error) {
        console.error('Error processing new email:', error);
      }
    } else {
      console.log('Skipping AI analysis for already labeled email from:', from);
    }
  }

  private async checkAndExecuteAutomations(email: Email, account: EmailAccount, label: Label) {
    try {
      // Get automations from localStorage
      const savedAutomations = typeof window !== 'undefined' ? localStorage.getItem('emailAutomations') : null;
      if (!savedAutomations) return;

      const automations = JSON.parse(savedAutomations);
      
      // Find matching automations for this label
      const matchingAutomations = automations.filter((automation: any) => 
        automation.enabled && 
        automation.label.name === label.name
      );

      // Execute each matching automation
      for (const automation of matchingAutomations) {
        console.log(`Executing automation for label "${label.name}": ${automation.action}`);
        await this.executeAction(email, automation.action, account);
      }
    } catch (error) {
      console.error('Error executing automations:', error);
    }
  }
} 