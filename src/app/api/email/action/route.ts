import { NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/emailService';
import { EmailAction, EmailProvider, Email } from '@/types/email';

const emailService = new EmailService(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { email, action } = await request.json();

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

    // Execute the action with complete email object
    await emailService.executeAction(
      email as Email,
      action as EmailAction,
      account
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error executing email action:', error);
    return NextResponse.json(
      { error: 'Failed to execute email action' },
      { status: 500 }
    );
  }
} 