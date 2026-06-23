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
import { AdminService } from '../services/adminService.js';
import { EmailService } from '../services/emailService.js';
import type { ICachePort } from '../ports/ICachePort.js';

// 1. Instantiate concrete adapters (Driven Adapters)
const parserAdapter = new ParserAdapter();
const embeddingAdapter = new GeminiEmbeddingAdapter();
const chatAdapter = new GeminiChatAdapter();
export const emailService = new EmailService();

// Initialize the Cache Adapter with fallback
const cacheAdapter: ICachePort = env.redisUrl
  ? new RedisCacheAdapter(env.redisUrl)
  : new InMemoryCacheAdapter();

// 2. Instantiate and wire up services (Core Domain Logic) with adapters
export const documentService = new DocumentService(parserAdapter, embeddingAdapter);
export const subscriptionService = new SubscriptionService();
export const chatService = new ChatService(embeddingAdapter, chatAdapter, cacheAdapter, subscriptionService);
export const authService = new AuthService();
export const adminService = new AdminService(emailService);
