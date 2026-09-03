import api from './api';

export interface Campaign {
  id: string;
  name: string;
  description: string;
  offer: string;
  targetSegment: string;
  budget: number;
  expectedRevenue: number;
  expectedROI: number;
  actualRevenue: number | null;
  actualROI: number | null;
  status: string;
  createdAt: string;
  executedAt: string | null;
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const { data } = await api.get('/campaigns');
  return data.data;
}

export async function createCampaign(payload: Record<string, unknown>) {
  const { data } = await api.post('/campaigns', payload);
  return data.data;
}

export async function updateCampaign(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`/campaigns/${id}`, payload);
  return data.data;
}

export async function approveCampaign(id: string) {
  const { data } = await api.post(`/campaigns/${id}/approve`);
  return data.data;
}

export async function rejectCampaign(id: string) {
  const { data } = await api.post(`/campaigns/${id}/reject`);
  return data.data;
}

export async function executeCampaign(id: string) {
  const { data } = await api.post(`/campaigns/${id}/execute`);
  return data.data;
}

export async function fetchCampaignResults(id: string) {
  const { data } = await api.get(`/campaigns/${id}`);
  return data.data;
}
