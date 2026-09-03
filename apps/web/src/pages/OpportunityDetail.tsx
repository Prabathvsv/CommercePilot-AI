import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Sparkles, Star } from 'lucide-react';
import { fetchOpportunity, recommendOpportunity, RecommendResponse } from '../services/opportunities';
import { formatINR } from '../utils/format';

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const [opportunity, setOpportunity] = useState<{
    id: string;
    type: string;
    title: string;
    description: string;
    priority: string;
    estimatedRevenue: number;
    confidence: number;
    metadata?: { targetCount?: number; incentive?: string };
  } | null>(null);
  const [strategies, setStrategies] = useState<RecommendResponse['strategies']>([]);
  const [bestName, setBestName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const data = await fetchOpportunity(id);
        setOpportunity(data);
        const rec = await recommendOpportunity(id);
        setStrategies(rec.strategies ?? []);
        setBestName(rec.bestStrategy?.name ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Display strategies in A/B/C order (the API returns them ranked by ROI)
  const sortedStrategies = [...strategies].sort((a, b) => {
    const la = /Strategy ([A-C]):/.exec(a.name)?.[1] ?? 'Z';
    const lb = /Strategy ([A-C]):/.exec(b.name)?.[1] ?? 'Z';
    return la.localeCompare(lb);
  });
  const best = strategies.find((s) => s.name === bestName) ?? sortedStrategies[0] ?? null;
  const bestLabel = best ? strategyParts(best.name).label : '';

  if (loading || !opportunity) {
    return <div className="text-center py-20 text-slate-500">Loading opportunity...</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link to="/opportunities" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft className="w-4 h-4" /> Back to opportunities
      </Link>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">{opportunity.type}</span>
          <span className="text-xs font-semibold text-brand-600">AI Recommendation</span>
        </div>
        <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{opportunity.title}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{opportunity.description}</p>
      </div>

      {/* Why did the AI recommend this */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Why did the AI recommend this?</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
            Purchase frequency dropped among high-value customers
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
            {(opportunity.metadata?.targetCount ?? 400).toLocaleString()} customers inactive &gt;30 days
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
            Historical cashback response rate: 74%
          </li>
        </ul>
      </div>

      {/* Strategy comparison — A/B/C side by side, best highlighted */}
      {strategies.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <h3 className="font-semibold text-slate-800 dark:text-white">AI Recommendation</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">The AI simulated three strategies and ranked them by expected ROI.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {sortedStrategies.map((s) => {
              const isBest = s.name === bestName;
              const { letter, label } = strategyParts(s.name);
              return (
                <div
                  key={s.name}
                  className={`relative flex flex-col gap-2 rounded-xl border p-4 ${
                    isBest
                      ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 ring-1 ring-brand-400'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isBest && (
                    <span className="absolute -top-3 left-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950 shadow">
                      <Star className="w-3 h-3 fill-amber-950" /> AI RECOMMENDED
                    </span>
                  )}
                  <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-white">
                    {letter}. {label}
                  </div>
                  <div className="mt-1 space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Expected</span>
                      <span className="font-medium text-slate-800 dark:text-white">{formatINR(s.expectedRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">ROI</span>
                      <span className={`font-medium ${isBest ? 'text-brand-600' : 'text-slate-800 dark:text-white'}`}>
                        {s.expectedROI.toFixed(2)}×
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Confidence</span>
                      <span className="font-medium text-slate-800 dark:text-white">{s.confidence}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Winner — the AI's chosen strategy */}
      {best && (
        <div className="rounded-xl border border-brand-400 bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white shadow-lg">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">
            <Star className="w-3.5 h-3.5 fill-white" /> AI RECOMMENDED
          </div>
          <h3 className="mt-2 text-2xl font-bold">{bestLabel}</h3>
          <p className="mt-1 text-sm text-white/80">
            Best of {strategies.length} strategies by expected ROI ({best.expectedROI.toFixed(2)}×).
          </p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-white/70">Expected Revenue</div>
              <div className="text-lg font-bold">{formatINR(best.expectedRevenue)}</div>
            </div>
            <div>
              <div className="text-xs text-white/70">Expected ROI</div>
              <div className="text-lg font-bold">{best.expectedROI.toFixed(2)}×</div>
            </div>
            <div>
              <div className="text-xs text-white/70">Confidence</div>
              <div className="text-lg font-bold">{best.confidence}%</div>
            </div>
          </div>
          <Link
            to={`/campaigns/builder?opportunityId=${opportunity.id}`}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            Generate Campaign
          </Link>
        </div>
      )}
    </div>
  );
}

function strategyParts(name: string): { letter: string; label: string } {
  const letter = /Strategy ([A-C]):/.exec(name)?.[1] ?? '—';
  const label = name
    .replace(/^Strategy [A-C]: /, '')
    .replace(/^./, (c) => c.toUpperCase());
  return { letter, label };
}
