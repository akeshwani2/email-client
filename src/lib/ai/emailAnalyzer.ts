import { OpenAI } from 'openai';
import { Email, AIResponse, EmailCategory, EmailAction, EmailImportance } from '@/types/email';

export class EmailAnalyzer {
  private openai: OpenAI;
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async analyzeEmail(email: Email): Promise<AIResponse> {
    const prompt = `
      Analyze this email and provide a structured response:
      
      From: ${email.from}
      Subject: ${email.subject}
      Body: ${email.body}
      
      Provide:
      1. A brief summary
      2. Suggested action (REPLY, FORWARD, ARCHIVE, DELETE, FLAG, NONE)
      3. Email category (URGENT, IMPORTANT, FOLLOW_UP, NEWSLETTER, PROMOTIONAL, SPAM, OTHER)
      4. Importance level (HIGH, MEDIUM, LOW)
      5. Confidence score (0-1)
      6. If action is REPLY, provide a suggested response
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an AI email assistant that helps analyze emails and suggest appropriate actions. Be concise and professional."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content || '';
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('Error analyzing email:', error);
      throw error;
    }
  }

  private parseAIResponse(response: string): AIResponse {
    // This is a simple parser - you might want to make it more robust
    const lines = response.split('\n');
    
    return {
      summary: lines.find(l => l.includes('summary'))?.split(':')[1]?.trim() || '',
      suggestedAction: this.parseAction(lines.find(l => l.includes('action'))),
      category: this.parseCategory(lines.find(l => l.includes('category'))),
      importance: this.parseImportance(lines.find(l => l.includes('importance'))),
      confidence: this.parseConfidence(lines.find(l => l.includes('confidence'))),
      suggestedResponse: lines.find(l => l.includes('response'))?.split(':')[1]?.trim(),
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
} 