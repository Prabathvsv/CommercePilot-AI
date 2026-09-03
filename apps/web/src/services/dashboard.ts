import api from './api';

export interface DashboardOverview {
  totalRevenue: number;
  revenueGrowth: number;
  totalTransactions: number;
  averageOrderValue: number;
  activeCustomers: number;
  totalCustomers: number;
  repeatPurchaseRate: number;
  conversionRate: number;
  revenueAtRisk: number;
  aiOpportunities: {
    id: string;
    type: string;
    title: string;
    description: string;
    priority: string;
    estimatedRevenue: number;
    confidence: number;
  }[];
}

export async function fetchOverview(): Promise<DashboardOverview> {
  const { data } = await api.get('/dashboard/overview');
  return data.data;
}

export async function fetchRevenueTrends(days = 30, granularity = 'week') {
  const { data } = await api.get(`/dashboard/revenue?days=${days}&granularity=${granularity}`);
  return data.data;
}
