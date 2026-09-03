import api from './api';

export interface Opportunity {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  estimatedRevenue: number;
  confidence: number;
  status: string;
  metadata?: unknown;
}

export async function fetchOpportunities(): Promise<Opportunity[]> {
  const { data } = await api.get('/opportunities');
  return data.data.opportunities;
}

export async function fetchOpportunity(id: string) {
  const { data } = await api.get(`/opportunities/${id}`);
  return data.data;
}

export interface Strategy {
  name: string;
  expectedRevenue: number;
  campaignCost: number;
  incrementalProfit: number;
  expectedROI: number;
  conversionRate: number;
  confidence: number;
}

export interface RecommendResponse {
  opportunity: { id: string; type: string; title: string; description: string };
  strategies: Strategy[];
  bestStrategy: { name: string; roi: Strategy } | null;
  recommendation: {
    action: string;
    targetCount: number;
    expectedRevenue: number;
    campaignCost: number;
    incrementalProfit: number;
    expectedROI: number;
    confidence: number;
  } | null;
}

export async function recommendOpportunity(id: string): Promise<RecommendResponse> {
  const { data } = await api.post(`/opportunities/${id}/recommend`);
  return data.data;
}

export async function analyzeOpportunities() {
  const { data } = await api.post('/opportunities/analyze');
  return data.data;
}
