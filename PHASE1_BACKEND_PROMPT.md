# Phase 1: Backend Security & Authentication — Complete Implementation Prompt

> **Target AI**: Claude Sonnet — paste this entire document as your prompt.
> **Scope**: Backend only. Do NOT touch any frontend code in this phase.
> **Architecture**: Hexagonal Architecture (Ports & Adapters) — strictly follow existing patterns.

---

## 0. CRITICAL CONTEXT — Read Before Coding

### 0.1 Existing Architecture Summary

This project is an **existing, working** RAG Chatbot backend built with Express + TypeScript + Mongoose. It follows **Hexagonal Architecture**:

| Layer | Location | Pattern |
|-------|----------|---------|
| **Ports** (interfaces) | `src/ports/` | `ILLMPort.ts`, `IEmbeddingPort.ts`, `IParserPort.ts` |
| **Adapters** (implementations) | `src/adapters/` | `GeminiChatAdapter.ts`, `GeminiEmbeddingAdapter.ts`, `ParserAdapter.ts` |
| **Domain Services** (core logic) | `src/services/` | Class-based: `ChatService`, `DocumentService`. **Exception**: `subjectService.ts` uses standalone functions (NOT a class) |
| **Composition Root** (DI wiring) | `src/config/dependencies.ts` | Instantiates adapters → injects into service constructors |
| **Driving Adapters** (HTTP) | `src/routes/` | Express route files — thin handlers that call services |
| **Models** | `src/models/` | `Document.ts`, `Chunk.ts`, `ChatSession.ts`, `Subject.ts` |

### 0.2 Existing LLM/Embedding Provider

The project uses **Gemini API** (NOT OpenAI). The adapters `GeminiChatAdapter.ts` and `GeminiEmbeddingAdapter.ts` are already working. **Do NOT modify any adapter or port files.** Do NOT change the LLM or embedding provider.

### 0.3 Project Configuration

- **Module system**: ESM (`"type": "module"` in package.json) — all imports use `.js` extension
- **TypeScript**: Strict mode, target ES2022, module NodeNext
- **Dev runner**: `tsx watch`
- **Response format**: Always `{ success: true, ... }` or `{ success: false, error: string }`

### 0.4 Key Data Relationship (Current)

- `Document.subject` stores a **string** (e.g., `"Software Modeling and Design"`) — NOT an ObjectId
- `Chunk.metadata.subject` also stores the **same string** value
- `Subject` model has `name: string (unique)` — this name is what Document/Chunk reference
- This string-based linking is intentional and must be preserved

---

## 1. NEW DEPENDENCIES — Install First

Run this command before coding:

```bash
cd backend
npm install bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken
```

These are the ONLY new dependencies needed. Do NOT install any other packages.

---

## 2. ENVIRONMENT CONFIGURATION UPDATES

### 2.1 Update `backend/src/config/environment.ts`

Add these 3 new fields to the `Environment` interface and the `env` object:

```typescript
// Add to Environment interface:
jwtSecret: string;
jwtExpiresIn: string;
bcryptSaltRounds: number;

// Add to env object:
jwtSecret: readString('JWT_SECRET'),
jwtExpiresIn: readString('JWT_EXPIRES_IN', '7d'),
bcryptSaltRounds: readNumber('BCRYPT_SALT_ROUNDS', 10),
```

### 2.2 Update `backend/.env.example`

Add these lines under a new `# === Authentication ===` section:

```env
# === Authentication ===
JWT_SECRET=your-jwt-secret-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
```

### 2.3 Update `backend/.env`

Add the same 3 variables with actual values. Use a strong random string for `JWT_SECRET` (at least 32 characters).

---

## 3. TYPE DECLARATIONS

### 3.1 Create `backend/src/types/express.d.ts` [NEW FILE]

This augments Express `Request` to include the `user` property set by auth middleware:

```typescript
import type { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: 'teacher' | 'student';
        enrolledSubjects: Types.ObjectId[];
      };
    }
  }
}

export {};
```

### 3.2 Update `backend/src/types/index.ts`

Add the `UserRole` type at the top of the existing types:

```typescript
export type UserRole = 'teacher' | 'student';
```

Do NOT remove any existing types. Only add `UserRole`.

---

## 4. DATABASE SCHEMA — Models

### 4.1 Create `backend/src/models/User.ts` [NEW FILE]

```typescript
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
import bcrypt from 'bcryptjs';

import { env } from '../config/environment.js';

export interface IUser {
  username: string;
  password: string;
  role: 'teacher' | 'student';
  enrolledSubjects: Types.ObjectId[];
  createdAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      required: true,
      enum: ['teacher', 'student'],
    },
    enrolledSubjects: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  },
);

// Hash password before saving (only if password field is modified)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
    return;
  }
  this.password = await bcrypt.hash(this.password, env.bcryptSaltRounds);
  next();
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.index({ username: 1 });

export const UserModel = model<IUser>('User', userSchema);
```

### 4.2 Modify `backend/src/models/Subject.ts`

Add two new fields to the existing Subject model. Here is the **complete updated file**:

```typescript
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface ISubject {
  name: string;
  description?: string;
  password: string;        // NEW — bcrypt-hashed course entry password
  teacherId: Types.ObjectId; // NEW — references the teacher who created it
  createdAt: Date;
}

export type SubjectDocument = HydratedDocument<ISubject>;

const subjectSchema = new Schema<ISubject>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    password: { type: String, required: true },      // stores bcrypt hash
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  },
);

subjectSchema.index({ name: 1 });

export const SubjectModel = model<ISubject>('Subject', subjectSchema);
```

> **IMPORTANT**: The `password` field stores a **bcrypt hash**, never plaintext. Hashing is done in the service layer (AuthService or SubjectService) before calling `SubjectModel.create()`. Do NOT use a `pre('save')` hook on Subject for password hashing — do it explicitly in the service.

### 4.3 Modify `backend/src/models/ChatSession.ts`

Add two new fields: `subjectId` and `userId`. Here are the **changes only** (do NOT modify existing fields):

