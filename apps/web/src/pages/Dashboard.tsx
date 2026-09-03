import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles } from 'lucide-react';
import StatCard from '../components/StatCard';
import DataSources from '../components/DataSources';
import { fetchOverview, fetchRevenueTrends, DashboardOverview } from '../services/dashboard';
import { formatINR, formatNumber, formatPercent } from '../utils/format';

const OPPORTUNITY_ICONS: Record<string, string> = {
  REACTIVATION: '🔄',
  REVENUE_ANOMALY: '⚠️',
  CROSS_SELL: '🛒',
  RETENTION: '❤️',
};

export default function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [trends, setTrends] = useState<{ date: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ov, tr] = await Promise.all([fetchOverview(), fetchRevenueTrends(60, 'week')]);
        setOverview(ov);
        setTrends(tr.trends);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatINR(overview?.totalRevenue ?? 0)}
          trend={overview?.revenueGrowth}
          positiveIsGood={false}
        />
        <StatCard label="Transactions" value={formatNumber(overview?.totalTransactions ?? 0)} />
        <StatCard label="Customers" value={formatNumber(overview?.totalCustomers ?? 0)} />
        <StatCard label="Avg Order Value" value={formatINR(overview?.averageOrderValue ?? 0)} />
        <StatCard label="Repeat Purchase Rate" value={formatPercent(overview?.repeatPurchaseRate ?? 0)} />
        <StatCard label="Revenue at Risk" value={formatINR(overview?.revenueAtRisk ?? 0)} />
      </div>

      {/* Connected data sources */}
      <DataSources />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-white">Revenue Trend</h3>
            <span className="text-xs text-slate-500">Last 60 days · weekly</span>
          </div>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-20 text-slate-400">No revenue data</div>
          )}
        </div>

        {/* AI Opportunities */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <h3 className="font-semibold text-slate-800 dark:text-white">AI Opportunities</h3>
          </div>
          <div className="space-y-3">
            {(overview?.aiOpportunities ?? []).map((op) => {
              const meta = (op as { metadata?: Record<string, unknown> }).metadata ?? {};
              const changePercent = meta.changePercent as number | undefined;
              const label =
                op.type === 'REACTIVATION'
                  ? '₹200 cashback'
                  : op.type === 'REVENUE_ANOMALY'
                    ? `revenue declined ~${Math.abs(changePercent ?? 14).toFixed(0)}%`
                    : op.type === 'CROSS_SELL'
                      ? 'coffee machine → grinder'
                      : op.type === 'RETENTION'
                        ? 'high-value customers becoming inactive'
                        : op.type;
              return (
                <Link
                  key={op.id}
                  to={`/opportunities/${op.id}`}
                  className="block p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {OPPORTUNITY_ICONS[op.type] ?? '💡'} {label}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        op.priority === 'HIGH'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                      }`}
                    >
                      {op.priority} PRIORITY
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800 dark:text-white">{op.title}</div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatINR(op.estimatedRevenue)}</span>
                    <span className="text-slate-500">{op.confidence}% conf.</span>
                  </div>
                </Link>
              );
            })}
            {(overview?.aiOpportunities ?? []).length === 0 && (
              <div className="text-center py-8 text-sm text-slate-400">No open opportunities</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
