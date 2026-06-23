import { ChatSessionModel, type IChatMessage, type IChatSession } from '../models/ChatSession.js';
import { DocumentModel } from '../models/Document.js';
import { SubjectModel } from '../models/Subject.js';
import type { ChatResponse, ChatResponseWithQuota, RetrievalResult } from '../types/index.js';
import { SubscriptionService, type QuotaStatus } from './subscriptionService.js';
import { REFUSAL_MESSAGE, SYSTEM_PROMPT } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { buildCitations } from './citationService.js';
import { retrieveRelevantChunks } from './retrievalService.js';
import type { IEmbeddingPort } from '../ports/IEmbeddingPort.js';
import type { ILLMPort } from '../ports/ILLMPort.js';
import type { ICachePort } from '../ports/ICachePort.js';
import { assertDocumentAccess } from './accessService.js';
import type { UserRole } from '../types/index.js';

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

const MAX_STORED_CHAT_MESSAGES = 80;

export class ChatService {
  constructor(
    private embeddingPort: IEmbeddingPort,
    private llmPort: ILLMPort,
    private cachePort: ICachePort,
    private subscriptionService: SubscriptionService,
  ) {}

  /**
   * Creates a chat session scoped to a document.
   * Access is checked against the selected document and Subject-only permissions.
   */
  async createChatSession(
    title: string | undefined,
    documentId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<IChatSession> {
    const document = await DocumentModel.findById(documentId).lean().exec();
    if (!document) {
      throw new AppError('Document not found.', 404);
    }

    await assertDocumentAccess({ id: userId, role: userRole }, document, 'chat');

    const subject = document.subjectId
      ? await SubjectModel.findById(document.subjectId).lean().exec()
      : await SubjectModel.findOne({ name: document.subject }).lean().exec();
    if (!subject) {
      throw new AppError('Subject associated with this document no longer exists.', 404);
    }

    return ChatSessionModel.create({
      title: title?.trim() || `Hỏi đáp ${document.chapterTitle}`,
      subjectId: subject._id,
      documentId,
      userId,
      messages: [],
    });
  }

  /** Lists chat sessions for the current user (no message history). */
  async listChatSessions(userId: string, userRole: UserRole): Promise<IChatSession[]> {
    const sessions = await ChatSessionModel.find({ userId, documentId: { $exists: true } })
      .select('-messages')
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    const documents = await DocumentModel.find({
      _id: { $in: sessions.map((session) => session.documentId) },
    }).lean().exec();
    const documentsById = new Map(documents.map((document) => [document._id.toString(), document]));
    const visible = await Promise.all(sessions.map(async (session) => {
      const document = documentsById.get(session.documentId.toString());
      if (!document) return false;
      try {
        await assertDocumentAccess({ id: userId, role: userRole }, document, 'chat');
        return true;
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 403) return false;
        throw error;
      }
    }));
    return sessions.filter((_session, index) => visible[index]);
  }

  /** Gets one chat session with messages. Verifies ownership. Uses Cache fallback. */
  async getChatSession(id: string, userId: string, userRole: UserRole): Promise<IChatSession> {
    const cacheKey = `chat_session:${id}`;
    const cachedSession = await this.cachePort.get<IChatSession>(cacheKey);
    if (cachedSession) {
      if (cachedSession.userId.toString() !== userId) {
        throw new AppError('Access denied. This session does not belong to you.', 403);
      }
      if (!cachedSession.documentId) {
        throw new AppError('This chat session is no longer compatible. Please start a new document chat.', 400);
      }
      const document = await DocumentModel.findById(cachedSession.documentId).lean().exec();
      if (!document) throw new AppError('Document associated with this session no longer exists.', 404);
      await assertDocumentAccess({ id: userId, role: userRole }, document, 'chat');
      return cachedSession;
    }

    const session = await ChatSessionModel.findById(id).lean().exec();
    if (!session) {
      throw new AppError('Chat session not found', 404);
    }
    if (session.userId.toString() !== userId) {
      throw new AppError('Access denied. This session does not belong to you.', 403);
    }
    if (!session.documentId) {
      throw new AppError('This chat session is no longer compatible. Please start a new document chat.', 400);
    }
    const document = await DocumentModel.findById(session.documentId).lean().exec();
    if (!document) throw new AppError('Document associated with this session no longer exists.', 404);
    await assertDocumentAccess({ id: userId, role: userRole }, document, 'chat');

    await this.cachePort.set(cacheKey, session, 1800); // 30 minutes TTL
    return session;
  }

