import { ReactNode } from 'react';
import { formatINR } from '../utils/format';

interface StatCardProps {
  label: string;
  value: string;
  sub?: ReactNode;
  trend?: number;
  positiveIsGood?: boolean;
}

export default function StatCard({ label, value, sub, trend, positiveIsGood = true }: StatCardProps) {
  const trendGood = trend != null && (positiveIsGood ? trend >= 0 : trend < 0);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="mt-2 flex items-center gap-2">
        {trend != null && (
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              trendGood
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
            }`}
          >
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {sub && <span className="text-xs text-slate-500 dark:text-slate-400">{sub}</span>}
      </div>
    </div>
  );
}

export { formatINR };