Add to the `IChatSession` interface:
```typescript
export interface IChatSession {
  title: string;
  subjectId: Types.ObjectId;  // NEW — which subject this chat is about
  userId: Types.ObjectId;     // NEW — who owns this chat session
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
```

Add to the `chatSessionSchema` (inside the `new Schema<IChatSession>({...})` definition, after `title`):
```typescript
subjectId: {
  type: Schema.Types.ObjectId,
  ref: 'Subject',
  required: true,
},
userId: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: true,
},
```

### 4.4 Modify `backend/src/models/Document.ts`

Add one new field: `uploadedBy`. Here are the **changes only**:

Add to `IDocument` interface:
```typescript
uploadedBy: Types.ObjectId;  // NEW — teacher who uploaded
```

Add to `documentSchema` (after `chapterTitle` field):
```typescript
uploadedBy: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: true,
},
```

Also add the import for `Types` at the top:
```typescript
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
```

---

## 5. AUTH MIDDLEWARE

### 5.1 Create `backend/src/middleware/auth.ts` [NEW FILE]

```typescript
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/environment.js';
import { UserModel } from '../models/User.js';
import type { UserRole } from '../types/index.js';

interface JwtPayload {
  id: string;
  username: string;
  role: UserRole;
}

/**
 * Extracts JWT from Authorization header (Bearer <token>),
 * verifies it, and attaches user data to req.user.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
      return;
    }

    const token = authHeader.slice(7); // Remove "Bearer "
    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;

    // Fetch fresh user data to get current enrolledSubjects
    const user = await UserModel.findById(decoded.id).select('username role enrolledSubjects').lean().exec();
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found. Token may be invalid.' });
      return;
    }

    req.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role as UserRole,
      enrolledSubjects: user.enrolledSubjects,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Invalid or expired token.' });
      return;
    }
    next(error);
  }
};

/**
 * Restricts access to specific roles.
 * Must be used AFTER requireAuth middleware.
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}.`,
      });
      return;
    }

    next();
  };
};
```

---

## 6. AUTH SERVICE

### 6.1 Create `backend/src/services/authService.ts` [NEW FILE]

This follows the existing class-based service pattern used by `ChatService` and `DocumentService`:

```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import { env } from '../config/environment.js';
import { UserModel, type IUser } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import type { UserRole } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface AuthResult {
  user: {
    id: string;
    username: string;
    role: UserRole;
    enrolledSubjects: string[];
  };
  token: string;
}

export class AuthService {
  /** Generates a JWT token for a user. */
  private generateToken(user: { _id: unknown; username: string; role: string }): string {
    return jwt.sign(
      {
        id: String(user._id),
        username: user.username,
        role: user.role,
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn },
    );
  }

  /** Registers a new user. */
  async register(username: string, password: string, role: UserRole): Promise<AuthResult> {
    // Check if username already exists
    const existing = await UserModel.findOne({ username: username.trim() }).lean().exec();
    if (existing) {
      throw new AppError('Username already exists.', 409);
    }

    // Validate role
    if (!['teacher', 'student'].includes(role)) {
      throw new AppError('Role must be "teacher" or "student".', 400);
    }

    // Create user (password is hashed by the pre-save hook in the User model)
    const user = await UserModel.create({
      username: username.trim(),
      password,
      role,
      enrolledSubjects: [],
    });

    const token = this.generateToken(user);

    logger.info(`User registered: ${user.username} (${user.role})`);

    return {
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role as UserRole,
        enrolledSubjects: [],
      },
      token,
    };
  }

  /** Authenticates a user and returns a JWT token. */
  async login(username: string, password: string): Promise<AuthResult> {
    const user = await UserModel.findOne({ username: username.trim() }).exec();
    if (!user) {
      throw new AppError('Invalid username or password.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid username or password.', 401);
    }

    const token = this.generateToken(user);

    logger.info(`User logged in: ${user.username} (${user.role})`);

    return {
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role as UserRole,
        enrolledSubjects: user.enrolledSubjects.map((id) => id.toString()),
      },
      token,
    };
  }
}
```

---

## 7. UPDATE EXISTING SERVICES

### 7.1 Modify `backend/src/services/subjectService.ts`

This file currently uses **standalone exported functions** (NOT a class). Keep this pattern but modify the functions. Here is the **complete replacement**:

```typescript
import bcrypt from 'bcryptjs';

import { env } from '../config/environment.js';
import { SubjectModel, type ISubject } from '../models/Subject.js';
import { UserModel } from '../models/User.js';
import { DocumentModel } from '../models/Document.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

/** Lists all subjects sorted by creation date. Returns subjects WITHOUT the password hash. */
export const listSubjects = async (): Promise<Omit<ISubject, 'password'>[]> => {
  return SubjectModel.find().select('-password').sort({ createdAt: 1 }).lean().exec();
};

/**
 * Creates a new subject (teacher-only operation).
 * Hashes the course entry password with bcrypt before saving.
 */
export const createSubject = async (
  name: string,
  description: string | undefined,
  password: string,
  teacherId: string,
): Promise<Omit<ISubject, 'password'>> => {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new AppError('Subject name is required.', 400);
  }

  if (!password || password.length < 4) {
    throw new AppError('Course password must be at least 4 characters.', 400);
  }

  const existing = await SubjectModel.findOne({ name: trimmed }).lean().exec();
  if (existing) {
    throw new AppError(`Subject "${trimmed}" already exists.`, 409);
  }

  // Hash the course entry password
  const hashedPassword = await bcrypt.hash(password, env.bcryptSaltRounds);

  const subject = await SubjectModel.create({
    name: trimmed,
    description: description?.trim(),
    password: hashedPassword,
    teacherId,
  });

  // Return without password hash
  const { password: _pw, ...subjectWithoutPassword } = subject.toObject();
  return subjectWithoutPassword as Omit<ISubject, 'password'>;
};

/**
 * Enrolls a student in a subject by verifying the course password.
 * Adds the subject ID to the student's enrolledSubjects array.
 */
