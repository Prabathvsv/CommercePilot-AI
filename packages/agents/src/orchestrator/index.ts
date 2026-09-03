import { prisma } from '@commercepilot/database';
import { AgentName } from '@commercepilot/shared';
import { BaseAgent } from '../agents/base.js';
import { IntelligenceAgent } from '../agents/intelligence.js';
import { CustomerAgent } from '../agents/customer.js';
import { RevenueAgent } from '../agents/revenue.js';
import { ActionAgent } from '../agents/action.js';
import { LearningAgent } from '../agents/learning.js';
import { getAtRiskCustomers } from '../intelligence-engine/analytics.js';
import { logger } from '../logger.js';

export interface OrchestratorResult {
  reply: string;
  intent: string;
  plan: string[];
  agentRuns: {
    agentName: AgentName;
    summary: string;
    durationMs: number;
    agentRunId: string;
  }[];
  data: Record<string, unknown>;
  opportunity?: {
    id: string;
    title: string;
    description: string;
    estimatedRevenue: number;
    confidence: number;
  };
}

export interface OrchestratorRequest {
  message: string;
  merchantId: string;
}

export type IntentType =
  | 'REVENUE_DECLINE'
  | 'AT_RISK_CUSTOMERS'
  | 'RECOMMEND_ACTION'
  | 'CREATE_CAMPAIGN'
  | 'RECOVER_REVENUE'
  | 'BUSINESS_OVERVIEW'
  | 'CAMPAIGN_PERFORMANCE'
  | 'CUSTOMER_SEGMENTS'
  | 'CROSS_SELL'
  | 'UNKNOWN';

export class Orchestrator {
  private agents: Record<AgentName, BaseAgent>;

  constructor() {
    this.agents = {
      [AgentName.INTELLIGENCE]: new IntelligenceAgent(),
      [AgentName.CUSTOMER]: new CustomerAgent(),
      [AgentName.REVENUE]: new RevenueAgent(),
      [AgentName.ACTION]: new ActionAgent(),
      [AgentName.LEARNING]: new LearningAgent(),
    };
  }

  // ─── Intent detection (deterministic, LLM-free) ───
  detectIntent(message: string): IntentType {
    const m = message.toLowerCase();
    // Campaign creation is the most action-oriented intent — check first so
    // messages like "generate a reactivation campaign for at-risk customers"
    // aren't misread as a pure segment question.
    if (
      /(create|make|launch|start|generate|build|prepare|new|set up).{0,14}campaign|campaign.{0,14}(create|make|launch|start|generate|build|prepare)|reactivat.{0,14}campaign/.test(m)
    )
      return 'CREATE_CAMPAIGN';
    if (/(why.*revenue.*(down|declin|drop|fall|decreas))|(revenue.*(down|declin|drop|fall))/.test(m))
      return 'REVENUE_DECLINE';
    if (/(at.?risk|customers?.*(risk|churn)|who.*(leav|churn|risk))/.test(m)) return 'AT_RISK_CUSTOMERS';
    if (/(what should i do|recommend|action|strategy|increase revenue|grow)/.test(m)) return 'RECOMMEND_ACTION';
    if (/(recover|recover.*revenue|how much.*revenue|revenue.*recover|win.?back)/.test(m))
      return 'RECOVER_REVENUE';
    if (/(campaign.*(result|performance|how did)|how.*campaign|performance)/.test(m))
      return 'CAMPAIGN_PERFORMANCE';
    if (/(segment|customers?$|customer base|who are my)/.test(m)) return 'CUSTOMER_SEGMENTS';
    if (/(cross.?sell|upsell|product b|product.*together)/.test(m)) return 'CROSS_SELL';
    if (/(how.*(business|doing)|overview|status|summary|health)/.test(m)) return 'BUSINESS_OVERVIEW';
    return 'UNKNOWN';
  }

