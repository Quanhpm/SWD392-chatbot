import nodemailer, { type Transporter } from 'nodemailer';

import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import {
  accountCreatedEmail,
  documentReviewedEmail,
  passwordResetEmail,
  studentEnrolledEmail,
  teacherAssignedEmail,
  testEmail,
} from './emailTemplates.js';

type Recipient = { email: string; fullName: string };
type EmailContent = { subject: string; text: string; html: string };

const roleLabels = { admin: 'Quản trị viên', teacher: 'Giảng viên', student: 'Sinh viên' } as const;
const maskEmail = (email: string): string => {
  const [local = '', domain = ''] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
};

export class EmailService {
  private readonly transporter: Transporter | null;

  constructor() {
    this.transporter = env.emailEnabled
      ? nodemailer.createTransport({
          host: env.smtpHost,
          port: env.smtpPort,
          secure: env.smtpSecure,
          auth: { user: env.smtpUser!, pass: env.smtpPass! },
          connectionTimeout: env.smtpConnectionTimeoutMs,
          greetingTimeout: env.smtpConnectionTimeoutMs,
          socketTimeout: env.smtpConnectionTimeoutMs * 2,
        })
      : null;
  }

  isEnabled(): boolean {
    return Boolean(this.transporter);
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email is disabled. Set EMAIL_ENABLED=true to verify SMTP.');
      return false;
    }
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully.');
      return true;
    } catch (error) {
      logger.error(`SMTP verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async sendAccountCreated(recipient: Recipient & { username: string; role: keyof typeof roleLabels }, password: string): Promise<boolean> {
    return this.send(recipient, accountCreatedEmail({
      ...recipient,
      password,
      roleLabel: roleLabels[recipient.role],
      loginUrl: `${env.frontendUrl}/login`,
    }), 'account-created');
  }

  async sendPasswordReset(recipient: Recipient & { username: string }, password: string): Promise<boolean> {
    return this.send(recipient, passwordResetEmail({
      ...recipient,
      password,
      loginUrl: `${env.frontendUrl}/login`,
    }), 'password-reset');
  }

  async sendTeacherAssigned(recipient: Recipient, details: {
    classCode: string; className: string; subjectCode: string; subjectName: string;
  }): Promise<boolean> {
    return this.send(recipient, teacherAssignedEmail({
      ...recipient,
      ...details,
      dashboardUrl: `${env.frontendUrl}/dashboard`,
    }), 'teacher-assigned');
  }

  async sendStudentEnrolled(recipient: Recipient, details: {
    classCode: string; className: string; subjectCode: string; subjectName: string;
  }): Promise<boolean> {
    return this.send(recipient, studentEnrolledEmail({
      ...recipient,
      ...details,
      portalUrl: `${env.frontendUrl}/portal`,
    }), 'student-enrolled');
  }

  async sendDocumentReviewed(recipient: Recipient, details: {
    documentName: string; subjectName: string; chapter: number; chapterTitle: string;
    approved: boolean; reason?: string;
  }): Promise<boolean> {
    return this.send(recipient, documentReviewedEmail({
      ...recipient,
      ...details,
      documentsUrl: `${env.frontendUrl}/documents`,
    }), details.approved ? 'document-approved' : 'document-rejected');
  }

  async sendTest(recipientEmail: string): Promise<boolean> {
    return this.send({ email: recipientEmail, fullName: 'EduSmart Admin' }, testEmail(env.frontendUrl), 'smtp-test');
  }

  private async send(recipient: Recipient, content: EmailContent, event: string): Promise<boolean> {
    if (!this.transporter || !env.emailFromAddress) {
      logger.info(`Email skipped (${event}): EMAIL_ENABLED=false.`);
      return false;
    }
    try {
      const info = await this.transporter.sendMail({
        from: { name: env.emailFromName, address: env.emailFromAddress },
        to: { name: recipient.fullName, address: recipient.email },
        subject: content.subject.replace(/[\r\n]+/g, ' '),
        text: content.text,
        html: content.html,
      });
      logger.info(`Email sent (${event}) to ${maskEmail(recipient.email)}; messageId=${info.messageId}`);
      return true;
    } catch (error) {
      logger.error(`Email failed (${event}) for ${maskEmail(recipient.email)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}