export const enrollStudent = async (
  subjectId: string,
  studentId: string,
  coursePassword: string,
): Promise<void> => {
  const subject = await SubjectModel.findById(subjectId).exec();
  if (!subject) {
    throw new AppError('Subject not found.', 404);
  }

  // Check if already enrolled
  const student = await UserModel.findById(studentId).exec();
  if (!student) {
    throw new AppError('Student not found.', 404);
  }

  if (student.enrolledSubjects.some((id) => id.toString() === subjectId)) {
    throw new AppError('You are already enrolled in this subject.', 409);
  }

  // Verify course password against the bcrypt hash
  const isMatch = await bcrypt.compare(coursePassword, subject.password);
  if (!isMatch) {
    throw new AppError('Incorrect course password.', 403);
  }

  // Add subject to student's enrolledSubjects
  student.enrolledSubjects.push(subject._id);
  await student.save();

  logger.info(`Student "${student.username}" enrolled in "${subject.name}"`);
};

/** Deletes a subject by ID. Blocks deletion if documents still reference it. */
export const deleteSubject = async (id: string): Promise<void> => {
  const subject = await SubjectModel.findById(id).exec();
  if (!subject) {
    throw new AppError('Subject not found.', 404);
  }

  const docCount = await DocumentModel.countDocuments({ subject: subject.name }).exec();
  if (docCount > 0) {
    throw new AppError(
      `Cannot delete "${subject.name}" because ${docCount} document(s) still belong to it. Delete the documents first.`,
      409,
    );
  }

  await subject.deleteOne();
};

/**
 * REMOVED: seedDefaultSubject() — no longer needed because subjects now require
 * password and teacherId fields, which cannot be auto-seeded without a teacher user.
 * The old call in index.ts must also be removed.
 */
```

> **IMPORTANT**: `seedDefaultSubject()` is **REMOVED**. You must also remove the import and call to it from `src/index.ts`.

### 7.2 Modify `backend/src/services/retrievalService.ts`

Add a `subjectFilter` parameter to restrict chunk retrieval to a specific subject. This is a **MongoDB query-level filter** (NOT a post-retrieval filter), which is critical for cross-course security.

Here is the **complete replacement**:

```typescript
import { env } from '../config/environment.js';
import { ChunkModel } from '../models/Chunk.js';
import type { RetrievalResult, StoredChunk } from '../types/index.js';
import { cosineSimilarity } from '../utils/cosineSimilarity.js';

/**
 * Retrieves top matching chunks with MongoDB M0-compatible in-process cosine search.
 *
 * @param queryEmbedding - The embedding vector for the user's query
 * @param topK - Maximum number of results to return
 * @param similarityThreshold - Minimum cosine similarity score
 * @param subjectFilter - If provided, ONLY retrieves chunks where metadata.subject matches this value.
 *                        This prevents cross-course information leaks.
 */
