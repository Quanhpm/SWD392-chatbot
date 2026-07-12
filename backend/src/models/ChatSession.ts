import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface ICitation {
  subjectId?: Types.ObjectId;
  documentId: Types.ObjectId;
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
  role: 'user' | 'assistant';
  content: string;
  citations?: ICitation[];
  createdAt: Date;
}

export interface IChatSession {
  title: string;
  subjectId: Types.ObjectId;  // subject that owns the selected document
  documentId: Types.ObjectId; // document this chat is scoped to
  userId: Types.ObjectId;     // owner of this chat session
  messages: IChatMessage[];
  archivedMessagesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatSessionDocument = HydratedDocument<IChatSession>;

const citationSchema = new Schema<ICitation>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    fileName: { type: String, required: true },
    subject: { type: String, required: true },
    chapter: { type: Number, required: true },
    chapterTitle: { type: String, required: true },
    pageNumbers: [{ type: Number }],
    chunkIndex: { type: Number, required: true },
    similarityScore: { type: Number, required: true },
    snippetPreview: { type: String, required: true },
  },
  { _id: false },
);

const chatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, required: true, enum: ['user', 'assistant'] },
    content: { type: String, required: true },
    citations: [citationSchema],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const chatSessionSchema = new Schema<IChatSession>(
  {
    title: { type: String, required: true, default: 'New Research Chat' },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messages: [chatMessageSchema],
    archivedMessagesCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

chatSessionSchema.index({ updatedAt: -1 });
chatSessionSchema.index({ userId: 1, updatedAt: -1 });
chatSessionSchema.index({ userId: 1, documentId: 1, updatedAt: -1 });

export const ChatSessionModel = model<IChatSession>('ChatSession', chatSessionSchema);
