import api from './api';

export interface Merchant {
  id: string;
  name: string;
  email: string;
  businessName: string;
}

const TOKEN_KEY = 'cp_token';
const MERCHANT_KEY = 'cp_merchant';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<Merchant> {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem(TOKEN_KEY, data.data.token);
  localStorage.setItem(MERCHANT_KEY, JSON.stringify(data.data.merchant));
  return data.data.merchant as Merchant;
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(MERCHANT_KEY);
}

export function getMerchant(): Merchant | null {
  try {
    const raw = localStorage.getItem(MERCHANT_KEY);
    return raw ? (JSON.parse(raw) as Merchant) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
