import { prisma } from '@commercepilot/database';
import { AgentName, CampaignStatus } from '@commercepilot/shared';
import { BaseAgent, AgentContext, AgentResult } from './base.js';
import { checkPolicy, simulateExecution } from '../intelligence-engine/roi.js';

export class ActionAgent extends BaseAgent {
  readonly name = AgentName.ACTION;
  readonly description = 'Creating campaigns, scheduling, executing approved campaigns, pausing campaigns.';
  protected readonly allowedTools = ['create_campaign'];

  protected async execute(
    _task: string,
    input: Record<string, unknown>,
    ctx: AgentContext,
  ): Promise<{ summary: string; data: Record<string, unknown>; toolCalls: AgentResult['toolCalls'] }> {
    const toolCalls: AgentResult['toolCalls'] = [];

    const action = String(input.action ?? 'create');
    const budget = Number(input.budget ?? 0);
    const targetCount = Number(input.targetCount ?? 0);

    if (action === 'create') {
      // Validate guardrails before creating
      const policy = checkPolicy({ budget, targetSize: targetCount, discountPercent: Number(input.discountPercent ?? 0) });

      const name = String(input.name ?? 'We Miss You — Reactivation Campaign');
      const offer = String(input.offer ?? '₹200 cashback');

      const campaign = await prisma.campaign.create({
        data: {
          merchantId: ctx.merchantId,
          name,
          description: String(input.description ?? `Campaign for ${targetCount} customers with ${offer}.`),
          offer,
          targetSegment: String(input.targetSegment ?? 'AT_RISK'),
          budget,
          expectedRevenue: Number(input.expectedRevenue ?? 0),
          expectedROI: Number(input.expectedROI ?? 0),
          // Guardrail: if approval required, stay PENDING_APPROVAL; never auto-approve
          status: policy.requiresApproval ? CampaignStatus.PENDING_APPROVAL : CampaignStatus.PENDING_APPROVAL,
        },
      });

      toolCalls.push({
        toolName: 'create_campaign',
        input: { name, offer, targetCount, budget },
        output: { campaignId: campaign.id, status: campaign.status },
        success: true,
        durationMs: 0,
      });

      const guardrailMsg = policy.requiresApproval
        ? `Guardrails triggered: ${policy.reasons.join('; ')}. Campaign created as PENDING_APPROVAL.`
        : 'Campaign created as PENDING_APPROVAL for merchant review.';

      return {
        summary: `Action Agent created campaign "${name}" for ${targetCount.toLocaleString()} customers with ${offer}. ${guardrailMsg}`,
        data: {
          campaignId: campaign.id,
          status: campaign.status,
          policy,
        },
        toolCalls,
      };
    }

    // Execution is handled by explicit approve + execute endpoints (approval layer),
    // not directly by the agent, per the human-in-the-loop design.
    throw new Error('Direct execution by Action Agent is not allowed. Campaigns must be approved by the merchant first.');
  }
}

// Execute an approved campaign via the mock commerce API
export async function executeApprovedCampaign(campaignId: string, merchantId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, merchantId },
  });
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.status !== CampaignStatus.APPROVED && campaign.status !== CampaignStatus.SCHEDULED) {
    throw new Error(`Campaign must be APPROVED before execution (current: ${campaign.status})`);
  }

  const outcome = await simulateExecution({
    merchantId,
    campaignId,
    targetCount: await campaignTargetCount(campaignId, merchantId),
    offer: parseOffer(campaign.offer),
    avgOrderValue: 2600,
    predictedROI: Number(campaign.expectedROI),
  });

  await prisma.$transaction([
    prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.COMPLETED,
        executedAt: new Date(),
        actualRevenue: outcome.revenue,
        actualROI: outcome.actualROI,
      },
    }),
    prisma.campaignResult.create({
      data: {
        campaignId,
        actualRevenue: outcome.revenue,
        actualConversions: outcome.conversions,
        actualCost: outcome.cost,
        actualROI: outcome.actualROI,
        predictionError: computePredictionError(Number(campaign.expectedROI), outcome.actualROI),
      },
    }),
  ]);

  return outcome;
}

async function campaignTargetCount(campaignId: string, merchantId: string): Promise<number> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return 0;
  // Estimate target count from the segment if no explicit targets recorded
  const segCount = await prisma.customer.count({
    where: { merchantId, segment: campaign.targetSegment },
  });
  return segCount || Number(Number(campaign.budget) > 0 ? 400 : 400);
}

function parseOffer(offer: string): { type: 'CASHBACK' | 'DISCOUNT' | 'LOYALTY' | 'FREE_SHIPPING'; value: number } {
  const cashback = offer.match(/₹(\d+)\s*cashback/i);
  if (cashback) return { type: 'CASHBACK', value: Number(cashback[1]) };
  const discount = offer.match(/(\d+)%\s*discount/i);
  if (discount) return { type: 'DISCOUNT', value: Number(discount[1]) };
  if (/loyalty/i.test(offer)) return { type: 'LOYALTY', value: 0 };
  return { type: 'CASHBACK', value: 200 };
}

function computePredictionError(expected: number, actual: number): number {
  if (expected === 0) return 0;
  return Math.round((Math.abs(actual - expected) / expected) * 10000) / 100;
}