export const retrieveRelevantChunks = async (
  queryEmbedding: number[],
  topK = env.topK,
  similarityThreshold = env.similarityThreshold,
  subjectFilter?: string,
): Promise<RetrievalResult[]> => {
  // Build MongoDB query — filter by subject if provided
  const query = subjectFilter
    ? { 'metadata.subject': subjectFilter }
    : {};

  const chunks = await ChunkModel.find(query).exec();

  return chunks
    .map((chunk) => ({
      chunk: chunk.toObject() as StoredChunk,
      similarityScore: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((result) => result.similarityScore >= similarityThreshold)
    .sort((first, second) => second.similarityScore - first.similarityScore)
    .slice(0, topK);
};
```

### 7.3 Modify `backend/src/services/chatService.ts`

Update to support `subjectId`, `userId`, and enrollment verification. Key changes:

1. `createChatSession()` now requires `subjectId` and `userId`
2. `generateChatResponse()` verifies enrollment and passes subject name to `retrieveRelevantChunks`
3. `listChatSessions()` filters by `userId`

Here is the **complete replacement**:

```typescript
import { env } from '../config/environment.js';
import { ChatSessionModel, type IChatMessage, type IChatSession } from '../models/ChatSession.js';
import { SubjectModel } from '../models/Subject.js';
import { UserModel } from '../models/User.js';
import type { ChatResponse, RetrievalResult } from '../types/index.js';
import { GENERAL_SYSTEM_PROMPT, REFUSAL_MESSAGE, SYSTEM_PROMPT } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { buildCitations } from './citationService.js';
import { retrieveRelevantChunks } from './retrievalService.js';
import type { IEmbeddingPort } from '../ports/IEmbeddingPort.js';
import type { ILLMPort } from '../ports/ILLMPort.js';

const buildContext = (retrievalResults: RetrievalResult[]): string =>
  retrievalResults
    .map((result, index) => {
      const pageLabel = result.chunk.pageNumbers.length > 0 ? result.chunk.pageNumbers.join(', ') : 'N/A';
      return `[Source ${index + 1}] ${result.chunk.metadata.fileName} — Chapter ${result.chunk.metadata.chapter}: ${result.chunk.metadata.chapterTitle} — Page ${pageLabel}
${result.chunk.content}`;
    })
    .join('\n===\n');

const titleFromMessage = (message: string): string => {
  const compact = message.replace(/\s+/g, ' ').trim();
  return compact.length > 50 ? `${compact.slice(0, 50)}...` : compact;
};

export class ChatService {
  constructor(
    private embeddingPort: IEmbeddingPort,
    private llmPort: ILLMPort,
  ) {}

  /**
   * Creates a chat session tied to a specific subject and user.
   * If the user is a student, verifies enrollment in the subject.
   */
  async createChatSession(
    title: string | undefined,
    subjectId: string,
    userId: string,
    userRole: 'teacher' | 'student',
    enrolledSubjects: string[],
  ): Promise<IChatSession> {
    // Verify subject exists
    const subject = await SubjectModel.findById(subjectId).lean().exec();
    if (!subject) {
      throw new AppError('Subject not found.', 404);
    }

    // If student, verify enrollment
    if (userRole === 'student') {
      const isEnrolled = enrolledSubjects.some((id) => id === subjectId);
      if (!isEnrolled) {
        throw new AppError('You are not enrolled in this subject. Please enroll first.', 403);
      }
    }

    return ChatSessionModel.create({
      title: title?.trim() || 'New Research Chat',
      subjectId,
      userId,
      messages: [],
    });
  }

  /** Lists chat sessions for a specific user (without message history). */
  async listChatSessions(userId: string): Promise<IChatSession[]> {
    return ChatSessionModel.find({ userId })
      .select('-messages')
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
  }

  /** Gets one chat session with messages. Verifies ownership. */
  async getChatSession(id: string, userId: string): Promise<IChatSession> {
    const session = await ChatSessionModel.findById(id).lean().exec();
    if (!session) {
      throw new AppError('Chat session not found', 404);
    }
    // Verify ownership
    if (session.userId.toString() !== userId) {
      throw new AppError('Access denied. This session does not belong to you.', 403);
    }
    return session;
  }

  /** Deletes one chat session. Verifies ownership. */
  async deleteChatSession(id: string, userId: string): Promise<void> {
    const session = await ChatSessionModel.findById(id).exec();
    if (!session) {
      throw new AppError('Chat session not found', 404);
    }
    if (session.userId.toString() !== userId) {
      throw new AppError('Access denied. This session does not belong to you.', 403);
    }
    await session.deleteOne();
  }

  /**
   * Orchestrates embedding, retrieval, chat completion, citation building, and persistence.
   *
   * SECURITY:
   * - Verifies student enrollment in the session's subject
   * - Passes subject name to retrieveRelevantChunks as a MongoDB filter
   *   to prevent cross-course information leaks
   */
  async generateChatResponse(
    sessionId: string,
    userMessage: string,
    userId: string,
    userRole: 'teacher' | 'student',
    enrolledSubjects: string[],
  ): Promise<ChatResponse> {
    const session = await ChatSessionModel.findById(sessionId).exec();
    if (!session) {
      throw new AppError('Chat session not found', 404);
    }

    // Verify ownership
    if (session.userId.toString() !== userId) {
      throw new AppError('Access denied. This session does not belong to you.', 403);
    }

    // Resolve the session's subject to get the subject name for chunk filtering
    const subject = await SubjectModel.findById(session.subjectId).lean().exec();
    if (!subject) {
      throw new AppError('Subject associated with this session no longer exists.', 404);
    }

    // If student, verify enrollment in the session's subject
    if (userRole === 'student') {
      const isEnrolled = enrolledSubjects.some((id) => id === session.subjectId.toString());
      if (!isEnrolled) {
        throw new AppError('You are not enrolled in this subject.', 403);
      }
    }

    const subjectName = subject.name; // This is the string used in chunk metadata

    const priorMessages: IChatMessage[] = session.messages.slice(-6).map((message) => ({
      role: message.role,
      content: message.content,
      citations: message.citations,
      createdAt: message.createdAt,
    }));
    session.messages.push({ role: 'user', content: userMessage, createdAt: new Date() });
    if (session.messages.length === 1 || session.title === 'New Research Chat') {
      session.title = titleFromMessage(userMessage);
    }
    await session.save();

    const queryEmbedding = await this.embeddingPort.generateEmbedding(userMessage);

    // CRITICAL SECURITY: Pass subjectName as filter to restrict chunk retrieval
    const relevantChunks = await retrieveRelevantChunks(
      queryEmbedding,
      undefined,
      undefined,
      subjectName,
    );

    if (relevantChunks.length === 0) {
      if (env.allowGeneralQuestions) {
        try {
          const content =
            (await this.llmPort.callLLM(GENERAL_SYSTEM_PROMPT, priorMessages, userMessage)) ||
            'I could not generate a response.';
          const response: ChatResponse = { content, citations: [] };
          session.messages.push({
            role: 'assistant',
            content: response.content,
            citations: [],
            createdAt: new Date(),
          });
          await session.save();
          return response;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown LLM chat error';
          session.messages.push({
            role: 'assistant',
            content: `Unable to generate a response: ${message}`,
            citations: [],
            createdAt: new Date(),
          });
          await session.save();
          throw new Error(`LLM chat completion failed: ${message}`);
        }
      }

      const response: ChatResponse = { content: REFUSAL_MESSAGE, citations: [] };
      session.messages.push({
        role: 'assistant',
        content: response.content,
        citations: [],
        createdAt: new Date(),
      });
      await session.save();
      return response;
    }

    const context = buildContext(relevantChunks);
    const currentPrompt = `Context from course materials:
===
${context}
===

---
Question: ${userMessage}`;

    try {
      const content =
        (await this.llmPort.callLLM(
          env.allowGeneralQuestions ? GENERAL_SYSTEM_PROMPT : SYSTEM_PROMPT,
          priorMessages,
          currentPrompt,
        )) || REFUSAL_MESSAGE;
      const citations = buildCitations(relevantChunks);
      session.messages.push({ role: 'assistant', content, citations, createdAt: new Date() });
      await session.save();
      return { content, citations };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown LLM chat error';
      session.messages.push({
        role: 'assistant',
        content: `Unable to generate a response: ${message}`,
        citations: [],
        createdAt: new Date(),
      });
      await session.save();
      throw new Error(`LLM chat completion failed: ${message}`);
    }
  }
}
```

### 7.4 Modify `backend/src/services/documentService.ts`

Add `uploadedBy` field to `CreateDocumentInput` and pass it to `DocumentModel.create()`.

**Changes only** (do NOT replace the entire file):

1. Add `uploadedBy: string;` to the `CreateDocumentInput` interface
2. In `createDocument()`, add `uploadedBy: input.uploadedBy` to the `DocumentModel.create()` call
3. In `listDocuments()`, add optional `uploadedBy` filter and `enrolledSubjectNames` filter:

```typescript
export interface CreateDocumentInput {
  fileName: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  mimeType: string;
  subject: string;
  chapter: number;
  chapterTitle: string;
  uploadedBy: string;  // NEW — userId of the teacher
}
```

Update `listDocuments` to support role-based filtering:

```typescript
/** Lists documents with optional filters. Supports role-based access. */
async listDocuments(filters: {
  subject?: string;
  status?: string;
  userRole?: 'teacher' | 'student';
  enrolledSubjectNames?: string[];
}): Promise<IDocument[]> {
  const query: Record<string, unknown> = {};

  if (filters.subject) {
    // If student, verify they can access this subject
    if (
      filters.userRole === 'student' &&
      filters.enrolledSubjectNames &&
      !filters.enrolledSubjectNames.includes(filters.subject)
    ) {
      throw new AppError('Access denied. You are not enrolled in this subject.', 403);
    }
    query.subject = filters.subject;
  } else if (filters.userRole === 'student' && filters.enrolledSubjectNames) {
    // No specific subject filter — auto-filter to enrolled subjects only
    query.subject = { $in: filters.enrolledSubjectNames };
  }

  if (filters.status && ['uploaded', 'processing', 'indexed', 'failed'].includes(filters.status)) {
    query.status = filters.status;
  }

  return DocumentModel.find(query).sort({ uploadedAt: -1 }).lean().exec();
}
```

In `createDocument()`, add `uploadedBy`:
```typescript
const document = await DocumentModel.create({
  ...input,
  status: 'uploaded',
  totalChunks: 0,
});
```
(The `uploadedBy` is already in `input` via the spread, so no code change needed here if `CreateDocumentInput` is updated.)

---

## 8. UPDATE COMPOSITION ROOT

### 8.1 Modify `backend/src/config/dependencies.ts`

Add `AuthService` wiring:

```typescript
import { ParserAdapter } from '../adapters/ParserAdapter.js';
import { GeminiEmbeddingAdapter } from '../adapters/GeminiEmbeddingAdapter.js';
import { GeminiChatAdapter } from '../adapters/GeminiChatAdapter.js';
import { DocumentService } from '../services/documentService.js';
import { ChatService } from '../services/chatService.js';
import { AuthService } from '../services/authService.js';

// 1. Instantiate concrete adapters (Driven Adapters)
const parserAdapter = new ParserAdapter();
const embeddingAdapter = new GeminiEmbeddingAdapter();
const chatAdapter = new GeminiChatAdapter();

// 2. Instantiate and wire up services (Core Domain Logic) with adapters
export const documentService = new DocumentService(parserAdapter, embeddingAdapter);
export const chatService = new ChatService(embeddingAdapter, chatAdapter);
export const authService = new AuthService();
```

---

## 9. VALIDATION RULES

### 9.1 Update `backend/src/middleware/validation.ts`

Add new validators at the end of the file (do NOT remove existing validators):

```typescript
// === Auth Validators ===

export const registerValidators = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters.')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores.'),
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be 6-100 characters.'),
  body('role')
    .isIn(['teacher', 'student'])
    .withMessage('Role must be "teacher" or "student".'),
];

export const loginValidators = [
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

export const enrollValidators = [
  param('id').isMongoId().withMessage('Invalid subject id.'),
  body('password').notEmpty().withMessage('Course password is required.'),
];

export const createSubjectValidators = [
  body('name').trim().notEmpty().withMessage('Subject name is required.'),
  body('password')
    .isLength({ min: 4 })
    .withMessage('Course password must be at least 4 characters.'),
  body('description').optional().trim(),
];

// Update createSessionValidators to require subjectId:
export const createSessionWithSubjectValidators = [
  body('subjectId').isMongoId().withMessage('Valid subjectId is required.'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Title must be 1-120 characters.'),
];
```

> **NOTE**: Keep the existing `createSessionValidators` if other code still references it, OR rename the new one to replace it. The chat routes must use `createSessionWithSubjectValidators` instead.

---

## 10. ROUTES — Create & Update

### 10.1 Create `backend/src/routes/authRoutes.ts` [NEW FILE]

```typescript
import { Router, type NextFunction, type Request, type Response } from 'express';

import { authService } from '../config/dependencies.js';
import { registerValidators, loginValidators, validateRequest } from '../middleware/validation.js';

export const authRoutes = Router();

/** POST /api/auth/register */
authRoutes.post(
  '/register',
  registerValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password, role } = req.body as {
        username: string;
        password: string;
        role: 'teacher' | 'student';
      };

      const result = await authService.register(username, password, role);

      res.status(201).json({
        success: true,
        token: result.token,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  },
);

/** POST /api/auth/login */
authRoutes.post(
  '/login',
  loginValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body as { username: string; password: string };

      const result = await authService.login(username, password);

      res.json({
        success: true,
        token: result.token,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  },
);
```

### 10.2 Update `backend/src/routes/subjectRoutes.ts`

Replace the entire file with auth-protected routes:

```typescript
import { Router, type NextFunction, type Request, type Response } from 'express';

import {
  listSubjects,
  createSubject,
  enrollStudent,
  deleteSubject,
} from '../services/subjectService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createSubjectValidators,
  enrollValidators,
  mongoIdParamValidator,
  validateRequest,
} from '../middleware/validation.js';

export const subjectRoutes = Router();

/** GET /api/subjects — List all subjects (any authenticated user). */
subjectRoutes.get(
  '/',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const subjects = await listSubjects();
      res.json({ success: true, subjects });
    } catch (error) {
      next(error);
    }
  },
);

/** POST /api/subjects — Create a new subject (teacher only). */
subjectRoutes.post(
  '/',
  requireAuth,
  requireRole('teacher'),
  createSubjectValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, password } = req.body as {
        name: string;
        description?: string;
        password: string;
      };

      const subject = await createSubject(name, description, password, req.user!.id);
      res.status(201).json({ success: true, subject });
    } catch (error) {
      next(error);
    }
  },
);

