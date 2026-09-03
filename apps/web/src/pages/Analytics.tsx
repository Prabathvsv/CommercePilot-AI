import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatINR } from '../utils/format';

interface CampaignPerf {
  id: string;
  name: string;
  offer: string;
  status: string;
  expectedROI: number;
  actualROI: number | null;
  predictionError: number | null;
  actualRevenue: number | null;
}

export default function Analytics() {
  const [campaigns, setCampaigns] = useState<CampaignPerf[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/analytics/campaigns');
        setCampaigns(data.data.campaigns);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Campaign Analytics</h2>
        <p className="text-sm text-slate-500">Prediction accuracy and learning-loop outcomes across campaigns.</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading analytics...</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Predicted ROI</th>
                  <th className="px-4 py-3 font-medium">Actual ROI</th>
                  <th className="px-4 py-3 font-medium">Pred. Error</th>
                  <th className="px-4 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 dark:text-white">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.offer}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{c.expectedROI.toFixed(2)}×</td>
                    <td className={`px-4 py-3 font-medium ${c.actualROI != null ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {c.actualROI != null ? `${c.actualROI.toFixed(2)}×` : '—'}
                    </td>
                    <td className={`px-4 py-3 ${c.predictionError != null && c.predictionError < 10 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {c.predictionError != null ? `${c.predictionError.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {c.actualRevenue != null ? formatINR(c.actualRevenue) : '—'}
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">No campaign analytics yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
