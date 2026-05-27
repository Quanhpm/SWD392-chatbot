import type { IChatMessage } from '../models/ChatSession.js';

export interface ILLMPort {
  callLLM(systemPrompt: string, history: IChatMessage[], currentPrompt: string): Promise<string>;
}
