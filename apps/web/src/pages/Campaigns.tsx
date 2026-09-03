import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, X, Save, Loader2, Sparkles } from 'lucide-react';
import { fetchCampaigns, updateCampaign, Campaign } from '../services/campaigns';
import { formatINR } from '../utils/format';

const STATUS_STYLES: Record<string, string> = {
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  APPROVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  RUNNING: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  COMPLETED: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  PAUSED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
};

const STATUS_OPTIONS = ['PENDING_APPROVAL', 'APPROVED', 'RUNNING', 'COMPLETED', 'DRAFT', 'PAUSED'];

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setCampaigns(await fetchCampaigns());
  }

  useEffect(() => {
    (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await updateCampaign(editing.id, {
        name: editing.name,
        description: editing.description,
        offer: editing.offer,
        targetSegment: editing.targetSegment,
        budget: editing.budget,
        expectedRevenue: editing.expectedRevenue,
        expectedROI: editing.expectedROI,
        status: editing.status,
      });
      setEditing(null);
      await load();
    } catch (e) {
      setError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  function patch(field: string, value: string | number) {
    setEditing((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Campaigns</h2>
          <p className="text-sm text-slate-500">All campaigns — edit any of them anytime.</p>
        </div>
        <Link
          to="/campaigns/builder"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700"
        >
          <Sparkles className="w-4 h-4" /> New Campaign
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading campaigns...</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Budget</th>
                  <th className="px-4 py-3 font-medium">Exp. ROI</th>
                  <th className="px-4 py-3 font-medium">Actual ROI</th>
                  <th className="px-4 py-3 font-medium text-right">Edit</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="px-4 py-3">
                      <Link to={`/campaigns/${c.id}/results`} className="font-medium text-slate-800 dark:text-white hover:text-brand-600">
                        {c.name}
                      </Link>
                      <div className="text-xs text-slate-500">{c.offer}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[c.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatINR(c.budget)}</td>
                    <td className="px-4 py-3">{c.expectedROI.toFixed(2)}×</td>
                    <td className={`px-4 py-3 ${c.actualROI != null ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {c.actualROI != null ? `${c.actualROI.toFixed(2)}×` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setError(null);
                          setEditing({ ...c });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-600"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                      No campaigns yet. Generate one from the Campaign Builder.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-white">Edit Campaign</h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <Field label="Name">
                <input
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  value={editing.name}
                  onChange={(e) => patch('name', e.target.value)}
                />
              </Field>
              <Field label="Description">
                <textarea
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  rows={2}
                  value={editing.description}
                  onChange={(e) => patch('description', e.target.value)}
                />
              </Field>
              <Field label="Offer">
                <input
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  value={editing.offer}
                  onChange={(e) => patch('offer', e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Target Segment">
                  <input
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    value={editing.targetSegment}
                    onChange={(e) => patch('targetSegment', e.target.value)}
                  />
                </Field>
                <Field label="Status">
                  <select
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    value={editing.status}
                    onChange={(e) => patch('status', e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Budget (₹)">
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    value={editing.budget}
                    onChange={(e) => patch('budget', Number(e.target.value))}
                  />
                </Field>
                <Field label="Exp. Revenue (₹)">
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    value={editing.expectedRevenue}
                    onChange={(e) => patch('expectedRevenue', Number(e.target.value))}
                  />
                </Field>
                <Field label="Exp. ROI (×)">
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    value={editing.expectedROI}
                    onChange={(e) => patch('expectedROI', Number(e.target.value))}
                  />
                </Field>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
