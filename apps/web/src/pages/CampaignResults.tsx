import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Target, Send, Users, IndianRupee, TrendingUp, Pencil } from 'lucide-react';
import { fetchCampaignResults, executeCampaign, approveCampaign } from '../services/campaigns';
import { formatINR, formatNumber } from '../utils/format';

interface Result {
  id: string;
  name: string;
  offer: string;
  status: string;
  budget: number;
  expectedRevenue: number;
  expectedROI: number;
  actualRevenue: number | null;
  actualROI: number | null;
  targeted: number;
  reached: number | null;
  results: { actualRevenue: number; actualConversions: number; actualCost: number; actualROI: number; predictionError: number }[];
}

export default function CampaignResults() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  async function load() {
    if (!id) return;
    setCampaign(await fetchCampaignResults(id));
  }

  useEffect(() => {
    (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleApprove() {
    if (!id) return;
    setActing(true);
    try {
      await approveCampaign(id);
      await load();
    } finally {
      setActing(false);
    }
  }

  async function handleExecute() {
    if (!id) return;
    setActing(true);
    try {
      await executeCampaign(id);
      await load();
    } finally {
      setActing(false);
    }
  }

  if (loading || !campaign) {
    return <div className="text-center py-20 text-slate-500">Loading campaign...</div>;
  }

  const result = campaign.results[0];

  // Awaiting approval state
  if (campaign.status === 'PENDING_APPROVAL' && !result) {
    return (
      <div className="max-w-xl mx-auto text-center py-24 space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
          <Target className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{campaign.name}</h2>
        <p className="text-sm text-slate-500">
          This campaign is ready and awaiting your approval before execution.
        </p>
        <div className="mx-auto max-w-sm bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 text-left space-y-2">
          <Row label="Offer" value={campaign.offer} />
          <Row label="Budget" value={formatINR(campaign.budget)} />
          <Row label="Expected Revenue" value={formatINR(campaign.expectedRevenue)} />
          <Row label="Expected ROI" value={`${campaign.expectedROI.toFixed(2)}×`} />
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleApprove}
            disabled={acting}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Approve & Execute Campaign
          </button>
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-600"
          >
            <Pencil className="w-4 h-4" /> Edit Campaign
          </Link>
        </div>
      </div>
    );
  }

  // Approved but not yet executed
  if (campaign.status === 'APPROVED' && !result) {
    return (
      <div className="max-w-xl mx-auto text-center py-24 space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
          <Send className="w-8 h-8 text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Campaign Approved</h2>
        <p className="text-sm text-slate-500">Ready to execute through the simulated commerce API.</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleExecute}
            disabled={acting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Execute Campaign
          </button>
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-600"
          >
            <Pencil className="w-4 h-4" /> Edit Campaign
          </Link>
        </div>
      </div>
    );
  }

  // Results
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{campaign.name}</h2>
        <p className="text-sm text-slate-500">Campaign Performance · {campaign.offer}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Metric icon={Target} label="Targeted" value={formatNumber(campaign.targeted ?? 400)} />
        <Metric icon={Send} label="Reached" value={formatNumber(campaign.reached ?? Math.round((result?.actualConversions ?? 0) / 0.178))} />
        <Metric icon={Users} label="Conversions" value={formatNumber(result?.actualConversions ?? 0)} />
        <Metric icon={IndianRupee} label="Revenue" value={formatINR(result?.actualRevenue ?? 0)} accent="text-emerald-600" />
        <Metric icon={TrendingUp} label="Actual ROI" value={`${result?.actualROI.toFixed(2) ?? '—'}×`} accent="text-brand-600" />
      </div>

      {/* Learning loop: prediction vs actual */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-800 dark:text-white mb-4">AI Prediction vs Actual</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xs text-slate-500">Predicted ROI</div>
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{campaign.expectedROI.toFixed(2)}×</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500">Actual ROI</div>
            <div className="text-2xl font-bold text-emerald-600">{result?.actualROI.toFixed(2) ?? '—'}×</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500">Prediction Error</div>
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{result?.predictionError.toFixed(1) ?? '—'}%</div>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-emerald-500"
            style={{ width: `${Math.min(100, (result?.actualROI ?? 0) / 5 * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500 text-center">
          The Learning Agent records this outcome to improve future recommendations.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 dark:text-white">{value}</span>
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent }: { icon: typeof Target; label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <Icon className={`w-4 h-4 mb-2 ${accent ?? 'text-slate-400'}`} />
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${accent ?? 'text-slate-800 dark:text-white'}`}>{value}</div>
    </div>
  );
}
