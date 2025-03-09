import { NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/emailService';
import { EmailProvider } from '@/types/email';

const emailService = new EmailService(process.env.OPENAI_API_KEY || '');

export async function GET(request: Request) {
  console.log('Email API route called');
  try {
    // Get the user's email account from the session
    // This is a placeholder - you'll need to implement proper auth
    const account = {
      id: '1',
      email: 'user@example.com',
      provider: EmailProvider.GMAIL,
      accessToken: process.env.GMAIL_ACCESS_TOKEN || '',
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      connected: true,
    };

    console.log('Using account:', { ...account, accessToken: '***', refreshToken: '***' });
    
    const emails = await emailService.fetchEmails(account);
    console.log('Fetched emails count:', emails.length);
    
    return NextResponse.json(emails);
  } catch (error) {
    console.error('Error in email API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 