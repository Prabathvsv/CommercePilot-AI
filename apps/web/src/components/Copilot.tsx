import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, Star, ArrowRight } from 'lucide-react';
import { chatCopilot, CopilotResult, ToolCall } from '../services/ai';
import { fetchOpportunities, recommendOpportunity, Opportunity, Strategy } from '../services/opportunities';
import { formatINR } from '../utils/format';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  opportunity?: CopilotResult['opportunity'];
  opportunities?: Opportunity[];
  strategies?: Strategy[];
  topOpportunityId?: string;
}

const SUGGESTIONS = [
  'Why is revenue declining?',
  'Which customers are at risk?',
  'What can I do today to increase revenue?',
  'Create a campaign for high-value customers.',
  'How much revenue can we recover?',
];

const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const GROWTH_RE = /what should i do|what can i do|increase revenue|recommend|grow|opportunit|recover|boost revenue|improve/i;
const AFFIRMATIVE_RE = /^(yes|yeah|sure|go ahead|ok|okay|please|evaluate|do it|yes please)$/i;

export default function Copilot({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function evaluateStrategies(oppId: string) {
    setLoading(true);
    try {
      const rec = await recommendOpportunity(oppId);
      const best = rec.bestStrategy;
      const bestLabel = best?.name.replace(/^Strategy [A-C]: /, '') ?? 'the top strategy';
      const content = best
        ? `I compared three strategies and ranked them by expected ROI.\n\n⭐ Best: ${bestLabel} — ${best.roi.expectedROI.toFixed(2)}× ROI · ${best.roi.confidence}% confidence · expected ${formatINR(best.roi.expectedRevenue)}.\n\nWant me to build this into a campaign?`
        : 'Here are the strategies I evaluated.';
      setMessages((m) => [...m, { role: 'assistant', content, strategies: rec.strategies }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Sorry, I couldn’t evaluate strategies right now. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function send(text: string) {
    if (!text.trim() || loading) return;

    // "Yes" follow-up → evaluate strategies for the last offered opportunity
    if (AFFIRMATIVE_RE.test(text.trim())) {
      const last = [...messages].reverse().find((m) => m.opportunities && !m.strategies);
      setMessages((m) => [...m, { role: 'user', content: text }]);
      if (last?.topOpportunityId) {
        await evaluateStrategies(last.topOpportunityId);
        return;
      }
    }

    const userMsg: Message = { role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await chatCopilot(text);
      const assistantMsg: Message = {
        role: 'assistant',
        content: result.reply,
        toolCalls: flattenToolCalls(result.agentRuns),
        opportunity: result.opportunity,
      };

      // For growth questions, attach the live open opportunities so the demo
      // shows the AI surfacing options + asking to evaluate strategies.
      if (GROWTH_RE.test(text)) {
        try {
          const opps = await fetchOpportunities();
          const open = opps
            .filter((o) => o.status === 'OPEN')
            .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
          if (open.length) {
            assistantMsg.opportunities = open;
            assistantMsg.topOpportunityId = open[0].id;
          }
        } catch {
          /* opportunities are a nice-to-have */
        }
      }

      setMessages((m) => [...m, assistantMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Sorry, I ran into an error analyzing your business. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function flattenToolCalls(runs: CopilotResult['agentRuns']): ToolCall[] {
    return runs.map((r) => ({
      toolName: r.agentName,
      input: { task: r.summary },
      output: {},
      success: true,
      durationMs: r.durationMs,
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-4 sm:p-6 pointer-events-none">
      <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={onClose} />
      <div className="relative w-full sm:w-[440px] h-[80vh] sm:h-[640px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-brand-600">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold">CommercePilot AI</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-2">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Hi! I'm your growth copilot. Ask me anything about your business.
              </div>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full text-left text-sm px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`max-w-[92%] px-3 py-2.5 rounded-2xl text-sm whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                }`}
              >
                {msg.content}

                {/* Agent steps */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-600 space-y-1">
                    {msg.toolCalls.map((tc, j) => (
                      <div key={j} className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        <span className="text-emerald-500">✓</span> {tc.toolName} · {tc.durationMs}ms
                      </div>
                    ))}
                  </div>
                )}

                {/* Surfaced opportunities */}
                {msg.opportunities && msg.opportunities.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-600 space-y-1.5">
                    {msg.opportunities.slice(0, 3).map((op) => (
                      <div key={op.id} className="flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{op.title}</span>
                        <span className="shrink-0 text-slate-500">
                          {formatINR(op.estimatedRevenue)} · {op.confidence}%
                        </span>
                      </div>
                    ))}
                    {!msg.strategies && msg.topOpportunityId && (
                      <button
                        onClick={() => evaluateStrategies(msg.topOpportunityId!)}
                        disabled={loading}
                        className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        Yes — evaluate strategies <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Strategy comparison */}
                {msg.strategies && msg.strategies.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-600 space-y-1.5">
                    {msg.strategies.map((s, k) => (
                      <div
                        key={s.name}
                        className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs ${
                          k === 0
                            ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30'
                            : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
                          {k === 0 && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                          {s.name.replace(/^Strategy [A-C]: /, '')}
                        </span>
                        <span className={`font-semibold ${k === 0 ? 'text-brand-600' : 'text-slate-600'}`}>
                          {s.expectedROI.toFixed(2)}×
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 text-sm text-slate-500 dark:text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing with agents...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your business..."
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg bg-brand-600 text-white p-2 hover:bg-brand-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
