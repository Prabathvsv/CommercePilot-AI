export function formatINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function formatCompactINR(n: number): string {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

export function formatPercent(n: number, signed = false): string {
  const prefix = signed && n > 0 ? '+' : '';
  return `${prefix}${n.toFixed(1)}%`;
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
