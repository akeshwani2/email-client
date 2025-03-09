import { NextResponse } from 'next/server';
import emailService from '@/lib/email/emailServiceInstance';
import { AutomationRule } from '@/types/email';

// Store automations in memory on the server
let serverAutomations: AutomationRule[] = [];

export async function POST(request: Request) {
  const automations = await request.json();
  serverAutomations = automations;  // Update server-side store
  emailService.setAutomations(automations);
  console.log('Updated server automations:', automations);
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ automations: serverAutomations });
} 