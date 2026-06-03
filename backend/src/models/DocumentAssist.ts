import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface ITakeaway {
  concept: string;
  desc: string;
  icon: string;
  color: string;
}

export interface IFlashcard {
  question: string;
  answer: string;
}

export interface IDocumentAssist {
  documentId: Types.ObjectId;
  takeaways: ITakeaway[];
  flashcards: IFlashcard[];
  createdAt: Date;
}

export type DocumentAssistDocument = HydratedDocument<IDocumentAssist>;

const documentAssistSchema = new Schema<IDocumentAssist>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      unique: true,
    },
    takeaways: [
      {
        concept: { type: String, required: true },
        desc: { type: String, required: true },
        icon: { type: String, required: true },
        color: { type: String, required: true },
      },
    ],
    flashcards: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

export const DocumentAssistModel = model<IDocumentAssist>('DocumentAssist', documentAssistSchema);
