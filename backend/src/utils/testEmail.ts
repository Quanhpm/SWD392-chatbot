import { env } from '../config/environment.js';
import { emailService } from '../config/dependencies.js';
import { logger } from './logger.js';

const recipient = process.argv[2]?.trim() || env.smtpUser;

if (!recipient) {
  logger.error('Recipient is required. Usage: npm run email:test -- recipient@example.com');
  process.exitCode = 1;
} else {
  const connected = await emailService.verifyConnection();
  const sent = connected && await emailService.sendTest(recipient);
  if (!sent) {
    process.exitCode = 1;
  } else {
    logger.info(`Test email delivered to ${recipient}.`);
  }
}
