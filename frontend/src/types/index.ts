export type FileType = 'pdf' | 'docx' | 'pptx';
export type DocumentStatus = 'uploaded' | 'processing' | 'pending' | 'approved' | 'rejected' | 'failed';
export type DocumentVisibility = 'subject-wide' | 'class-restricted';
export type UserRole = 'admin' | 'teacher' | 'student';

export interface IUser {
  id: string;
  _id?: string;
  username: string;
  role: UserRole;
  fullName: string;
  email: string;
  userCode: string;
  isActive: boolean;
  deactivatedAt?: string;
}

export interface ISubject {
  _id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface ICourseClass {
  _id: string;
  code: string;
  name: string;
  subjectId: string | ISubject;
  teacherId?: string | Pick<IUser, 'id' | '_id' | 'username' | 'fullName' | 'userCode'>;
  status: 'draft' | 'active' | 'archived';
  allowSelfEnrollment: boolean;
  joinCode?: string;
  enrolled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IClassEnrollment {
  _id: string;
  classId: string;
  studentId: IUser;
  source: 'admin' | 'self';
  status: 'active' | 'removed';
  joinedAt: string;
  removedAt?: string;
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
  visibility: DocumentVisibility;
  classIds: Array<string | Pick<ICourseClass, '_id' | 'code' | 'name' | 'status'>>;
  chapter: number;
  chapterTitle: string;
  status: DocumentStatus;
  errorMessage?: string;
  totalChunks: number;
  totalPages?: number;
  uploadedBy?: string | Pick<IUser, 'id' | '_id' | 'username' | 'fullName' | 'userCode'>;
  uploadedAt: string;
  processedAt?: string;
  indexedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
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
  status: 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string | null;
  paymentMethod: string;
  paymentReference?: string;
  createdAt: string;
}

export interface IQuotaStatus {
  allowed: boolean;
  used: number;
  limit: number;
  planName: string;
  remaining: number;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
}
