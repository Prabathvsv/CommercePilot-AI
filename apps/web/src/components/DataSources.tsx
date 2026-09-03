import { useEffect, useState } from 'react';
import { CheckCircle2, Database, RefreshCw } from 'lucide-react';

const SOURCES = [
  { label: 'Razorpay Transactions', detail: 'live payment events' },
  { label: 'Payment Status', detail: 'success / failed / pending' },
  { label: 'Customer Purchases', detail: 'order history' },
  { label: 'Refunds', detail: 'disputes & reversals' },
  { label: 'Orders', detail: 'fulfillment' },
];

export default function DataSources() {
  const [lastSync, setLastSync] = useState<string>('just now');
  const [syncing, setSyncing] = useState(false);

  function refresh() {
    setSyncing(true);
    setTimeout(() => {
      setLastSync('just now');
      setSyncing(false);
    }, 700);
  }

  useEffect(() => {
    // Simulated: pretend data synced a couple of minutes ago
    const t = setTimeout(() => setLastSync('2 min ago'), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-brand-600" />
          <h3 className="font-semibold text-slate-800 dark:text-white">Connected Data Sources</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
            Test mode
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Last synchronized: {lastSync}</span>
          <button
            onClick={refresh}
            disabled={syncing}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-600 px-2 py-1 text-xs font-medium hover:border-brand-400 hover:text-brand-600"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {SOURCES.map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-slate-800 dark:text-white">{s.label}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{s.detail}</div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        Your growth intelligence is built on payment &amp; transaction data. This demo uses simulated Razorpay test data.
      </p>
    </div>
  );
}