  /** Deletes one chat session. Verifies ownership and invalidates Cache. */
  async deleteChatSession(id: string, userId: string): Promise<void> {
    const session = await ChatSessionModel.findById(id).exec();
    if (!session) {
      throw new AppError('Chat session not found', 404);
    }
    if (session.userId.toString() !== userId) {
      throw new AppError('Access denied. This session does not belong to you.', 403);
    }
    if (!session.documentId) {
      throw new AppError('This chat session is no longer compatible. Please start a new document chat.', 400);
    }
    await session.deleteOne();
    await this.cachePort.del(`chat_session:${id}`);
  }

  /**
   * Orchestrates the full RAG pipeline with security enforcement:
   * 1. Verifies session ownership
   * 2. Resolves the selected document and its subject
   * 3. Verifies Subject-only access to the selected document
   * 4. Restricts chunk retrieval to the selected document
   */
  async generateChatResponse(
    sessionId: string,
    userMessage: string,
    userId: string,
    userRole: UserRole,
  ): Promise<ChatResponseWithQuota> {
    const session = await ChatSessionModel.findById(sessionId).exec();
    if (!session) {
      throw new AppError('Chat session not found', 404);
    }

    if (session.userId.toString() !== userId) {
      throw new AppError('Access denied. This session does not belong to you.', 403);
    }

    const document = await DocumentModel.findById(session.documentId).lean().exec();
    if (!document) {
      throw new AppError('Document associated with this session no longer exists.', 404);
    }

    await assertDocumentAccess({ id: userId, role: userRole }, document, 'chat');

    // Resolve subjectId (ObjectId) → subject name (string) for chunk metadata filtering
    const subject = await SubjectModel.findById(session.subjectId).lean().exec();
    if (!subject) {
      throw new AppError('Subject associated with this session no longer exists.', 404);
    }

    // Admin is unlimited; students and teachers use monthly account quota.
    let quotaStatus: QuotaStatus | undefined;
    let reservedQuotaPeriodKey: string | null = null;
    if (userRole !== 'admin') {
      quotaStatus = await this.subscriptionService.reserveQuota(userId, userRole);
      reservedQuotaPeriodKey = quotaStatus.periodKey;
    }

    try {
      const subjectName = subject.name; // matches chunk metadata.subject (string field)

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
    await this.saveAndCacheSession(session);

    const queryEmbedding = await this.embeddingPort.generateEmbedding(userMessage);

    // CRITICAL SECURITY: document filter restricts retrieval to the selected document only
    const relevantChunks = await retrieveRelevantChunks(
      queryEmbedding,
      undefined,
      undefined,
      subjectName,
      session.documentId.toString(),
    );

    if (relevantChunks.length === 0) {
      const response: ChatResponse = { content: REFUSAL_MESSAGE, citations: [] };
      session.messages.push({
        role: 'assistant',
        content: response.content,
        citations: [],
        createdAt: new Date(),
      });
      await this.saveAndCacheSession(session);

      if (userRole !== 'admin') {
        quotaStatus = await this.subscriptionService.checkQuota(userId, userRole);
      }

      return { ...response, quotaStatus };
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
          SYSTEM_PROMPT,
          priorMessages,
          currentPrompt,
        )) || REFUSAL_MESSAGE;
      const citations = buildCitations(relevantChunks);
      session.messages.push({ role: 'assistant', content, citations, createdAt: new Date() });
      await this.saveAndCacheSession(session);

      if (userRole !== 'admin') {
        quotaStatus = await this.subscriptionService.checkQuota(userId, userRole);
      }

      return { content, citations, quotaStatus };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown LLM chat error';
      session.messages.push({
        role: 'assistant',
        content: `Unable to generate a response: ${message}`,
        citations: [],
        createdAt: new Date(),
      });
      await this.saveAndCacheSession(session);
      throw new Error(`LLM chat completion failed: ${message}`);
    }
    } catch (error) {
      if (reservedQuotaPeriodKey) await this.subscriptionService.releaseQuota(userId, reservedQuotaPeriodKey);
      throw error;
    }
  }

  private async saveAndCacheSession(session: any): Promise<void> {
    const overflow = session.messages.length - MAX_STORED_CHAT_MESSAGES;
    if (overflow > 0) {
      session.messages.splice(0, overflow);
      session.archivedMessagesCount = (session.archivedMessagesCount ?? 0) + overflow;
    }
    await session.save();
    const cacheKey = `chat_session:${session._id.toString()}`;
    await this.cachePort.set(cacheKey, session.toObject(), 1800); // 30 minutes TTL
  }
}
