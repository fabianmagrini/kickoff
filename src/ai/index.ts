import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';

const provider = process.env.AI_PROVIDER ?? 'google';
const modelId =
  process.env.AI_MODEL ?? (provider === 'google' ? 'gemini-2.0-flash' : 'gpt-4o-mini');

export const model = provider === 'google' ? google(modelId) : openai(modelId);