/** POST /api/subjects/:id/enroll — Enroll a student in a subject. */
subjectRoutes.post(
  '/:id/enroll',
  requireAuth,
  requireRole('student'),
  enrollValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const { password } = req.body as { password: string };

      await enrollStudent(id, req.user!.id, password);

      res.json({ success: true, message: 'Successfully enrolled in the subject.' });
    } catch (error) {
      next(error);
    }
  },
);

/** DELETE /api/subjects/:id — Delete a subject (teacher only, blocked if documents exist). */
subjectRoutes.delete(
  '/:id',
  requireAuth,
  requireRole('teacher'),
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      await deleteSubject(id);
      res.json({ success: true, message: 'Subject deleted.' });
    } catch (error) {
      next(error);
    }
  },
);
```

### 10.3 Update `backend/src/routes/documentRoutes.ts`

Add auth middleware to all routes. Teacher-only for upload/delete. Role-based filtering for GET.

Replace the entire file:

```typescript
import path from 'node:path';

import { Router, type NextFunction, type Request, type Response } from 'express';

import { documentService } from '../config/dependencies.js';
import { SubjectModel } from '../models/Subject.js';
import { logger } from '../utils/logger.js';
import { decodePossiblyMojibakeFilename } from '../utils/filenameEncoding.js';
import { AppError } from '../middleware/errorHandler.js';
import { upload } from '../middleware/upload.js';
import { mongoIdParamValidator, uploadDocumentValidators, validateRequest } from '../middleware/validation.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const documentRoutes = Router();

