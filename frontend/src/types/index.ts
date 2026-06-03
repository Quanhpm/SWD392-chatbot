export type FileType = 'pdf' | 'docx' | 'pptx';
export type DocumentStatus = 'uploaded' | 'processing' | 'indexed' | 'failed';
export type UserRole = 'teacher' | 'student';

export interface IUser {
  id: string;
  username: string;
  role: UserRole;
  enrolledSubjects: string[];
}

export interface ISubject {
  _id: string;
  name: string;
  description?: string;
  teacherId?: string;
  createdAt: string;
}

export interface IDocument {
  _id: string;
  fileName: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  mimeType: string;
  subjectId?: string;
  subject: string;
  chapter: number;
  chapterTitle: string;
  status: DocumentStatus;
  errorMessage?: string;
  totalChunks: number;
  totalPages?: number;
  uploadedBy?: string;
  uploadedAt: string;
  processedAt?: string;
  indexedAt?: string;
}

export interface ICitation {
  documentId: string;
  fileName: string;
  subject: string;
  chapter: number;
  chapterTitle: string;
  pageNumbers: number[];
  chunkIndex: number;
  similarityScore: number;
  snippetPreview: string;
}

export interface IChatMessage {
  _id?: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: ICitation[];
  createdAt: string;
}

export interface IChatSession {
  _id: string;
  title: string;
  subjectId?: string;
  documentId?: string;
  userId?: string;
  messages: IChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatResponse {
  content: string;
  citations: ICitation[];
}

export interface TestQuestion {
  id: number;
  question: string;
  groundTruthAnswer: string;
  sourceDocument: string;
  chapter: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'factual' | 'conceptual' | 'comparison' | 'application';
  expectedKeywords: string[];
}

export interface TestSet {
  courseTitle: string;
  description: string;
  totalQuestions: number;
  questions: TestQuestion[];
}

export interface IChunk {
  _id?: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  pageNumbers: number[];
}

// ── Subscription & Quota ──

export interface ISubscriptionPlan {
  _id: string;
  name: 'free' | 'plus' | 'pro';
  displayName: string;
  price: number;
  questionLimit: number;
  durationDays: number | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

export interface IUserSubscription {
  _id: string;
  userId: string;
  planName: 'free' | 'plus' | 'pro';
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string | null;
  paymentMethod: string;
  paymentReference?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface IQuotaStatus {
  allowed: boolean;
  used: number;
  limit: number;
  planName: string;
  remaining: number;
}

export interface IQuotaUsage {
  _id: string;
  userId: string;
  documentId: {
    _id: string;
    originalName: string;
    subject: string;
    chapter: number;
    chapterTitle: string;
  };
  questionCount: number;
  periodStart: string;
  periodEnd: string | null;
  lastQuestionAt: string;
}
