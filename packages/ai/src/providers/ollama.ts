import { LLMProvider, LLMResponse, ToolDefinition, ChatMessage, LLMConfig } from './types.js';

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  private baseUrl: string;
  private modelName: string;

  constructor(baseUrl: string, modelName = 'qwen2.5:7b') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.modelName = modelName;
  }

  async chat(messages: ChatMessage[], _tools: ToolDefinition[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
    const url = `${this.baseUrl}/api/chat`;
    const body = {
      model: this.modelName,
      messages: messages
        .filter((m) => m.role !== 'system' && m.content)
        .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      stream: false,
      options: { temperature: config?.temperature ?? 0.2, num_predict: config?.maxTokens ?? 1024 },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config?.timeoutMs ?? 30000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = (await res.json()) as { message?: { content?: string } };
      return { content: data.message?.content ?? '' };
    } finally {
      clearTimeout(timeout);
    }
  }

  async complete(prompt: string, _config?: Partial<LLMConfig>): Promise<LLMResponse> {
    const url = `${this.baseUrl}/api/generate`;
    const body = { model: this.modelName, prompt, stream: false };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { response?: string };
    return { content: data.response ?? '' };
  }
}
