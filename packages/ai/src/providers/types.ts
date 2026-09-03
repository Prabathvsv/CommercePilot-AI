export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCallRequest[];
}

export interface LLMConfig {
  provider: 'gemini' | 'ollama' | 'deterministic';
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCallRequest[];
  usage?: { inputTokens: number; outputTokens: number };
  raw?: unknown;
}

export interface LLMProvider {
  readonly name: string;
  chat(messages: ChatMessage[], tools: ToolDefinition[], config?: Partial<LLMConfig>): Promise<LLMResponse>;
  complete(prompt: string, config?: Partial<LLMConfig>): Promise<LLMResponse>;
}
