import { env } from '../config/environment.js';
import { UserModel } from '../models/User.js';
import { logger } from './logger.js';

export async function seedInitialAdmin(): Promise<void> {
  if (!env.adminUsername || !env.adminPassword || !env.adminEmail) {
    logger.warn('Initial admin was not seeded. Configure ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_EMAIL.');
    return;
  }

  const existingAdmin = await UserModel.findOne({ role: 'admin' }).lean().exec();
  if (existingAdmin) return;

  await UserModel.create({
    username: env.adminUsername,
    password: env.adminPassword,
    role: 'admin',
    fullName: env.adminFullName ?? 'System Administrator',
    email: env.adminEmail.toLowerCase(),
    userCode: (env.adminUserCode ?? 'ADMIN001').toUpperCase(),
    isActive: true,
  });
  logger.info(`Initial admin seeded: ${env.adminUsername}`);
}
