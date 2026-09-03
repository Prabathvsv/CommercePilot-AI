import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Pencil, Loader2, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { generateCampaignPlan } from '../services/ai';
import { createCampaign } from '../services/campaigns';
import { formatINR } from '../utils/format';

// Mirror the backend guardrails (@commercepilot/shared GUARDRAILS)
const BUDGET_LIMIT = 50000;
const DISCOUNT_LIMIT = 30;
const TARGET_LIMIT = 10000;

interface Plan {
  name: string;
  description: string;
  offer: string;
  targetSegment: string;
  targetCount: number;
  budget: number;
  expectedRevenue: number;
  expectedROI: number;
  duration: number;
  confidence: number;
}

export default function CampaignBuilder() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [editing, setEditing] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const data = await generateCampaignPlan();
      setPlan(data.plan);
    } finally {
      setGenerating(false);
    }
  }

  async function approve() {
    if (!plan) return;
    setApproving(true);
    try {
      const { campaign } = await createCampaign({
        name: plan.name,
        description: plan.description,
        offer: plan.offer,
        targetSegment: plan.targetSegment,
        targetCount: plan.targetCount,
        budget: plan.budget,
        expectedRevenue: plan.expectedRevenue,
        expectedROI: plan.expectedROI,
        confidence: plan.confidence,
        opportunityId: params.get('opportunityId') ?? undefined,
      });
      navigate(`/campaigns/${campaign.id}/results`);
    } finally {
      setApproving(false);
    }
  }

  const guardrails = plan ? checkGuardrails(plan) : { requiresApproval: false, reasons: [] as string[] };

  if (!plan) {
    return (
      <div className="max-w-xl mx-auto text-center py-24 space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI-Generated Campaign</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          The AI will analyze your at-risk high-value customers, pick the best incentive, and estimate ROI for a reactivation campaign.
        </p>
        <button
          onClick={generate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Generating...' : 'Generate Campaign'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Campaign Builder</h2>
        <button
          onClick={() => setEditing((e) => !e)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <Pencil className="w-3.5 h-3.5" /> {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">AI Generated Campaign</span>
        </div>

        <Field label="Campaign Name" value={plan.name} editing={editing} onChange={(v) => setPlan({ ...plan, name: v })} />
        <Field label="Target Audience" value={`${plan.targetCount.toLocaleString()} high-value ${plan.targetSegment.toLowerCase()} customers`} editing={false} />
        <Field label="Offer" value={plan.offer} editing={editing} onChange={(v) => setPlan({ ...plan, offer: v })} />
        <Field label="Duration" value={`${plan.duration} days`} editing={false} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
          <Metric label="Expected Revenue" value={formatINR(plan.expectedRevenue)} accent="text-emerald-600" />
          <Metric label="Budget" value={formatINR(plan.budget)} />
          <Metric label="Expected ROI" value={`${plan.expectedROI.toFixed(2)}×`} accent="text-brand-600" />
          <Metric label="Confidence" value={`${plan.confidence}%`} />
        </div>
      </div>

      {/* Human approval step */}
      <div className="rounded-xl border-2 border-amber-300 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-900/20 p-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <span className="text-sm font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Human Approval Required</span>
        </div>
        <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
          The AI has drafted this campaign. The Action Agent cannot execute it automatically — a merchant must approve it first.
        </p>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <ApprovalRow label="Campaign" value={plan.name} />
          <ApprovalRow label="Target" value={`${plan.targetCount.toLocaleString()} ${plan.targetSegment.toLowerCase()} customers`} />
          <ApprovalRow label="Budget" value={formatINR(plan.budget)} />
          <ApprovalRow label="Expected ROI" value={`${plan.expectedROI.toFixed(2)}×`} />
          <ApprovalRow label="Expected Revenue" value={formatINR(plan.expectedRevenue)} accent />
          <ApprovalRow label="Offer" value={plan.offer} />
          <ApprovalRow label="Duration" value={`${plan.duration} days`} />
          <ApprovalRow label="Confidence" value={`${plan.confidence}%`} />
        </div>

        {/* Guardrail reasons */}
        {guardrails.reasons.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-400/60 bg-amber-100/60 dark:bg-amber-900/30 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4" />
              Why approval is required
            </div>
            <ul className="mt-1.5 space-y-1 text-xs text-amber-800/90 dark:text-amber-200/90">
              {guardrails.reasons.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            onClick={() => setPlan(null)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-red-300 hover:text-red-600"
          >
            <X className="w-4 h-4" /> Reject
          </button>
          <button
            onClick={approve}
            disabled={approving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {approving ? 'Submitting...' : 'Approve & Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange?: (v: string) => void }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      {editing && onChange ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-1.5 text-sm"
        />
      ) : (
        <div className="text-sm font-medium text-slate-800 dark:text-white">{value}</div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${accent ?? 'text-slate-800 dark:text-white'}`}>{value}</div>
    </div>
  );
}

function ApprovalRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-white/70 dark:bg-slate-900/40 border border-amber-200/60 dark:border-amber-700/40 px-3 py-2">
      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{label}</div>
      <div className={`text-sm font-medium break-words ${accent ? 'text-emerald-600' : 'text-slate-800 dark:text-white'}`}>{value}</div>
    </div>
  );
}

function checkGuardrails(plan: Plan): { requiresApproval: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (plan.budget > BUDGET_LIMIT) {
    reasons.push(`Campaign budget ${formatINR(plan.budget)} exceeds the autonomous spending threshold of ${formatINR(BUDGET_LIMIT)}.`);
  }
  const disc = discountPercent(plan.offer);
  if (disc > DISCOUNT_LIMIT) {
    reasons.push(`Discount of ${disc}% exceeds the maximum autonomous discount of ${DISCOUNT_LIMIT}%.`);
  }
  if (plan.targetCount > TARGET_LIMIT) {
    reasons.push(`Targeting ${plan.targetCount.toLocaleString()} customers exceeds the autonomous audience threshold of ${TARGET_LIMIT.toLocaleString()}.`);
  }
  return { requiresApproval: reasons.length > 0, reasons };
}

function discountPercent(offer: string): number {
  const m = /(\d+(?:\.\d+)?)\s*%/.exec(offer);
  return m ? Number(m[1]) : 0;
}
