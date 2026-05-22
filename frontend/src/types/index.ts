export type FileType = 'pdf' | 'docx' | 'pptx';
export type DocumentStatus = 'uploaded' | 'processing' | 'indexed' | 'failed';

export interface IDocument {
  _id: string;
  fileName: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  mimeType: string;
  subject: string;
  chapter: number;
  chapterTitle: string;
  status: DocumentStatus;
  errorMessage?: string;
  totalChunks: number;
  totalPages?: number;
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
