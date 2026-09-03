import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-login as demo merchant for the prototype demo
export async function ensureDemoAuth(): Promise<string | null> {
  const existing = localStorage.getItem('cp_token');
  if (existing) return existing;
  try {
    const { data } = await api.post('/auth/login', {
      email: 'merchant@commercepilot.ai',
      password: 'password123',
    });
    localStorage.setItem('cp_token', data.data.token);
    return data.data.token;
  } catch {
    // Fall back to registration if the demo merchant doesn't exist yet
    try {
      const { data } = await api.post('/auth/register', {
        name: 'Demo Merchant',
        email: 'merchant@commercepilot.ai',
        password: 'password123',
        businessName: 'BrewHaus Coffee Co.',
        industry: 'Retail / Specialty Coffee',
      });
      localStorage.setItem('cp_token', data.data.token);
      return data.data.token;
    } catch {
      return null;
    }
  }
}

export default api;
