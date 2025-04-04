import { GoogleGenerativeAI } from '@google/generative-ai';
import { Email, AIResponse, EmailCategory, EmailAction, EmailImportance, Label } from '@/types/email';

export class EmailAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async analyzeEmail(email: Email, availableLabels: Label[]): Promise<AIResponse> {
    // Create a list of label names for the AI to choose from
    const labelOptions = availableLabels
      .map(l => `"${l.name}"`)  // Quote each label name for clarity
      .join(', ');
    
    const prompt = `
      Analyze this email and categorize it into exactly one of the user's existing labels.
      
      Email Details:
      From: ${email.from}
      Subject: ${email.subject}
      Body: ${email.body}
      
      Available Labels: ${labelOptions}

      Instructions:
      1. Choose exactly one label from the Available Labels list that best fits this email
      2. Explain why this label is the most appropriate choice
      3. Do not suggest new labels or use labels not in the list
      4. Consider the email's content, sender, and subject when choosing the label
      5. Don't use quotes around your response. 
      6. Act like a human, not a robot and respond in a way that is easy to understand and not too verbose.

      Also analyze the email for:
      - Appropriate action (REPLY, FORWARD, ARCHIVE, DELETE, FLAG, NONE)
      - Category (URGENT, IMPORTANT, FOLLOW_UP, NEWSLETTER, PROMOTIONAL, SPAM, OTHER)
      - Importance level (HIGH, MEDIUM, LOW)
      - Confidence in your label choice (0-1)
      - If action is REPLY, suggest a response

      Provide your response in this exact format:
      Label: [must be one from Available Labels]
      Reasoning: [brief explanation]
      Action: [REPLY/FORWARD/ARCHIVE/DELETE/FLAG/NONE]
      Category: [URGENT/IMPORTANT/FOLLOW_UP/NEWSLETTER/PROMOTIONAL/SPAM/OTHER]
      Importance: [HIGH/MEDIUM/LOW]
      Confidence: [0-1]
      Response: [if action is REPLY, provide suggested response]
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      return this.parseAIResponse(response, availableLabels);
    } catch (error) {
      console.error('Error analyzing email:', error);
      throw error;
    }
  }

  private parseAIResponse(response: string, availableLabels: Label[]): AIResponse {
    const lines = response.split('\n');
    
    // Find the suggested label from AI's response
    const labelLine = lines.find(l => l.startsWith('Label:'))?.split(':')[1]?.trim() || '';
    const suggestedLabel = availableLabels.find(l => l.name === labelLine);
    
    return {
      summary: lines.find(l => l.startsWith('Reasoning:'))?.split(':')[1]?.trim() || '',
      suggestedAction: this.parseAction(lines.find(l => l.startsWith('Action:'))),
      category: this.parseCategory(lines.find(l => l.startsWith('Category:'))),
      importance: this.parseImportance(lines.find(l => l.startsWith('Importance:'))),
      confidence: this.parseConfidence(lines.find(l => l.startsWith('Confidence:'))),
      suggestedResponse: lines.find(l => l.startsWith('Response:'))?.split(':')[1]?.trim(),
      suggestedLabel: suggestedLabel || null
    };
  }

  private parseAction(line?: string): EmailAction {
    if (!line) return EmailAction.NONE;
    if (line.includes('REPLY')) return EmailAction.REPLY;
    if (line.includes('FORWARD')) return EmailAction.FORWARD;
    if (line.includes('ARCHIVE')) return EmailAction.ARCHIVE;
    if (line.includes('DELETE')) return EmailAction.DELETE;
    if (line.includes('FLAG')) return EmailAction.FLAG;
    return EmailAction.NONE;
  }

  private parseCategory(line?: string): EmailCategory {
    if (!line) return EmailCategory.OTHER;
    if (line.includes('URGENT')) return EmailCategory.URGENT;
    if (line.includes('IMPORTANT')) return EmailCategory.IMPORTANT;
    if (line.includes('FOLLOW_UP')) return EmailCategory.FOLLOW_UP;
    if (line.includes('NEWSLETTER')) return EmailCategory.NEWSLETTER;
    if (line.includes('PROMOTIONAL')) return EmailCategory.PROMOTIONAL;
    if (line.includes('SPAM')) return EmailCategory.SPAM;
    return EmailCategory.OTHER;
  }

  private parseImportance(line?: string): EmailImportance {
    if (!line) return EmailImportance.LOW;
    if (line.includes('HIGH')) return EmailImportance.HIGH;
    if (line.includes('MEDIUM')) return EmailImportance.MEDIUM;
    return EmailImportance.LOW;
  }

  private parseConfidence(line?: string): number {
    if (!line) return 0;
    const match = line.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  }

  /**
   * Generates a complete response for investor emails
   */
  async generateInvestorResponse(email: Email): Promise<string> {
    try {
      const prompt = `
You are a professional startup founder responding to a potential investor.
The email you received is:

From: ${email.from}
Subject: ${email.subject}
Body: ${email.body}

Write a complete, professional response that:
1. Thanks them for their interest
2. Provides a brief overview of your company's current status
3. Expresses interest in further discussion
4. Suggests next steps (like a call or meeting)
5. Includes a proper greeting and sign-off
6. Is friendly but professional in tone

Your response should be ready to send with minimal or no editing.
`;

      const response = await this.callAI(prompt);
      
      // Ensure we have a complete response
      if (!response || !response.trim()) {
        return this.getFallbackInvestorResponse(email);
      }
      
      return response;
    } catch (error) {
      console.error('Error generating investor response:', error);
      return this.getFallbackInvestorResponse(email);
    }
  }

  /**
   * Provides a fallback response if AI generation fails
   */
  private getFallbackInvestorResponse(email: Email): string {
    const senderName = this.extractNameFromEmail(email.from);
    return `Dear ${senderName},

Thank you for your interest in our company. I'd be happy to discuss potential investment opportunities.

Could we schedule a call next week to discuss this further?

Best regards,
[Your Name]`;
  }

  /**
   * Extract name from email address
   */
  private extractNameFromEmail(email: string): string {
    const nameMatch = email.match(/^([^<]+)</);
    if (nameMatch && nameMatch[1].trim()) {
      return nameMatch[1].trim();
    }
    return 'there';
  }

  /**
   * Makes the actual API call to the Gemini AI service using the SDK
   */
  private async callAI(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Error calling Gemini AI service:', error);
      throw error;
    }
  }
} 