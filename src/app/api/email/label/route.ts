import { NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/emailService';
import { EmailProvider, Label } from '@/types/email';

const emailService = new EmailService(process.env.GEMINI_API_KEY || '');

// Get all labels
export async function GET() {
  try {
    console.log('Checking environment variables:', {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
      GMAIL_ACCESS_TOKEN: !!process.env.GMAIL_ACCESS_TOKEN,
      GMAIL_REFRESH_TOKEN: !!process.env.GMAIL_REFRESH_TOKEN,
    });

    const account = {
      id: '1',
      email: 'user@example.com',
      provider: EmailProvider.GMAIL,
      accessToken: process.env.GMAIL_ACCESS_TOKEN || '',
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      connected: true,
    };

    const labels = await emailService.fetchGmailLabels(account);
    return NextResponse.json(labels);
  } catch (error) {
    console.error('Error fetching labels:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch labels' },
      { status: 500 }
    );
  }
}

// Create a new label or modify email labels
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Label operation request:', body);

    const { action, label, emailId, labelId } = body;
    
    console.log('Checking environment variables:', {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
      GMAIL_ACCESS_TOKEN: !!process.env.GMAIL_ACCESS_TOKEN,
      GMAIL_REFRESH_TOKEN: !!process.env.GMAIL_REFRESH_TOKEN,
    });

    const account = {
      id: '1',
      email: 'user@example.com',
      provider: EmailProvider.GMAIL,
      accessToken: process.env.GMAIL_ACCESS_TOKEN || '',
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      connected: true,
    };

    console.log('Using account:', { ...account, accessToken: '[REDACTED]', refreshToken: '[REDACTED]' });

    switch (action) {
      case 'create':
        console.log('Creating new label:', label);
        const newLabel = await emailService.createGmailLabel(account, label as Label);
        console.log('Label created successfully:', newLabel);
        return NextResponse.json(newLabel);
      
      case 'add':
        console.log('Adding label to email:', { emailId, labelId });
        await emailService.addLabelToEmail(account, emailId, labelId);
        console.log('Label added successfully');
        return NextResponse.json({ success: true });
      
      case 'remove':
        console.log('Removing label from email:', { emailId, labelId });
        await emailService.removeLabelFromEmail(account, emailId, labelId);
        console.log('Label removed successfully');
        return NextResponse.json({ success: true });
      
      default:
        console.error('Invalid action:', action);
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error handling label operation:', error);
    // Return more detailed error information
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to perform label operation',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 