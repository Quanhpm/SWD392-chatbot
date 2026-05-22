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
  allowGeneralQuestions: boolean;
  maxFileSize: number;
  uploadDir: string;
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
  if (!rawValue) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(rawValue.toLowerCase());
};

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
  allowGeneralQuestions: readBoolean('ALLOW_GENERAL_QUESTIONS', true),
  maxFileSize: readNumber('MAX_FILE_SIZE', 52_428_800),
  uploadDir: readString('UPLOAD_DIR', './uploads'),
};
