import { AgentName } from '@commercepilot/shared';
import { BaseAgent, AgentContext, AgentResult } from './base.js';

export class RevenueAgent extends BaseAgent {
  readonly name = AgentName.REVENUE;
  readonly description = 'Offer generation, campaign strategy, revenue forecasting, ROI estimation.';
  protected readonly allowedTools = [
    'generate_offer',
    'estimate_revenue',
    'calculate_campaign_roi',
    'compare_campaign_strategies',
  ];

  protected async execute(
    _task: string,
    input: Record<string, unknown>,
    ctx: AgentContext,
  ): Promise<{ summary: string; data: Record<string, unknown>; toolCalls: AgentResult['toolCalls'] }> {
    const toolCalls: AgentResult['toolCalls'] = [];
    const targetCount = Number(input.targetCount ?? 400);

    // Compare strategies to find the best
    const strategies = await this.callTool('compare_campaign_strategies', { merchantId: ctx.merchantId, targetCount }, ctx);
    toolCalls.push({ toolName: 'compare_campaign_strategies', input: { targetCount }, output: strategies.output, success: strategies.success, durationMs: strategies.durationMs });

    // Best strategy ROI
    const strategyList = (strategies.output.strategies ?? []) as {
      name: string;
      roi: { expectedRevenue: number; campaignCost: number; expectedROI: number; confidence: number; conversionRate: number };
    }[];
    const best = strategyList[0];

    const strategySummary = strategyList.map((s) => s.name).join(', ');
    const summary = best
      ? `Compared strategies: ${strategySummary}. Best: ${best.name} with expected ROI ${best.roi.expectedROI}x, expected revenue ${formatINR(best.roi.expectedRevenue)}.`
      : 'No strategies generated.';

    return {
      summary,
      data: {
        strategies: strategyList,
        bestStrategy: best ?? null,
      },
      toolCalls,
    };
  }
}

function formatINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
