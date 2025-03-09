import { EmailService } from './emailService';

// Create a singleton instance
export const emailService = new EmailService(process.env.GEMINI_API_KEY || '');

// Export the singleton instance
export default emailService; 