import { env } from '../config/environment.js';
import { ChatSessionModel, type IChatMessage, type IChatSession } from '../models/ChatSession.js';
import type { ChatResponse, RetrievalResult } from '../types/index.js';
import { GENERAL_SYSTEM_PROMPT, REFUSAL_MESSAGE, SYSTEM_PROMPT } from '../utils/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { buildCitations } from './citationService.js';
import { generateEmbedding } from './embeddingService.js';
import { retrieveRelevantChunks } from './retrievalService.js';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

const toModelPath = (model: string): string => (model.startsWith('models/') ? model : `models/${model}`);

const buildChatUrl = (): string =>
  `${GEMINI_API_BASE_URL}/${toModelPath(env.chatModel)}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`;

const buildContext = (retrievalResults: RetrievalResult[]): string =>
  retrievalResults
    .map((result, index) => {
      const pageLabel = result.chunk.pageNumbers.length > 0 ? result.chunk.pageNumbers.join(', ') : 'N/A';
      return `[Source ${index + 1}] ${result.chunk.metadata.fileName} — Chapter ${result.chunk.metadata.chapter}: ${result.chunk.metadata.chapterTitle} — Page ${pageLabel}
${result.chunk.content}`;
    })
    .join('\n===\n');

const toGeminiContent = (message: IChatMessage): GeminiContent => ({
  role: message.role === 'assistant' ? 'model' : 'user',
  parts: [{ text: message.content }],
});

const titleFromMessage = (message: string): string => {
  const compact = message.replace(/\s+/g, ' ').trim();
  return compact.length > 50 ? `${compact.slice(0, 50)}...` : compact;
};

const extractGeminiText = (data: GeminiGenerateResponse): string =>
  data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((text): text is string => Boolean(text))
    .join('')
    .trim() || '';

const callGemini = async (systemPrompt: string, contents: GeminiContent[]): Promise<string> => {
  const response = await fetch(buildChatUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1_500,
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini chat error (${response.status}): ${details}`);
  }

  return extractGeminiText((await response.json()) as GeminiGenerateResponse);
};

/** Creates a chat session. */
export const createChatSession = async (title?: string): Promise<IChatSession> => {
  return ChatSessionModel.create({ title: title?.trim() || 'New Research Chat', messages: [] });
};

/** Lists chat sessions without message history. */
export const listChatSessions = async (): Promise<IChatSession[]> => {
  return ChatSessionModel.find().select('-messages').sort({ updatedAt: -1 }).lean().exec();
};

/** Gets one chat session with messages. */
export const getChatSession = async (id: string): Promise<IChatSession> => {
  const session = await ChatSessionModel.findById(id).lean().exec();
  if (!session) {
    throw new AppError('Chat session not found', 404);
  }
  return session;
};

/** Deletes one chat session. */
export const deleteChatSession = async (id: string): Promise<void> => {
  const result = await ChatSessionModel.findByIdAndDelete(id).exec();
  if (!result) {
    throw new AppError('Chat session not found', 404);
  }
};

/** Orchestrates embedding, retrieval, chat completion, citation building, and persistence. */
export const generateChatResponse = async (sessionId: string, userMessage: string): Promise<ChatResponse> => {
  const session = await ChatSessionModel.findById(sessionId).exec();
  if (!session) {
    throw new AppError('Chat session not found', 404);
  }

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

  const queryEmbedding = await generateEmbedding(userMessage);
  const relevantChunks = await retrieveRelevantChunks(queryEmbedding);
  const contentsWithoutContext: GeminiContent[] = [...priorMessages.map(toGeminiContent), { role: 'user', parts: [{ text: userMessage }] }];

  if (relevantChunks.length === 0) {
    if (env.allowGeneralQuestions) {
      try {
        const content = (await callGemini(GENERAL_SYSTEM_PROMPT, contentsWithoutContext)) || 'I could not generate a response.';
        const response: ChatResponse = { content, citations: [] };
        session.messages.push({ role: 'assistant', content: response.content, citations: [], createdAt: new Date() });
        await session.save();
        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Gemini chat error';
        session.messages.push({
          role: 'assistant',
          content: `Unable to generate a response: ${message}`,
          citations: [],
          createdAt: new Date(),
        });
        await session.save();
        throw new Error(`Gemini chat completion failed: ${message}`);
      }
    }

    const response: ChatResponse = { content: REFUSAL_MESSAGE, citations: [] };
    session.messages.push({ role: 'assistant', content: response.content, citations: [], createdAt: new Date() });
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
      (await callGemini(
        env.allowGeneralQuestions ? GENERAL_SYSTEM_PROMPT : SYSTEM_PROMPT,
        [...priorMessages.map(toGeminiContent), { role: 'user', parts: [{ text: currentPrompt }] }],
      )) || REFUSAL_MESSAGE;
    const citations = buildCitations(relevantChunks);
    session.messages.push({ role: 'assistant', content, citations, createdAt: new Date() });
    await session.save();
    return { content, citations };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Gemini chat error';
    session.messages.push({
      role: 'assistant',
      content: `Unable to generate a response: ${message}`,
      citations: [],
      createdAt: new Date(),
    });
    await session.save();
    throw new Error(`Gemini chat completion failed: ${message}`);
  }
};
