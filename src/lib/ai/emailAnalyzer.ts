import { GoogleGenerativeAI } from '@google/generative-ai';
import { Email, AIResponse, EmailCategory, EmailAction, EmailImportance } from '@/types/email';

export class EmailAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async analyzeEmail(email: Email): Promise<AIResponse> {
    const prompt = `
      Analyze this email and provide a structured response:
      
      From: ${email.from}
      Subject: ${email.subject}
      Body: ${email.body}
      
      For testing purposes, we want you to consider if this email should be labeled with "Test".
      Since we are in testing phase, ALL emails should be marked for the "Test" label.
      
      Provide your response in the following format:
      1. A brief summary
      2. Suggested action (REPLY, FORWARD, ARCHIVE, DELETE, FLAG, NONE)
      3. Email category (URGENT, IMPORTANT, FOLLOW_UP, NEWSLETTER, PROMOTIONAL, SPAM, OTHER)
      4. Importance level (HIGH, MEDIUM, LOW)
      5. Confidence score (0-1)
      6. Should apply "Test" label (true/false) - for now, always respond with true
      7. If action is REPLY, provide a suggested response
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('Error analyzing email:', error);
      throw error;
    }
  }

  private parseAIResponse(response: string): AIResponse {
    const lines = response.split('\n');
    
    return {
      summary: lines.find(l => l.includes('summary'))?.split(':')[1]?.trim() || '',
      suggestedAction: this.parseAction(lines.find(l => l.includes('action'))),
      category: this.parseCategory(lines.find(l => l.includes('category'))),
      importance: this.parseImportance(lines.find(l => l.includes('importance'))),
      confidence: this.parseConfidence(lines.find(l => l.includes('confidence'))),
      suggestedResponse: lines.find(l => l.includes('response'))?.split(':')[1]?.trim(),
      shouldApplyTestLabel: true  // For now, always true
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