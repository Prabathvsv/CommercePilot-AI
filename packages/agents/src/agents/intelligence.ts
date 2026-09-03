import { AgentName } from '@commercepilot/shared';
import { BaseAgent, AgentContext, AgentResult } from './base.js';

export class IntelligenceAgent extends BaseAgent {
  readonly name = AgentName.INTELLIGENCE;
  readonly description = 'Revenue analysis, trend detection, anomaly detection, KPI analysis, opportunity discovery.';
  protected readonly allowedTools = [
    'get_revenue_metrics',
    'get_transaction_metrics',
    'detect_revenue_anomalies',
    'get_business_trends',
  ];

  protected async execute(
    _task: string,
    input: Record<string, unknown>,
    ctx: AgentContext,
  ): Promise<{ summary: string; data: Record<string, unknown>; toolCalls: AgentResult['toolCalls'] }> {
    const toolCalls: AgentResult['toolCalls'] = [];
    const periodDays = Number(input.periodDays ?? 30);

    // 1. Revenue metrics
    const metrics = await this.callTool('get_revenue_metrics', { merchantId: ctx.merchantId, periodDays }, ctx);
    toolCalls.push({ toolName: 'get_revenue_metrics', input: { periodDays }, output: metrics.output, success: metrics.success, durationMs: metrics.durationMs });

    // 2. Anomalies
    const anomalies = await this.callTool('detect_revenue_anomalies', { merchantId: ctx.merchantId }, ctx);
    toolCalls.push({ toolName: 'detect_revenue_anomalies', input: {}, output: anomalies.output, success: anomalies.success, durationMs: anomalies.durationMs });

    // 3. Trends
    const trends = await this.callTool('get_business_trends', { merchantId: ctx.merchantId, days: periodDays, granularity: 'week' }, ctx);
    toolCalls.push({ toolName: 'get_business_trends', input: { days: periodDays, granularity: 'week' }, output: trends.output, success: trends.success, durationMs: trends.durationMs });

    const revenue = (metrics.output.revenue ?? 0) as number;
    const growth = (metrics.output.growthRate ?? 0) as number;
    const anomalyList = (anomalies.output.anomalies ?? []) as { description: string; severity: string }[];

    const summary =
      `Analyzed business performance: revenue ${formatINR(revenue)} with ${growth >= 0 ? '+' : ''}${growth}% growth. ` +
      (anomalyList.length
        ? `Detected ${anomalyList.length} anomaly(ies): ${anomalyList.map((a) => a.description).join(' ')}`
        : 'No significant anomalies detected.');

    return {
      summary,
      data: {
        metrics: metrics.output,
        anomalies: anomalyList,
        trends: trends.output.trends,
      },
      toolCalls,
    };
  }
}

function formatINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