/**
 * POST /api/documents/upload — Teacher only.
 * Uploads a document under a specific subject.
 */
documentRoutes.post(
  '/upload',
  requireAuth,
  requireRole('teacher'),
  upload.single('file'),
  uploadDocumentValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('File is required.', 400);
      }

      const originalName = decodePossiblyMojibakeFilename(req.file.originalname);
      const fileType = path.extname(originalName).toLowerCase().replace('.', '');
      if (!['pdf', 'docx', 'pptx'].includes(fileType)) {
        throw new AppError('Unsupported file type.', 400);
      }

      const document = await documentService.createDocument({
        fileName: req.file.filename,
        originalName,
        fileType: fileType as 'pdf' | 'docx' | 'pptx',
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        subject: String(req.body.subject),
        chapter: Number(req.body.chapter),
        chapterTitle: String(req.body.chapterTitle),
        uploadedBy: req.user!.id,
      });

      res.status(201).json({ success: true, document });

      void documentService.processDocument(document._id.toString()).catch((error) => {
        const message = error instanceof Error ? error.message : 'Unknown processing error';
        logger.error(`Async processing failed: ${message}`);
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/documents — Role-based access.
 * - Teacher: sees all documents
 * - Student: sees only documents belonging to enrolled subjects
 */
documentRoutes.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let enrolledSubjectNames: string[] | undefined;

    if (req.user!.role === 'student') {
      // Resolve ObjectId[] → subject name strings for filtering
      if (req.user!.enrolledSubjects.length > 0) {
        const subjects = await SubjectModel.find({
          _id: { $in: req.user!.enrolledSubjects },
        })
          .select('name')
          .lean()
          .exec();
        enrolledSubjectNames = subjects.map((s) => s.name);
      } else {
        enrolledSubjectNames = [];
      }
    }

    const documents = await documentService.listDocuments({
      subject: typeof req.query.subject === 'string' ? req.query.subject : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      userRole: req.user!.role,
      enrolledSubjectNames,
    });
    res.json({ success: true, documents });
  } catch (error) {
    next(error);
  }
});

/** GET /api/documents/:id — Any authenticated user. */
documentRoutes.get(
  '/:id',
  requireAuth,
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const document = await documentService.getDocumentById(id);

      // If student, verify they're enrolled in the document's subject
      if (req.user!.role === 'student') {
        const subject = await SubjectModel.findOne({ name: document.subject }).lean().exec();
        if (
          !subject ||
          !req.user!.enrolledSubjects.some((id) => id.toString() === subject._id.toString())
        ) {
          throw new AppError('Access denied. You are not enrolled in this subject.', 403);
        }
      }

      res.json({ success: true, document });
    } catch (error) {
      next(error);
    }
  },
);

/** DELETE /api/documents/:id — Teacher only. */
documentRoutes.delete(
  '/:id',
  requireAuth,
  requireRole('teacher'),
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const deletedChunks = await documentService.deleteDocument(id);
      res.json({ success: true, message: `Document and ${deletedChunks} chunks deleted` });
    } catch (error) {
      next(error);
    }
  },
);
```

### 10.4 Update `backend/src/routes/chatRoutes.ts`

Add auth middleware, pass user context to all service calls:

```typescript
import { Router, type NextFunction, type Request, type Response } from 'express';

import { chatService } from '../config/dependencies.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createSessionWithSubjectValidators,
  mongoIdParamValidator,
  sendMessageValidators,
  validateRequest,
} from '../middleware/validation.js';

export const chatRoutes = Router();

// All chat routes require authentication
chatRoutes.use(requireAuth);

/** POST /api/chat/sessions — Create a new chat session for a subject. */
chatRoutes.post(
  '/sessions',
  createSessionWithSubjectValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const title = typeof req.body.title === 'string' ? req.body.title : undefined;
      const { subjectId } = req.body as { subjectId: string };

      const session = await chatService.createChatSession(
        title,
        subjectId,
        req.user!.id,
        req.user!.role,
        req.user!.enrolledSubjects.map((id) => id.toString()),
      );

      res.status(201).json({ success: true, session });
    } catch (error) {
      next(error);
    }
  },
);

/** GET /api/chat/sessions — List sessions for the current user. */
chatRoutes.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await chatService.listChatSessions(req.user!.id);
    res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
});

/** GET /api/chat/sessions/:id — Get session with messages. */
chatRoutes.get(
  '/sessions/:id',
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const session = await chatService.getChatSession(id, req.user!.id);
      res.json({ success: true, session });
    } catch (error) {
      next(error);
    }
  },
);

