import { GoogleGenerativeAI, FunctionDeclaration, FunctionCallingMode } from '@google/generative-ai';
import { LLMProvider, LLMResponse, ToolDefinition, ToolCallRequest, ChatMessage, LLMConfig } from './types.js';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName = 'gemini-2.0-flash') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async chat(messages: ChatMessage[], tools: ToolDefinition[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: { temperature: config?.temperature ?? 0.2, maxOutputTokens: config?.maxTokens ?? 1024 },
      tools: [{ functionDeclarations: tools.map(toolToDeclaration) }],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
    });

    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: toGeminiRole(m.role), parts: [{ text: m.content }] }));

    const systemInstruction = messages.find((m) => m.role === 'system')?.content;

    const request: { contents: typeof history; systemInstruction?: { role: string; parts: { text: string }[] } } = {
      contents: history,
    };
    if (systemInstruction) {
      request.systemInstruction = { role: 'system', parts: [{ text: systemInstruction }] };
    }

    const result = await model.generateContent(request);

    const response = result.response;
    const text = response.text();
    const candidates = response.candidates ?? [];

    const toolCalls: ToolCallRequest[] = [];
    const firstCandidate = candidates[0];
    const functionCalls = firstCandidate?.content?.parts?.filter((p) => 'functionCall' in p);
    for (const fc of functionCalls ?? []) {
      const call = 'functionCall' in fc ? fc.functionCall : undefined;
      if (call?.name) {
        toolCalls.push({
          name: call.name,
          arguments: (call.args as Record<string, unknown>) ?? {},
        });
      }
    }

    const usageMetadata = (
      response as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }
    ).usageMetadata;

    return {
      content: text,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      usage: {
        inputTokens: usageMetadata?.promptTokenCount ?? 0,
        outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }

  async complete(prompt: string, config?: Partial<LLMConfig>): Promise<LLMResponse> {
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: { temperature: config?.temperature ?? 0.2 },
    });
    const result = await model.generateContent(prompt);
    return { content: result.response.text() };
  }
}

function toolToDeclaration(t: ToolDefinition): FunctionDeclaration {
  return {
    name: t.name,
    description: t.description,
    parameters: t.parameters as never,
  };
}

function toGeminiRole(role: ChatMessage['role']): 'user' | 'model' {
  if (role === 'user' || role === 'tool') return 'user';
  return 'model';
}
