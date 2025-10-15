// src/email/interfaces/email.interface.ts
export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  context?: Record<string, any>;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}