/** POST /api/chat/sessions/:id/messages — Send a message and get RAG response. */
chatRoutes.post(
  '/sessions/:id/messages',
  sendMessageValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const response = await chatService.generateChatResponse(
        id,
        String(req.body.message),
        req.user!.id,
        req.user!.role,
        req.user!.enrolledSubjects.map((id) => id.toString()),
      );
      res.json({
        success: true,
        reply: {
          role: 'assistant',
          content: response.content,
          citations: response.citations,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/** DELETE /api/chat/sessions/:id — Delete a chat session. */
chatRoutes.delete(
  '/sessions/:id',
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      await chatService.deleteChatSession(id, req.user!.id);
      res.json({ success: true, message: 'Session deleted' });
    } catch (error) {
      next(error);
    }
  },
);
```

---

## 11. UPDATE ENTRY POINT

### 11.1 Modify `backend/src/index.ts`

Key changes:
1. **Remove** `seedDefaultSubject` import and call
2. **Add** `authRoutes` import and mount
3. Keep everything else the same

Here is the **complete replacement**:

```typescript
import cors from 'cors';
import express from 'express';

import { connectDatabase } from './config/database.js';
import { env } from './config/environment.js';
import { authRoutes } from './routes/authRoutes.js';
import { chatRoutes } from './routes/chatRoutes.js';
import { documentRoutes } from './routes/documentRoutes.js';
import { subjectRoutes } from './routes/subjectRoutes.js';
import { testSetRoutes } from './routes/testSetRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the SE1939 RAG Chatbot Academic Backend API.',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      subjects: '/api/subjects',
      documents: '/api/documents',
      sessions: '/api/chat/sessions',
      testSet: '/api/test-set',
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/test-set', testSetRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  await connectDatabase();
  // NOTE: seedDefaultSubject() has been removed because Subject now requires
  // password and teacherId fields that cannot be auto-seeded.
  app.listen(env.port, () => {
    logger.info(`Backend listening on http://localhost:${env.port}`);
  });
};

void startServer().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error';
  logger.error(`Server startup failed: ${message}`);
  process.exit(1);
});
```

---

## 12. COMPLETE FILE CHECKLIST

### New Files to Create (6 files)

| # | File Path | Description |
|---|-----------|-------------|
| 1 | `src/types/express.d.ts` | Express Request augmentation for `req.user` |
| 2 | `src/models/User.ts` | User model with bcrypt pre-save hook |
| 3 | `src/middleware/auth.ts` | `requireAuth` and `requireRole` middleware |
| 4 | `src/services/authService.ts` | AuthService class (register/login) |
| 5 | `src/routes/authRoutes.ts` | POST /api/auth/register, POST /api/auth/login |
| 6 | `.env` update (not a new file) | Add JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_SALT_ROUNDS |

### Existing Files to Modify (12 files)

| # | File Path | What Changes |
|---|-----------|-------------|
| 1 | `src/config/environment.ts` | Add `jwtSecret`, `jwtExpiresIn`, `bcryptSaltRounds` |
| 2 | `.env.example` | Add 3 new env vars |
| 3 | `src/types/index.ts` | Add `UserRole` type |
| 4 | `src/models/Subject.ts` | Add `password` and `teacherId` fields |
| 5 | `src/models/ChatSession.ts` | Add `subjectId` and `userId` fields |
| 6 | `src/models/Document.ts` | Add `uploadedBy` field + `Types` import |
| 7 | `src/services/subjectService.ts` | Replace: add `enrollStudent`, update `createSubject`, remove `seedDefaultSubject` |
| 8 | `src/services/retrievalService.ts` | Add `subjectFilter` parameter |
| 9 | `src/services/chatService.ts` | Replace: add enrollment checks, subject filtering, user ownership |
| 10 | `src/services/documentService.ts` | Update `CreateDocumentInput`, `listDocuments` with role-based filter |
| 11 | `src/config/dependencies.ts` | Add `AuthService` instantiation |
| 12 | `src/middleware/validation.ts` | Add auth/enroll/subject validators |
| 13 | `src/routes/authRoutes.ts` | (new — listed above) |
| 14 | `src/routes/subjectRoutes.ts` | Replace: add auth middleware, enroll endpoint |
| 15 | `src/routes/documentRoutes.ts` | Replace: add auth, role-based document access |
| 16 | `src/routes/chatRoutes.ts` | Replace: add auth, pass user context |
| 17 | `src/index.ts` | Replace: add authRoutes, remove seedDefaultSubject |

### Files NOT to Touch

- `src/adapters/*` — Do NOT modify any adapter
- `src/ports/*` — Do NOT modify any port interface
- `src/services/chunkingService.ts` — No changes needed
- `src/services/citationService.ts` — No changes needed
- `src/middleware/errorHandler.ts` — No changes needed
- `src/middleware/upload.ts` — No changes needed
- `src/utils/*` — No changes needed
- `src/config/database.ts` — No changes needed
- `src/routes/testSetRoutes.ts` — No changes needed (public endpoint)
- Any `frontend/` files — Do NOT touch frontend in Phase 1

---

## 13. COMPLETE API REFERENCE

### 13.1 Authentication (Public — No Token Required)

#### `POST /api/auth/register`
```
Body: { "username": "teacher1", "password": "pass123", "role": "teacher" }

Success 201:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "665...",
    "username": "teacher1",
    "role": "teacher",
    "enrolledSubjects": []
  }
}

Error 409: { "success": false, "error": "Username already exists." }
Error 400: { "success": false, "error": "Username must be 3-30 characters. ..." }
```

#### `POST /api/auth/login`
```
Body: { "username": "teacher1", "password": "pass123" }

Success 200:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "665...",
    "username": "teacher1",
    "role": "teacher",
    "enrolledSubjects": []
  }
}

Error 401: { "success": false, "error": "Invalid username or password." }
```

### 13.2 Subjects (Token Required)

#### `GET /api/subjects` — Any authenticated user
```
Headers: { "Authorization": "Bearer <token>" }

Success 200:
{
  "success": true,
  "subjects": [
    {
      "_id": "665...",
      "name": "Software Modeling and Design",
      "description": "UML, Use Cases, Patterns...",
      "teacherId": "665...",
      "createdAt": "2026-..."
    }
  ]
}

Note: password hash is NEVER returned in list responses.
Error 401: { "success": false, "error": "Access denied. No token provided." }
```

#### `POST /api/subjects` — Teacher only
```
Headers: { "Authorization": "Bearer <teacher_token>" }
Body: {
  "name": "Software Modeling and Design",
  "description": "UML, Use Cases, Patterns...",
  "password": "course123"
}

Success 201: { "success": true, "subject": { ... } }
Error 403: { "success": false, "error": "Access denied. Required role: teacher. Your role: student." }
Error 409: { "success": false, "error": "Subject \"...\" already exists." }
```

#### `POST /api/subjects/:id/enroll` — Student only
```
Headers: { "Authorization": "Bearer <student_token>" }
Body: { "password": "course123" }

Success 200: { "success": true, "message": "Successfully enrolled in the subject." }
Error 403 (wrong password): { "success": false, "error": "Incorrect course password." }
Error 403 (not student): { "success": false, "error": "Access denied. Required role: student. ..." }
Error 409 (already enrolled): { "success": false, "error": "You are already enrolled in this subject." }
```

### 13.3 Documents (Token Required)

#### `POST /api/documents/upload` — Teacher only
```
Headers: { "Authorization": "Bearer <teacher_token>" }
Content-Type: multipart/form-data
Fields: file (binary), subject (string), chapter (number), chapterTitle (string)

Success 201: { "success": true, "document": { ... } }
Error 403: { "success": false, "error": "Access denied. Required role: teacher. ..." }
```

#### `GET /api/documents` — Role-based
```
Headers: { "Authorization": "Bearer <token>" }
Query: ?subject=...&status=... (optional)

Teacher: Returns ALL documents
Student: Returns ONLY documents from enrolled subjects
Student requesting unenrolled subject: 403

Success 200: { "success": true, "documents": [...] }
```

#### `GET /api/documents/:id` — Any authenticated, enrollment-checked for students
#### `DELETE /api/documents/:id` — Teacher only

### 13.4 Chat (Token Required)

#### `POST /api/chat/sessions`
```
Headers: { "Authorization": "Bearer <token>" }
Body: { "subjectId": "665...", "title": "Optional title" }

Student: Verified against enrolledSubjects → 403 if not enrolled
Success 201: { "success": true, "session": { ... } }
```

#### `GET /api/chat/sessions` — Returns only the current user's sessions
#### `GET /api/chat/sessions/:id` — Verifies ownership
#### `POST /api/chat/sessions/:id/messages` — Verifies ownership + enrollment + filters chunks by subject
#### `DELETE /api/chat/sessions/:id` — Verifies ownership

### 13.5 Public Endpoints (No Token)

- `GET /` — API info
- `GET /api/health` — Health check
- `GET /api/test-set` — Test set data

---

## 14. SECURITY RULES SUMMARY

| Rule | Implementation |
|------|---------------|
| All passwords hashed | User: pre-save hook (bcrypt). Subject: explicit hash in service layer. |
| JWT in every protected route | `requireAuth` middleware extracts/verifies Bearer token |
| Role-based access | `requireRole('teacher')` or `requireRole('student')` middleware |
| Student enrollment verification | Checked in chat session creation, message sending, and document access |
| Cross-course data isolation | `retrieveRelevantChunks()` uses `metadata.subject` MongoDB filter |
| Session ownership | All session operations verify `session.userId === req.user.id` |
| Subject ID → Name resolution | When filtering chunks, resolve `subjectId` (ObjectId) → Subject `name` (string) to match chunk `metadata.subject` |
| Password never returned | Subject list query uses `.select('-password')` |

---

## 15. VERIFICATION — Run After Implementation

### 15.1 TypeScript Compilation Check

```bash
cd backend
npx tsc --noEmit
```

This must complete with **zero errors**. Fix ALL type errors before proceeding.

### 15.2 Server Startup Check

```bash
cd backend
npm run dev
```

Verify the server starts without errors and connects to MongoDB.

### 15.3 Postman Testing Flow

Test this exact sequence to verify all authorization boundaries:

```
1. POST /api/auth/register  → teacher1 (role: teacher)  → save token as TEACHER_TOKEN
2. POST /api/auth/register  → student1 (role: student)  → save token as STUDENT_TOKEN
3. POST /api/auth/register  → student1 (same username)  → expect 409

4. POST /api/auth/login     → teacher1                  → verify token returned
5. POST /api/auth/login     → wrong password             → expect 401

6. GET  /api/subjects       → no token                  → expect 401
7. POST /api/subjects       → STUDENT_TOKEN              → expect 403
8. POST /api/subjects       → TEACHER_TOKEN              → create "Software Modeling and Design" with password "swd2026"

9. POST /api/subjects/:id/enroll → TEACHER_TOKEN          → expect 403 (not a student)
10. POST /api/subjects/:id/enroll → STUDENT_TOKEN, wrong pw → expect 403
11. POST /api/subjects/:id/enroll → STUDENT_TOKEN, correct pw → expect 200

12. POST /api/documents/upload → STUDENT_TOKEN            → expect 403
13. POST /api/documents/upload → TEACHER_TOKEN + file     → expect 201

14. GET  /api/documents      → STUDENT_TOKEN (enrolled)   → should see documents
15. GET  /api/documents      → new student (not enrolled) → should see empty list

16. POST /api/chat/sessions  → STUDENT_TOKEN + enrolled subjectId → expect 201
17. POST /api/chat/sessions  → STUDENT_TOKEN + unenrolled subjectId → expect 403

18. POST /api/chat/sessions/:id/messages → send question → verify RAG only retrieves chunks from the session's subject
```

### 15.4 Cross-Course Leak Test

This is the most critical security test:

```
1. Create Subject A and Subject B
2. Upload documents to both subjects
3. Enroll student ONLY in Subject A
4. Create chat session for Subject A
5. Ask a question that would match Subject B documents
6. Verify response ONLY cites Subject A documents (not Subject B)
```

---

## 16. IMPORTANT NOTES

1. **Token refresh and logout are out of scope** for this phase.
2. **`GET /api/test-set` remains public** — no authentication required.
3. **`GET /api/health` remains public** — no authentication required.
4. **Existing Chunk and Document data in MongoDB** may need to be cleared and re-uploaded since Document model now requires `uploadedBy`. Alternatively, make `uploadedBy` optional with a fallback for legacy data.
5. **Do NOT create any frontend code** in this phase.
6. **All imports use `.js` extension** (ESM convention with NodeNext module resolution).
