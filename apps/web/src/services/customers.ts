import api from './api';

export interface Customer {
  id: string;
  externalId: string;
  name: string;
  email: string | null;
  segment: string;
  churnScore: number;
  totalOrders: number;
  totalSpend: number;
  averageOrderValue: number;
  lastPurchaseAt: string | null;
}

export async function fetchCustomers(params: {
  page?: number;
  limit?: number;
  segment?: string;
  search?: string;
} = {}): Promise<{ customers: Customer[]; total: number; totalPages: number }> {
  const { data } = await api.get('/customers', { params });
  return { customers: data.data, total: data.total, totalPages: data.totalPages };
}

export async function fetchSegments() {
  const { data } = await api.get('/customers/segments');
  return data.data.segments;
}

export async function fetchAtRisk(limit = 100) {
  const { data } = await api.get(`/customers/at-risk?limit=${limit}`);
  return data.data.customers;
}
