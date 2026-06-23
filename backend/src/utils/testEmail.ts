import { EmailService } from '../services/emailService.js';

const recipient = process.argv[2];
const sendAll = process.argv.includes('--all');

if (!recipient) {
  console.error('Usage: npm run email:test -- recipient@example.com [--all]');
  process.exit(1);
}

const emailService = new EmailService();
const run = async (): Promise<void> => {
  if (!(await emailService.verifyConnection())) process.exit(1);
  if (!sendAll) {
    if (!(await emailService.sendTest(recipient))) process.exit(1);
    return;
  }
  const contact = { email: recipient, fullName: 'Nguyễn Văn Test' };
  const results: boolean[] = [];
  results.push(await emailService.sendAccountCreated({ ...contact, username: 'test_user', role: 'student' }, 'Temporary@123'));
  results.push(await emailService.sendPasswordReset({ ...contact, username: 'test_user' }, 'Reset@123'));
  results.push(await emailService.sendTeacherSubjectAssignment(contact, { subjectCode: 'SWD392', subjectName: 'Software Architecture and Design', assigned: true }));
  results.push(await emailService.sendTeacherSubjectAssignment(contact, { subjectCode: 'SWD392', subjectName: 'Software Architecture and Design', assigned: false }));
  console.log(`Email templates sent: ${results.filter(Boolean).length}/${results.length}`);
  if (results.some((sent) => !sent)) process.exit(1);
};

void run();
