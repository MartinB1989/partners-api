export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}
