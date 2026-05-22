import api from './api.js';
import type { TestSet } from '../types/index.js';

/**
 * Fetches the 50 ground truth test set questions
 */
export const getTestSet = async (): Promise<TestSet> => {
  const response = await api.get<TestSet>('/test-set');
  return response.data;
};
