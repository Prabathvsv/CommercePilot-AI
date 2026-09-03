import api from './api';

export interface AgentRun {
  agentName: string;
  summary: string;
  durationMs: number;
  agentRunId: string;
}

export interface ToolCall {
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  success: boolean;
  durationMs: number;
}

export interface CopilotResult {
  reply: string;
  intent: string;
  plan: string[];
  agentRuns: AgentRun[];
  data: Record<string, unknown>;
  opportunity?: {
    id: string;
    title: string;
    description: string;
    estimatedRevenue: number;
    confidence: number;
  };
}

export async function chatCopilot(message: string): Promise<CopilotResult> {
  const { data } = await api.post('/ai/chat', { message });
  return data.data;
}

export async function generateCampaignPlan(payload: Record<string, unknown> = {}) {
  const { data } = await api.post('/ai/generate-campaign', payload);
  return data.data;
}

export async function fetchAgentRuns(limit = 20) {
  const { data } = await api.get(`/agent/runs?limit=${limit}`);
  return data.data.runs;
}

export async function fetchAgentRun(runId: string) {
  const { data } = await api.get(`/agent/runs/${runId}`);
  return data.data.run;
}

export async function fetchAgentRunTools(runId: string): Promise<ToolCall[]> {
  const { data } = await api.get(`/agent/runs/${runId}/tools`);
  return data.data.toolCalls;
}