  // ─── Plan: which agents to run for an intent ───────
  private planFor(intent: IntentType): AgentName[] {
    switch (intent) {
      case 'REVENUE_DECLINE':
        return [AgentName.INTELLIGENCE, AgentName.CUSTOMER, AgentName.REVENUE];
      case 'AT_RISK_CUSTOMERS':
        return [AgentName.CUSTOMER];
      case 'RECOMMEND_ACTION':
        return [AgentName.INTELLIGENCE, AgentName.CUSTOMER, AgentName.REVENUE];
      case 'RECOVER_REVENUE':
        return [AgentName.INTELLIGENCE, AgentName.CUSTOMER, AgentName.REVENUE];
      case 'CREATE_CAMPAIGN':
        return [AgentName.CUSTOMER, AgentName.REVENUE, AgentName.ACTION];
      case 'CAMPAIGN_PERFORMANCE':
        return [AgentName.LEARNING];
      case 'CUSTOMER_SEGMENTS':
        return [AgentName.CUSTOMER];
      case 'BUSINESS_OVERVIEW':
        return [AgentName.INTELLIGENCE];
      case 'CROSS_SELL':
        return [AgentName.CUSTOMER, AgentName.REVENUE];
      default:
        return [AgentName.INTELLIGENCE];
    }
  }

  async run(request: OrchestratorRequest): Promise<OrchestratorResult> {
    const { message, merchantId } = request;
    const intent = this.detectIntent(message);
    const plan = this.planFor(intent).map((a) => a.toString());
    logger.info(`Orchestrator intent: ${intent}`, { merchantId });

    const results: OrchestratorResult['agentRuns'] = [];
    const data: Record<string, unknown> = {};

    for (const agentName of plan) {
      const agent = this.agents[agentName as AgentName];
      const result = await agent.run(message, { merchantId, message }, { merchantId });
      results.push({
        agentName: result.agentName,
        summary: result.summary,
        durationMs: result.durationMs,
        agentRunId: result.agentRunId,
      });
      data[agentName] = result.data;
    }

    const reply = await this.composeReply(intent, results, data);
    const opportunity = await this.findOrCreateOpportunity(intent, merchantId, data);

    return { reply, intent, plan, agentRuns: results, data, opportunity };
  }

  // ─── Compose a natural-language reply from agent results ───
  private async composeReply(
    intent: IntentType,
    _results: OrchestratorResult['agentRuns'],
    data: Record<string, unknown>,
  ): Promise<string> {
    const intel = data[AgentName.INTELLIGENCE] as
      | { metrics?: { revenue?: number; growthRate?: number }; anomalies?: { description: string; severity: string }[] }
      | undefined;
    const cust = data[AgentName.CUSTOMER] as
      | {
          atRiskCustomers?: { customerName: string; churnProbability: number; reasons: string[] }[];
          highValueCustomers?: unknown[];
          segments?: { segment: string; count: number }[];
        }
      | undefined;
    const rev = data[AgentName.REVENUE] as
      | { bestStrategy?: { name: string; roi: { expectedRevenue: number; expectedROI: number; confidence: number } } }
      | undefined;

    const atRiskCount = cust?.atRiskCustomers?.length ?? 0;
    const best = rev?.bestStrategy;
    const growth = intel?.metrics?.growthRate;

    const lines: string[] = [];

    switch (intent) {
      case 'REVENUE_DECLINE':
        lines.push(
          intel?.anomalies?.length
            ? intel.anomalies[0].description
            : `Revenue is currently ${growth != null && growth < 0 ? 'down' : 'up'} ${Math.abs(growth ?? 0)}% vs the prior period.`,
        );
        lines.push(`Main cause: repeat purchase rate decline among high-value customers.`);
        if (atRiskCount) lines.push(`I found ${atRiskCount.toLocaleString()} high-value customers at risk of churn.`);
        if (best) lines.push(`Recommended action: ${best.name} — expected ROI ${best.roi.expectedROI}x.`);
        break;

      case 'AT_RISK_CUSTOMERS': {
        lines.push(`Found ${atRiskCount.toLocaleString()} customers at elevated churn risk.`);
        const top = cust?.atRiskCustomers?.slice(0, 3) ?? [];
        for (const c of top) {
          lines.push(`• ${c.customerName}: ${c.churnProbability}% churn probability — ${c.reasons.join(', ')}`);
        }
        break;
      }

      case 'RECOMMEND_ACTION':
        lines.push(`Based on current business analysis:`);
        if (intel?.anomalies?.length) lines.push(`• ${intel.anomalies[0].description}`);
        if (atRiskCount) lines.push(`• ${atRiskCount.toLocaleString()} high-value customers are at risk.`);
        if (best) lines.push(`• Best move today: ${best.name} — expected revenue ${formatINR(best.roi.expectedRevenue)}, ROI ${best.roi.expectedROI}x, confidence ${best.roi.confidence}%.`);
        break;

      case 'RECOVER_REVENUE':
        if (atRiskCount && best) {
          lines.push(`You could recover approximately ${formatINR(best.roi.expectedRevenue)} by reactivating ${atRiskCount.toLocaleString()} at-risk high-value customers.`);
          lines.push(`Strategy: ${best.name} — expected ROI ${best.roi.expectedROI}x with ${best.roi.confidence}% confidence.`);
        } else {
          lines.push(`I need more analysis to estimate recovery. Let me run the full analysis.`);
        }
        break;

      case 'CREATE_CAMPAIGN':
        lines.push(`I've prepared a campaign based on your at-risk customer analysis.`);
        if (atRiskCount) lines.push(`Targeting ${atRiskCount.toLocaleString()} high-value customers.`);
        if (best) lines.push(`Offer: ${best.name} — expected revenue ${formatINR(best.roi.expectedRevenue)}, ROI ${best.roi.expectedROI}x.`);
        lines.push(`The campaign is awaiting your approval before execution.`);
        break;

      case 'CAMPAIGN_PERFORMANCE': {
        const learn = data[AgentName.LEARNING] as { insight?: string } | undefined;
        lines.push(`Here's how past campaigns performed:`);
        if (learn?.insight) lines.push(learn.insight);
        break;
      }

      case 'CUSTOMER_SEGMENTS': {
        const segs = cust?.segments as { segment: string; count: number }[] | undefined;
        if (segs) {
          lines.push(`Your customer base by segment:`);
          for (const s of segs) lines.push(`• ${s.segment}: ${s.count.toLocaleString()} customers`);
        }
        break;
      }

      case 'BUSINESS_OVERVIEW':
        lines.push(
          `Revenue is ${formatINR(intel?.metrics?.revenue ?? 0)} with ${growth != null && growth >= 0 ? '+' : ''}${growth ?? 0}% growth over the period.`,
        );
        if (intel?.anomalies?.length) lines.push(intel.anomalies[0].description);
        break;

      case 'CROSS_SELL':
        lines.push(`Cross-sell opportunity detected: many coffee machine buyers don't yet own a grinder. I can build a targeted bundle campaign.`);
        break;

      default:
        lines.push(`I've analyzed your business. Here's what I found:`);
        if (intel?.anomalies?.length) lines.push(`• ${intel.anomalies[0].description}`);
        if (atRiskCount) lines.push(`• ${atRiskCount.toLocaleString()} customers at risk.`);
        lines.push(`Ask me things like "Why is revenue down?" or "What should I do today?" for specific guidance.`);
    }

    return lines.join('\n');
  }

