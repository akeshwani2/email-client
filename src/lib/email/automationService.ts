import { Automation, AutomationType, Email, Label } from '@/types/email';
import { EmailService } from './emailService';

export class AutomationService {
  private automations: Automation[] = [];
  private emailService: EmailService;

  constructor(emailService: EmailService) {
    this.emailService = emailService;
  }

  addAutomation(automation: Automation): void {
    this.automations.push(automation);
  }

  removeAutomation(id: string): void {
    this.automations = this.automations.filter(a => a.id !== id);
  }

  updateAutomation(automation: Automation): void {
    const index = this.automations.findIndex(a => a.id === automation.id);
    if (index !== -1) {
      this.automations[index] = automation;
    }
  }

  async processEmail(email: Email, availableLabels: Label[]): Promise<void> {
    for (const automation of this.automations) {
      if (!automation.enabled) continue;

      // Check if all conditions match
      const matches = automation.conditions.every(condition => {
        const value = email[condition.field as keyof Email];
        
        switch (condition.operator) {
          case 'contains':
            return typeof value === 'string' && value.toLowerCase().includes(condition.value.toLowerCase());
          case 'equals':
            return value === condition.value;
          case 'matches':
            return new RegExp(condition.value, 'i').test(String(value));
          default:
            return false;
        }
      });

      if (matches) {
        // Execute all actions
        for (const action of automation.actions) {
          try {
            switch (action.type) {
              case AutomationType.LABEL:
                if (action.config.labelId) {
                  const label = availableLabels.find(l => l.id === action.config.labelId);
                  if (label) {
                    await this.emailService.applyLabel(email.id, label);
                  }
                }
                break;

              case AutomationType.FORWARD:
                if (action.config.forwardTo?.length) {
                  await this.emailService.forwardEmail(email.id, action.config.forwardTo);
                }
                break;

              case AutomationType.ARCHIVE:
                await this.emailService.archiveEmail(email.id);
                break;

              case AutomationType.DELETE:
                await this.emailService.deleteEmail(email.id);
                break;

              case AutomationType.REPLY:
                if (action.config.replyTemplate) {
                  await this.emailService.replyToEmail(email.id, action.config.replyTemplate);
                }
                break;
            }
          } catch (error) {
            console.error(`Failed to execute automation action ${action.type}:`, error);
          }
        }
      }
    }
  }

  getAutomations(): Automation[] {
    return [...this.automations];
  }
} 