import { CourseClassModel } from '../models/CourseClass.js';
import { UserModel, type IUser } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import type { UserRole } from '../types/index.js';
import type { EmailService } from './emailService.js';

const publicFields = '-password';

export class AdminService {
  constructor(private readonly emailService: EmailService) {}

  async listUsers(filters: { role?: UserRole; active?: boolean; search?: string }): Promise<IUser[]> {
    const query: Record<string, unknown> = {};
    if (filters.role) query.role = filters.role;
    if (filters.active !== undefined) query.isActive = filters.active;
    if (filters.search) {
      const pattern = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { username: { $regex: pattern, $options: 'i' } },
        { fullName: { $regex: pattern, $options: 'i' } },
        { email: { $regex: pattern, $options: 'i' } },
        { userCode: { $regex: pattern, $options: 'i' } },
      ];
    }
    return UserModel.find(query).select(publicFields).sort({ createdAt: -1 }).lean().exec();
  }

  async createUser(input: {
    username: string;
    password: string;
    role: UserRole;
    fullName: string;
    email: string;
    userCode: string;
  }): Promise<IUser> {
    const duplicate = await UserModel.findOne({
      $or: [
        { username: input.username.trim() },
        { email: input.email.trim().toLowerCase() },
        { userCode: input.userCode.trim().toUpperCase() },
      ],
    }).lean().exec();
    if (duplicate) throw new AppError('Username, email, or user code already exists.', 409);

    const user = await UserModel.create({
      ...input,
      username: input.username.trim(),
      email: input.email.trim().toLowerCase(),
      userCode: input.userCode.trim().toUpperCase(),
      fullName: input.fullName.trim(),
      isActive: true,
    });
    await this.emailService.sendAccountCreated({
      email: user.email,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
    }, input.password);
    const value = user.toObject();
    delete (value as Partial<IUser>).password;
    return value;
  }

  async updateUser(id: string, input: { fullName?: string; email?: string; userCode?: string }): Promise<IUser> {
    const user = await UserModel.findById(id).exec();
    if (!user) throw new AppError('User not found.', 404);

    if (input.email && input.email.toLowerCase() !== user.email) {
      if (await UserModel.exists({ email: input.email.toLowerCase(), _id: { $ne: id } })) {
        throw new AppError('Email already exists.', 409);
      }
      user.email = input.email.toLowerCase();
    }
    if (input.userCode && input.userCode.toUpperCase() !== user.userCode) {
      if (await UserModel.exists({ userCode: input.userCode.toUpperCase(), _id: { $ne: id } })) {
        throw new AppError('User code already exists.', 409);
      }
      user.userCode = input.userCode.toUpperCase();
    }
    if (input.fullName) user.fullName = input.fullName.trim();
    await user.save();
    const value = user.toObject();
    delete (value as Partial<IUser>).password;
    return value;
  }

  async resetPassword(id: string, password: string): Promise<void> {
    const user = await UserModel.findById(id).exec();
    if (!user) throw new AppError('User not found.', 404);
    user.password = password;
    await user.save();
    await this.emailService.sendPasswordReset({
      email: user.email,
      fullName: user.fullName,
      username: user.username,
    }, password);
  }

  async deactivateUser(id: string, actorId: string): Promise<void> {
    if (id === actorId) throw new AppError('You cannot deactivate your own account.', 400);
    const user = await UserModel.findById(id).exec();
    if (!user) throw new AppError('User not found.', 404);
    if (!user.isActive) return;

    if (user.role === 'admin') {
      const activeAdmins = await UserModel.countDocuments({ role: 'admin', isActive: true }).exec();
      if (activeAdmins <= 1) throw new AppError('The last active admin cannot be deactivated.', 409);
    }
    if (user.role === 'teacher' && await CourseClassModel.exists({ teacherId: user._id, status: 'active' })) {
      throw new AppError('Reassign this teacher\'s active classes before deactivation.', 409);
    }

    user.isActive = false;
    user.deactivatedAt = new Date();
    await user.save();
  }

  async activateUser(id: string): Promise<void> {
    const result = await UserModel.updateOne(
      { _id: id },
      { $set: { isActive: true }, $unset: { deactivatedAt: 1 } },
    );
    if (result.matchedCount === 0) throw new AppError('User not found.', 404);
  }
}
