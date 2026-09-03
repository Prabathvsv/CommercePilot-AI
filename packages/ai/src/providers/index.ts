import { LLMProvider } from './types.js';
import { GeminiProvider } from './gemini.js';
import { OllamaProvider } from './ollama.js';
import { DeterministicProvider } from './deterministic.js';

export * from './types.js';
export { GeminiProvider } from './gemini.js';
export { OllamaProvider } from './ollama.js';
export { DeterministicProvider } from './deterministic.js';

export function createProvider(config: {
  geminiApiKey?: string;
  ollamaBaseUrl?: string;
  force?: 'gemini' | 'ollama' | 'deterministic';
}): LLMProvider {
  if (config.force === 'gemini' && config.geminiApiKey) return new GeminiProvider(config.geminiApiKey);
  if (config.force === 'ollama') return new OllamaProvider(config.ollamaBaseUrl ?? 'http://localhost:11434');
  if (config.force === 'deterministic') return new DeterministicProvider();

  // Auto-select: prefer Gemini if key present, else deterministic (no network dependency)
  if (config.geminiApiKey) return new GeminiProvider(config.geminiApiKey);
  return new DeterministicProvider();
}

export function providerLabel(config: {
  geminiApiKey?: string;
  force?: 'gemini' | 'ollama' | 'deterministic';
}): string {
  if (config.force === 'gemini') return 'gemini';
  if (config.force === 'ollama') return 'ollama';
  if (config.force === 'deterministic') return 'deterministic';
  return config.geminiApiKey ? 'gemini' : 'deterministic';
}
