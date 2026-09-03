import { LLMProvider, LLMResponse, ChatMessage } from './types.js';

/**
 * Deterministic provider — used when no Gemini key / Ollama is available.
 * It doesn't call any LLM; it simply echoes tool results back with a light
 * template so the demo is fully functional offline. Intent detection and
 * planning are handled by the orchestrator's deterministic planner.
 */
export class DeterministicProvider implements LLMProvider {
  readonly name = 'deterministic';

  async chat(_messages: ChatMessage[], _tools: never, _config?: never): Promise<LLMResponse> {
    return { content: '' };
  }

  async complete(_prompt: string, _config?: never): Promise<LLMResponse> {
    return { content: '' };
  }
}
