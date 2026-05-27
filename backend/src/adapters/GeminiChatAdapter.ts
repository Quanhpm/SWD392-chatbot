import { env } from '../config/environment.js';
import type { ILLMPort } from '../ports/ILLMPort.js';
import type { IChatMessage } from '../models/ChatSession.js';

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

const toGeminiContent = (message: IChatMessage): GeminiContent => ({
  role: message.role === 'assistant' ? 'model' : 'user',
  parts: [{ text: message.content }],
});

const extractGeminiText = (data: GeminiGenerateResponse): string =>
  data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((text): text is string => Boolean(text))
    .join('')
    .trim() || '';

export class GeminiChatAdapter implements ILLMPort {
  async callLLM(systemPrompt: string, history: IChatMessage[], currentPrompt: string): Promise<string> {
    const contents: GeminiContent[] = [
      ...history.map(toGeminiContent),
      { role: 'user', parts: [{ text: currentPrompt }] },
    ];

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
          maxOutputTokens: 4_096,
        },
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Gemini chat error (${response.status}): ${details}`);
    }

    const data = (await response.json()) as GeminiGenerateResponse;
    return extractGeminiText(data);
  }
}
