import { NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/emailService';
import { EmailProvider } from '@/types/email';

export async function GET() {
  try {
    // Check required environment variables
    const requiredEnvVars = {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
      GMAIL_ACCESS_TOKEN: process.env.GMAIL_ACCESS_TOKEN,
      GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY
    };

    console.log('Checking environment variables:', {
      ...requiredEnvVars,
      GOOGLE_CLIENT_ID: !!requiredEnvVars.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!requiredEnvVars.GOOGLE_CLIENT_SECRET,
      GMAIL_ACCESS_TOKEN: !!requiredEnvVars.GMAIL_ACCESS_TOKEN,
      GMAIL_REFRESH_TOKEN: !!requiredEnvVars.GMAIL_REFRESH_TOKEN,
      GEMINI_API_KEY: !!requiredEnvVars.GEMINI_API_KEY
    });

    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }

    const emailService = new EmailService(process.env.GEMINI_API_KEY!);
    
    const emails = await emailService.fetchEmails({
      id: '1',
      email: 'user@example.com',
      provider: EmailProvider.GMAIL,
      accessToken: process.env.GMAIL_ACCESS_TOKEN!,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
      connected: true
    });

    console.log('Fetched emails count:', emails.length);

    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Error in email route:', error);
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
} 