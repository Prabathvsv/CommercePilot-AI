import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Zap, RefreshCw } from 'lucide-react';
import { fetchOpportunities, analyzeOpportunities, Opportunity } from '../services/opportunities';
import { formatINR } from '../utils/format';

const TYPE_ICON: Record<string, string> = {
  REACTIVATION: '💰',
  RETENTION: '🔥',
  REVENUE_ANOMALY: '📉',
  CROSS_SELL: '📈',
  UPSELL: '⬆️',
};

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setOpportunities(await fetchOpportunities());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      await analyzeOpportunities();
      await load();
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">AI Opportunities</h2>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 text-white px-3 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading opportunities...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {opportunities.map((op) => (
            <Link
              key={op.id}
              to={`/opportunities/${op.id}`}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-brand-400 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{TYPE_ICON[op.type] ?? '✨'}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    op.priority === 'HIGH'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                  }`}
                >
                  {op.priority}
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-slate-800 dark:text-white">{op.title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{op.description}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <div>
                  <div className="text-xs text-slate-500">Potential Revenue</div>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(op.estimatedRevenue)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Confidence</div>
                  <div className="font-semibold text-slate-700 dark:text-slate-200">{op.confidence}%</div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-brand-600 font-medium">
                  Investigate <Zap className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
          {opportunities.length === 0 && (
            <div className="col-span-full text-center py-16 text-slate-400">
              <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-40" />
              No opportunities yet. Run an analysis to discover them.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
