import { useEffect, useState } from 'react';
import { fetchCustomers, fetchSegments, Customer } from '../services/customers';
import { formatINR, formatDate } from '../utils/format';

const SEGMENTS = ['All', 'VIP', 'LOYAL', 'REGULAR', 'NEW', 'AT_RISK', 'CHURNED'];

const SEGMENT_COLORS: Record<string, string> = {
  VIP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  LOYAL: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  REGULAR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  NEW: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
  AT_RISK: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  CHURNED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

function churnColor(score: number): string {
  if (score >= 70) return 'text-red-600 dark:text-red-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [segments, setSegments] = useState<{ segment: string; count: number }[]>([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSegments().then(setSegments).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCustomers({ page, limit: 20, segment: filter === 'All' ? undefined : filter, search: search || undefined })
      .then((res) => {
        setCustomers(res.customers);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [filter, page, search]);

  return (
    <div className="space-y-5">
      {/* Segment summary chips */}
      <div className="flex flex-wrap gap-2">
        {SEGMENTS.map((s) => {
          const seg = segments.find((x) => x.segment === s);
          return (
            <button
              key={s}
              onClick={() => {
                setFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === s
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {s} {seg ? `(${seg.count.toLocaleString()})` : ''}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{total.toLocaleString()} customers</div>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search customers..."
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs text-slate-500 dark:text-slate-400 uppercase">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Spend</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">AOV</th>
                <th className="px-4 py-3 font-medium">Churn</th>
                <th className="px-4 py-3 font-medium">Segment</th>
                <th className="px-4 py-3 font-medium">Last Purchase</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 dark:text-white">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.externalId}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatINR(c.totalSpend)}</td>
                  <td className="px-4 py-3">{c.totalOrders}</td>
                  <td className="px-4 py-3">{formatINR(c.averageOrderValue)}</td>
                  <td className={`px-4 py-3 font-medium ${churnColor(c.churnScore)}`}>{c.churnScore}%</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEGMENT_COLORS[c.segment] ?? ''}`}>
                      {c.segment}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(c.lastPurchaseAt)}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    {loading ? 'Loading...' : 'No customers found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-slate-500">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
