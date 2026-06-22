import { env } from '../config/environment.js';
import { EmailService } from '../services/emailService.js';
import { logger } from './logger.js';

const args = process.argv.slice(2);
const sendAllTemplates = args.includes('--all');
const recipient = args.find((value) => !value.startsWith('--'))?.trim() || env.smtpUser;
const emailService = new EmailService();

if (!recipient) {
  logger.error('Recipient is required. Usage: npm run email:test -- recipient@example.com [--all]');
  process.exitCode = 1;
} else {
  const connected = await emailService.verifyConnection();
  const commonRecipient = { email: recipient, fullName: 'Nguyễn Văn Test' };
  const results = connected && sendAllTemplates
    ? await Promise.all([
        emailService.sendAccountCreated({ ...commonRecipient, username: 'student_test', role: 'student' }, 'Temporary@123'),
        emailService.sendPasswordReset({ ...commonRecipient, username: 'student_test' }, 'NewPassword@123'),
        emailService.sendTeacherAssigned(commonRecipient, {
          classCode: 'SE1939-01', className: 'Software Modeling 01', subjectCode: 'SE1939', subjectName: 'Software Modeling',
        }),
        emailService.sendStudentEnrolled(commonRecipient, {
          classCode: 'SE1939-01', className: 'Software Modeling 01', subjectCode: 'SE1939', subjectName: 'Software Modeling',
        }),
        emailService.sendDocumentReviewed(commonRecipient, {
          documentName: 'Chapter 1.pdf', subjectName: 'Software Modeling', chapter: 1, chapterTitle: 'Unified Process', approved: true,
        }),
        emailService.sendDocumentReviewed(commonRecipient, {
          documentName: 'Chapter 2.pdf', subjectName: 'Software Modeling', chapter: 2, chapterTitle: 'Use Case', approved: false,
          reason: 'Cần bổ sung nguồn trích dẫn.',
        }),
      ])
    : [connected && await emailService.sendTest(recipient)];
  if (!connected || results.some((sent) => !sent)) {
    process.exitCode = 1;
  } else {
    logger.info(`${results.length} test email(s) delivered successfully.`);
  }
}
