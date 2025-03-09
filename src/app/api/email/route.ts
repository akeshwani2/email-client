import { NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/emailService';
import { EmailProvider } from '@/types/email';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

const emailService = new EmailService(process.env.GEMINI_API_KEY);

// Start email monitoring when the service initializes
const account = {
  id: '1',
  email: 'user@example.com',
  provider: EmailProvider.GMAIL,
  accessToken: process.env.GMAIL_ACCESS_TOKEN || '',
  refreshToken: process.env.GMAIL_REFRESH_TOKEN,
  connected: true,
};

// Start monitoring in the background
emailService.startEmailMonitoring(account).catch(error => {
  console.error('Failed to start email monitoring:', error);
});

export async function GET() {
  try {
    const emails = await emailService.fetchEmails(account);
    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}