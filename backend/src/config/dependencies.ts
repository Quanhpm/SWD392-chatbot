import { env } from './environment.js';
import { ParserAdapter } from '../adapters/ParserAdapter.js';
import { GeminiEmbeddingAdapter } from '../adapters/GeminiEmbeddingAdapter.js';
import { GeminiChatAdapter } from '../adapters/GeminiChatAdapter.js';
import { InMemoryCacheAdapter } from '../adapters/InMemoryCacheAdapter.js';
import { RedisCacheAdapter } from '../adapters/RedisCacheAdapter.js';
import { DocumentService } from '../services/documentService.js';
import { ChatService } from '../services/chatService.js';
import { AuthService } from '../services/authService.js';
import { SubscriptionService } from '../services/subscriptionService.js';
import type { ICachePort } from '../ports/ICachePort.js';

// 1. Instantiate concrete adapters (Driven Adapters)
const parserAdapter = new ParserAdapter();
const embeddingAdapter = new GeminiEmbeddingAdapter();
const chatAdapter = new GeminiChatAdapter();

// Initialize the Cache Adapter with fallback
const cacheAdapter: ICachePort = env.redisUrl
  ? new RedisCacheAdapter(env.redisUrl)
  : new InMemoryCacheAdapter();

// 2. Instantiate and wire up services (Core Domain Logic) with adapters
export const documentService = new DocumentService(parserAdapter, embeddingAdapter, chatAdapter);
export const subscriptionService = new SubscriptionService();
export const chatService = new ChatService(embeddingAdapter, chatAdapter, cacheAdapter, subscriptionService);
export const authService = new AuthService();
