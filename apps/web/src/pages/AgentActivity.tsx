import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, Clock, ChevronDown, ChevronRight, FileJson } from 'lucide-react';
import { fetchAgentRuns } from '../services/ai';

interface ToolCall {
  toolName: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  success: boolean;
  durationMs: number;
}

interface AgentRun {
  id: string;
  agentName: string;
  task: string;
  status: string;
  durationMs: number;
  createdAt: string;
  toolCalls: ToolCall[];
}

const AGENT_ICON: Record<string, string> = {
  Orchestrator: '🎯',
  IntelligenceAgent: '🧠',
  CustomerAgent: '👥',
  RevenueAgent: '💰',
  ActionAgent: '⚡',
  LearningAgent: '📚',
};

const TOOL_LABELS: Record<string, string> = {
  detectRevenueAnomalies: 'Revenue anomaly scan',
  getAtRiskCustomers: 'At-risk customer query',
  compareCampaignStrategies: 'Strategy comparison',
  simulateCampaign: 'Campaign simulation',
  getRevenueMetrics: 'Revenue metrics',
  analyzeCustomerBehavior: 'Customer behavior analysis',
  generateRecommendations: 'Recommendation generation',
  getDashboardData: 'Dashboard data',
};

function formatJson(obj: unknown): string {
  if (!obj) return '{}';
  try {
    const str = JSON.stringify(obj, null, 2);
    return str.length > 300 ? str.slice(0, 300) + '…' : str;
  } catch {
    return String(obj);
  }
}

function extractDecision(toolCalls: ToolCall[]): { offer?: string; roi?: string; confidence?: string } {
  for (const tc of toolCalls) {
    const out = tc.output as Record<string, unknown> | undefined;
    if (!out) continue;
    if (out.expectedROI != null && out.confidence != null) {
      return {
        offer: (out.offer as Record<string, unknown>)?.type as string | undefined,
        roi: String(out.expectedROI),
        confidence: String(out.confidence),
      };
    }
    if (out.bestStrategy) {
      const best = out.bestStrategy as Record<string, unknown>;
      const roi = best.roi as Record<string, unknown> | undefined;
      if (roi) {
        return {
          offer: (best.name as string) ?? undefined,
          roi: roi.expectedROI != null ? String(roi.expectedROI) : undefined,
          confidence: roi.confidence != null ? String(roi.confidence) : undefined,
        };
      }
    }
  }
  return {};
}

export default function AgentActivity() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [jsonView, setJsonView] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setRuns(await fetchAgentRuns(20));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleJson(toolIdx: string) {
    setJsonView((prev) => ({ ...prev, [toolIdx]: !prev[toolIdx] }));
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Agent Activity</h2>
        <p className="text-sm text-slate-500">Observe how agents reason and call tools — full observability.</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading agent runs...</div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const isOpen = expanded === run.id;
            const decision = extractDecision(run.toolCalls);
            const isOrchestrator = run.agentName === 'Orchestrator';
            const agentTools = run.toolCalls.filter((tc) => tc.toolName !== 'orchestrate');

            return (
              <div key={run.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header row — always visible */}
                <button
                  onClick={() => setExpanded(isOpen ? null : run.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30"
                >
                  <span className="text-xl">{AGENT_ICON[run.agentName] ?? '🤖'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 dark:text-white">{run.agentName}</span>
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {run.status}
                      </span>
                      {isOrchestrator && agentTools.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-medium">
                          {agentTools.length} agent{agentTools.length !== 1 ? 's' : ''} invoked
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 truncate">{run.task}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {run.durationMs}ms
                    {run.toolCalls.length > 0 && (
                      <span className="flex items-center gap-0.5">
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        {run.toolCalls.length}
                      </span>
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700">
                    {/* Decision summary */}
                    {(decision.roi || decision.confidence) && (
                      <div className="mt-3 mb-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
                        <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Final decision</div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-emerald-800 dark:text-emerald-200">
                          {decision.offer && <span>Offer: <strong>{decision.offer}</strong></span>}
                          {decision.roi && <span>ROI: <strong>{decision.roi}×</strong></span>}
                          {decision.confidence && <span>Confidence: <strong>{decision.confidence}%</strong></span>}
                        </div>
                      </div>
                    )}

                    {/* Tool calls */}
                    <div className="mt-3 space-y-2">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tool calls</div>
                      {run.toolCalls.map((tc, i) => {
                        const toolKey = `${run.id}-${i}`;
                        const label = TOOL_LABELS[tc.toolName] ?? tc.toolName;
                        const hasInput = tc.input && Object.keys(tc.input).length > 0;
                        const hasOutput = tc.output && Object.keys(tc.output).length > 0;
                        const showJson = jsonView[toolKey];

                        return (
                          <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2 text-sm">
                              <span className={tc.success ? 'text-emerald-500' : 'text-red-500'}>
                                {tc.success ? '✓' : '✗'}
                              </span>
                              <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
                              <span className="text-xs text-slate-400 font-mono">({tc.toolName})</span>
                              <span className="text-xs text-slate-400 ml-auto">{tc.durationMs}ms</span>
                              {(hasInput || hasOutput) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleJson(toolKey); }}
                                  className="ml-1 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                  title={showJson ? 'Hide details' : 'Show input/output'}
                                >
                                  <FileJson className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {showJson && (
                              <div className="px-3 pb-3 space-y-2 bg-slate-50 dark:bg-slate-900/40">
                                {hasInput && (
                                  <div>
                                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Input</div>
                                    <pre className="mt-0.5 text-[11px] font-mono text-slate-600 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                                      {formatJson(tc.input)}
                                    </pre>
                                  </div>
                                )}
                                {hasOutput && (
                                  <div>
                                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Output</div>
                                    <pre className="mt-0.5 text-[11px] font-mono text-slate-600 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                                      {formatJson(tc.output)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {run.toolCalls.length === 0 && (
                        <div className="text-sm text-slate-400">No tool calls recorded.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {runs.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Activity className="w-8 h-8 mx-auto mb-3 opacity-40" />
              No agent runs yet. Ask the Copilot a question to trigger agents.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
