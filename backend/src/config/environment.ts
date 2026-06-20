import dotenv from 'dotenv';

dotenv.config();

export interface Environment {
  geminiApiKey: string;
  embeddingModel: string;
  chatModel: string;
  mongodbUri: string;
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  similarityThreshold: number;
  maxFileSize: number;
  uploadDir: string;
  // Auth
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptSaltRounds: number;
  redisUrl?: string;
  adminUsername?: string;
  adminPassword?: string;
  adminEmail?: string;
  adminFullName?: string;
  adminUserCode?: string;
  // Transactional email (SMTP / Gmail)
  emailEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser?: string;
  smtpPass?: string;
  emailFromName: string;
  emailFromAddress?: string;
}

const readString = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const readNumber = (name: string, fallback: number): number => {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  return value;
};

const readBoolean = (name: string, fallback: boolean): boolean => {
  const rawValue = process.env[name];
  if (!rawValue) return fallback;
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;
  throw new Error(`Environment variable ${name} must be true or false`);
};

const emailEnabled = readBoolean('EMAIL_ENABLED', false);
const smtpUser = process.env.SMTP_USER?.trim() || undefined;
const smtpPass = process.env.SMTP_PASS?.replace(/\s+/g, '') || undefined;
if (emailEnabled && (!smtpUser || !smtpPass)) {
  throw new Error('SMTP_USER and SMTP_PASS are required when EMAIL_ENABLED=true');
}

export const env: Environment = {
  geminiApiKey: readString('GEMINI_API_KEY'),
  embeddingModel: readString('GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001'),
  chatModel: readString('GEMINI_CHAT_MODEL', 'gemini-2.5-flash'),
  mongodbUri: readString('MONGODB_URI', 'mongodb://localhost:27017/se1939-rag-chatbot'),
  port: readNumber('PORT', 3001),
  nodeEnv: readString('NODE_ENV', 'development'),
  frontendUrl: readString('FRONTEND_URL', 'http://localhost:5173'),
  chunkSize: readNumber('CHUNK_SIZE', 800),
  chunkOverlap: readNumber('CHUNK_OVERLAP', 200),
  topK: readNumber('TOP_K', 5),
  similarityThreshold: readNumber('SIMILARITY_THRESHOLD', 0.6),
  maxFileSize: readNumber('MAX_FILE_SIZE', 52_428_800),
  uploadDir: readString('UPLOAD_DIR', './uploads'),
  // Auth
  jwtSecret: readString('JWT_SECRET', 'changeme-super-secret-jwt-key-min-32-chars-long'),
  jwtExpiresIn: readString('JWT_EXPIRES_IN', '7d'),
  bcryptSaltRounds: readNumber('BCRYPT_SALT_ROUNDS', 10),
  redisUrl: process.env.REDIS_URL || undefined,
  adminUsername: process.env.ADMIN_USERNAME?.trim() || undefined,
  adminPassword: process.env.ADMIN_PASSWORD || undefined,
  adminEmail: process.env.ADMIN_EMAIL?.trim() || undefined,
  adminFullName: process.env.ADMIN_FULL_NAME?.trim() || undefined,
  adminUserCode: process.env.ADMIN_USER_CODE?.trim() || undefined,
  emailEnabled,
  smtpHost: readString('SMTP_HOST', 'smtp.gmail.com'),
  smtpPort: readNumber('SMTP_PORT', 465),
  smtpSecure: readBoolean('SMTP_SECURE', true),
  smtpUser,
  smtpPass,
  emailFromName: readString('EMAIL_FROM_NAME', 'EduSmart'),
  emailFromAddress: process.env.EMAIL_FROM_ADDRESS?.trim() || smtpUser,
};
