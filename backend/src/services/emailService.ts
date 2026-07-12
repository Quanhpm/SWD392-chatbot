import nodemailer, { type Transporter } from 'nodemailer';

import { env } from '../config/environment.js';
import { AppError } from '../middleware/errorHandler.js';
import { EmailNotificationModel, type EmailNotificationDocument, type IEmailNotification } from '../models/EmailNotification.js';
import { logger } from '../utils/logger.js';
import {
  accountCreatedEmail,
  passwordResetEmail,
  passwordResetCodeEmail,
  teacherSubjectAssignmentEmail,
  testEmail,
} from './emailTemplates.js';

type Recipient = { email: string; fullName: string };
type EmailContent = { subject: string; text: string; html: string };

const roleLabels = { admin: 'Quản trị viên', teacher: 'Giảng viên', student: 'Sinh viên' } as const;
const MAX_ATTEMPTS = 3;
const maskEmail = (email: string): string => {
  const [local = '', domain = ''] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
};

const backoffDelayMs = (attempts: number): number =>
  Math.min(60 * 60_000, 60_000 * (2 ** Math.max(0, attempts - 1)));

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

  async sendPasswordResetCode(recipient: Recipient, code: string, expiresInMinutes: number): Promise<boolean> {
    return this.send(recipient, passwordResetCodeEmail({ ...recipient, code, expiresInMinutes }), 'password-reset-code');
  }

  async sendTeacherSubjectAssignment(recipient: Recipient, details: {
    subjectCode: string; subjectName: string; assigned: boolean;
  }): Promise<boolean> {
    return this.send(recipient, teacherSubjectAssignmentEmail({
      ...recipient,
      ...details,
      dashboardUrl: `${env.frontendUrl}/dashboard`,
    }), details.assigned ? 'teacher-subject-assigned' : 'teacher-subject-removed');
  }

  async sendTest(recipientEmail: string): Promise<boolean> {
    return this.send({ email: recipientEmail, fullName: 'EduSmart Admin' }, testEmail(env.frontendUrl), 'smtp-test');
  }

  private async send(recipient: Recipient, content: EmailContent, event: string): Promise<boolean> {
    const notification = await EmailNotificationModel.create({
      event,
      recipientEmail: recipient.email.toLowerCase(),
      recipientName: recipient.fullName,
      subject: content.subject.replace(/[\r\n]+/g, ' '),
      text: content.text,
      html: content.html,
      status: 'queued',
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      nextAttemptAt: new Date(),
    });

    return this.dispatchNotification(notification);
  }

  async retryPendingNotifications(limit = 20): Promise<number> {
    const notifications = await EmailNotificationModel.find({
      status: { $in: ['queued', 'failed'] },
      attempts: { $lt: MAX_ATTEMPTS },
      nextAttemptAt: { $lte: new Date() },
    })
      .sort({ createdAt: 1 })
      .limit(Math.min(Math.max(limit, 1), 50))
      .exec();

    let sent = 0;
    for (const notification of notifications) {
      if (await this.dispatchNotification(notification)) sent += 1;
    }
    return sent;
  }

  async retryNotification(id: string): Promise<IEmailNotification> {
    const notification = await EmailNotificationModel.findById(id).exec();
    if (!notification) throw new AppError('Email notification not found.', 404);
    notification.status = 'queued';
    notification.nextAttemptAt = new Date();
    notification.lastError = undefined;
    await notification.save();
    await this.dispatchNotification(notification);
    return notification.toObject();
  }

  private async dispatchNotification(notification: EmailNotificationDocument): Promise<boolean> {
    if (!this.transporter || !env.emailFromAddress) {
      notification.status = 'failed';
      notification.attempts += 1;
      notification.lastError = 'Email is disabled. Set EMAIL_ENABLED=true and SMTP credentials.';
      notification.nextAttemptAt = new Date(Date.now() + backoffDelayMs(notification.attempts));
      await notification.save();
      logger.info(`Email skipped (${notification.event}): EMAIL_ENABLED=false.`);
      return false;
    }
    try {
      const info = await this.transporter.sendMail({
        from: { name: env.emailFromName, address: env.emailFromAddress },
        to: { name: notification.recipientName, address: notification.recipientEmail },
        subject: notification.subject,
        text: notification.text,
        html: notification.html,
      });
      notification.status = 'sent';
      notification.attempts += 1;
      notification.messageId = info.messageId;
      notification.sentAt = new Date();
      notification.lastError = undefined;
      notification.nextAttemptAt = undefined;
      await notification.save();
      logger.info(`Email sent (${notification.event}) to ${maskEmail(notification.recipientEmail)}; messageId=${info.messageId}`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email error';
      notification.status = 'failed';
      notification.attempts += 1;
      notification.lastError = message;
      notification.nextAttemptAt = notification.attempts < notification.maxAttempts
        ? new Date(Date.now() + backoffDelayMs(notification.attempts))
        : undefined;
      await notification.save();
      logger.error(`Email failed (${notification.event}) for ${maskEmail(notification.recipientEmail)}: ${message}`);
      return false;
    }
  }
}
