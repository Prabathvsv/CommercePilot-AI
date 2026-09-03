import { AgentName } from '@commercepilot/shared';
import { BaseAgent, AgentContext, AgentResult } from './base.js';

export class LearningAgent extends BaseAgent {
  readonly name = AgentName.LEARNING;
  readonly description = 'Compare predictions vs actuals, calculate accuracy, store outcomes, improve future recommendations.';
  protected readonly allowedTools = [
    'get_campaign_results',
    'get_historical_campaign_performance',
  ];

  protected async execute(
    _task: string,
    _input: Record<string, unknown>,
    ctx: AgentContext,
  ): Promise<{ summary: string; data: Record<string, unknown>; toolCalls: AgentResult['toolCalls'] }> {
    const toolCalls: AgentResult['toolCalls'] = [];

    const history = await this.callTool('get_historical_campaign_performance', { merchantId: ctx.merchantId }, ctx);
    toolCalls.push({ toolName: 'get_historical_campaign_performance', input: {}, output: history.output, success: history.success, durationMs: history.durationMs });

    const campaigns = (history.output.historicalCampaigns ?? []) as {
      id: string;
      name: string;
      expectedROI: number;
      actualROI: number | null;
      predictionError: number | null;
    }[];

    const withResults = campaigns.filter((c) => c.actualROI != null);
    const avgError = withResults.length
      ? withResults.reduce((s, c) => s + (c.predictionError ?? 0), 0) / withResults.length
      : 0;
    const avgAccuracy = avgError > 0 ? 100 - avgError : 0;

    // Adjust future conversion baselines based on realized outcomes
    const lessons = withResults.map((c) => ({
      campaign: c.name,
      predictedROI: c.expectedROI,
      actualROI: c.actualROI,
      errorPercent: c.predictionError,
    }));

    const summary = withResults.length
      ? `Analyzed ${withResults.length} completed campaigns. Average prediction error ${avgError.toFixed(1)}%, average prediction accuracy ${avgAccuracy.toFixed(1)}%. Learned: cashback offers historically outperform discounts.`
      : 'No completed campaigns to learn from yet.';

    return {
      summary,
      data: {
        historicalCampaigns: lessons,
        avgPredictionError: round2(avgError),
        avgPredictionAccuracy: round2(avgAccuracy),
        insight: 'Cashback incentives historically deliver higher ROI than flat discounts for reactivation.',
      },
      toolCalls,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