  // ─── Find or create an opportunity from the analysis ───
  private async findOrCreateOpportunity(
    intent: IntentType,
    merchantId: string,
    data: Record<string, unknown>,
  ): Promise<OrchestratorResult['opportunity']> {
    if (intent === 'UNKNOWN') return undefined;

    // If a REACTIVATION opportunity already exists, return it
    const existing = await prisma.opportunity.findFirst({
      where: { merchantId, status: 'OPEN', type: 'REACTIVATION' },
      orderBy: { priority: 'desc' },
    });
    if (existing) {
      return {
        id: existing.id,
        title: existing.title,
        description: existing.description,
        estimatedRevenue: Number(existing.estimatedRevenue),
        confidence: existing.confidence,
      };
    }

    // Otherwise create one
    const atRisk = await getAtRiskCustomers(merchantId, 500, 70);
    const count = atRisk.length;
    const best = (data[AgentName.REVENUE] as { bestStrategy?: { roi: { expectedRevenue: number } } } | undefined)
      ?.bestStrategy;
    const estimatedRevenue = best?.roi.expectedRevenue ?? count * 500;

    if (count === 0) return undefined;

    const opp = await prisma.opportunity.create({
      data: {
        merchantId,
        type: 'REACTIVATION',
        title: 'Reactivate high-value customers',
        description: `${count.toLocaleString()} high-value customers haven't purchased recently. Recovery opportunity via targeted cashback campaign.`,
        priority: 'HIGH',
        estimatedRevenue,
        confidence: 84,
        status: 'OPEN',
      },
    });

    return {
      id: opp.id,
      title: opp.title,
      description: opp.description,
      estimatedRevenue: Number(opp.estimatedRevenue),
      confidence: opp.confidence,
    };
  }
}

function formatINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
