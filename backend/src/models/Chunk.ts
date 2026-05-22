import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface IChunk {
  documentId: Types.ObjectId;
  content: string;
  chunkIndex: number;
  pageNumbers: number[];
  startChar: number;
  endChar: number;
  tokenCount: number;
  embedding: number[];
  metadata: {
    subject: string;
    chapter: number;
    chapterTitle: string;
    fileName: string;
  };
  createdAt: Date;
}

export type ChunkDocument = HydratedDocument<IChunk>;

const chunkSchema = new Schema<IChunk>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    content: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    pageNumbers: [{ type: Number }],
    startChar: { type: Number, required: true },
    endChar: { type: Number, required: true },
    tokenCount: { type: Number, required: true },
    embedding: [{ type: Number, required: true }],
    metadata: {
      subject: { type: String, required: true },
      chapter: { type: Number, required: true },
      chapterTitle: { type: String, required: true },
      fileName: { type: String, required: true },
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  },
);

chunkSchema.index({ documentId: 1, chunkIndex: 1 });

export const ChunkModel = model<IChunk>('Chunk', chunkSchema);
