import { GoogleGenerativeAI } from '@google/generative-ai';
import { Email, AIResponse, EmailCategory, EmailAction, EmailImportance, Label } from '@/types/email';

export class EmailAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async analyzeEmail(email: Email, availableLabels: Label[]): Promise<AIResponse> {
    // Create a list of label names for the AI to choose from
    const labelOptions = availableLabels.map(l => l.name).join(', ');
    
    const prompt = `
      Analyze this email and categorize it appropriately:
      
      From: ${email.from}
      Subject: ${email.subject}
      Body: ${email.body}
      
      Available Labels: ${labelOptions}

      Based on the email content and available labels, determine:
      1. Which label best categorizes this email
      2. A brief summary of why this label fits
      3. Suggested action (REPLY, FORWARD, ARCHIVE, DELETE, FLAG, NONE)
      4. Email category (URGENT, IMPORTANT, FOLLOW_UP, NEWSLETTER, PROMOTIONAL, SPAM, OTHER)
      5. Importance level (HIGH, MEDIUM, LOW)
      6. Confidence score (0-1)
      7. If action is REPLY, provide a suggested response

      Provide your response in this exact format:
      Label: [one of the available labels]
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
} 