import { AgentName } from '@commercepilot/shared';
import { BaseAgent, AgentContext, AgentResult } from './base.js';

export class CustomerAgent extends BaseAgent {
  readonly name = AgentName.CUSTOMER;
  readonly description = 'Customer segmentation, churn prediction, customer value, customer targeting.';
  protected readonly allowedTools = [
    'get_customer',
    'get_customer_segments',
    'calculate_churn_risk',
    'get_high_value_customers',
    'get_at_risk_customers',
  ];

  protected async execute(
    _task: string,
    input: Record<string, unknown>,
    ctx: AgentContext,
  ): Promise<{ summary: string; data: Record<string, unknown>; toolCalls: AgentResult['toolCalls'] }> {
    const toolCalls: AgentResult['toolCalls'] = [];
    const limit = Number(input.limit ?? 100);

    // Segment summaries
    const segments = await this.callTool('get_customer_segments', { merchantId: ctx.merchantId }, ctx);
    toolCalls.push({ toolName: 'get_customer_segments', input: {}, output: segments.output, success: segments.success, durationMs: segments.durationMs });

    // At-risk customers (churn >= 70)
    const atRisk = await this.callTool('calculate_churn_risk', { merchantId: ctx.merchantId, minChurnScore: 70, limit }, ctx);
    toolCalls.push({ toolName: 'calculate_churn_risk', input: { minChurnScore: 70, limit }, output: atRisk.output, success: atRisk.success, durationMs: atRisk.durationMs });

    // High-value customers
    const highValue = await this.callTool('get_high_value_customers', { merchantId: ctx.merchantId, minSpend: 15000, limit }, ctx);
    toolCalls.push({ toolName: 'get_high_value_customers', input: { minSpend: 15000, limit }, output: highValue.output, success: highValue.success, durationMs: highValue.durationMs });

    const segmentList = (segments.output.segments ?? []) as { segment: string; count: number }[];
    const atRiskList = (atRisk.output.churnRiskCustomers ?? []) as { customerName: string; churnProbability: number }[];
    const highValueList = (highValue.output.customers ?? []) as { externalId: string; totalSpend: number }[];

    const summary =
      `Analyzed customer base across ${segmentList.length} segments. ` +
      `Found ${atRiskList.length.toLocaleString()} customers at churn risk (score >= 70) and ${highValueList.length.toLocaleString()} high-value customers.`;

    return {
      summary,
      data: {
        segments: segmentList,
        atRiskCustomers: atRiskList,
        highValueCustomers: highValueList,
      },
      toolCalls,
    };
  }
}
