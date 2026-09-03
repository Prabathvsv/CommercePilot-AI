import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@commercepilot/database';
import { Orchestrator } from '@commercepilot/agents';
import { simulateCampaign, checkPolicy } from '@commercepilot/agents';
import { executeApprovedCampaign } from '@commercepilot/agents';

/**
 * THE KEY DEMO TEST — the full agentic loop:
 * create merchant → seed transactions → detect revenue decline →
 * identify at-risk customers → generate opportunity → generate campaign →
 * approve → execute → results → compare prediction (learning loop).
 */
describe('E2E — Full agentic growth loop', () => {
  let merchantId: string;
  let orchestrator: Orchestrator;

  beforeAll(async () => {
    const email = `e2e-${Date.now()}@test.com`;
    const m = await prisma.merchant.create({
      data: { name: 'E2E', email, passwordHash: 'x', businessName: 'E2E Shop', industry: 'Retail' },
    });
    merchantId = m.id;
    orchestrator = new Orchestrator();

    // Seed a mix of customers: healthy + at-risk high-value
    const customers = await prisma.customer.createMany({
      data: Array.from({ length: 20 }, (_, i) => ({
        merchantId,
        externalId: `E2E-${i}`,
        name: `Customer ${i}`,
        segment: i < 12 ? 'AT_RISK' : 'VIP',
        totalSpend: i < 12 ? 18000 + i * 500 : 40000 + i * 1000,
        totalOrders: i < 12 ? 4 + i : 25,
        churnScore: i < 12 ? 75 + i : 8,
      })),
    });
    expect(customers.count).toBe(20);

    // Seed transactions, with recent decline pattern
    const now = Date.now();
    const txns = [];
    for (let i = 0; i < 40; i++) {
      const older = i < 30; // 30 healthy older txns, 10 recent lower-volume
      txns.push({
        merchantId,
        customerId: null,
        amount: older ? 3000 + i * 10 : 2000,
        status: 'SUCCESS',
        paymentMethod: 'UPI',
        createdAt: new Date(now - (older ? 60 : 3) * 86400000),
      });
    }
    await prisma.transaction.createMany({ data: txns });
  });

  it('step 1 — detects revenue decline via Intelligence Agent', async () => {
    const result = await orchestrator.run({
      message: 'Why is revenue declining?',
      merchantId,
    });
    expect(result.intent).toBe('REVENUE_DECLINE');
    expect(result.agentRuns.map((r) => r.agentName)).toContain('IntelligenceAgent');
    expect(result.reply).toMatch(/revenue/i);
  });

  it('step 2 — identifies at-risk customers via Customer Agent', async () => {
    const result = await orchestrator.run({ message: 'Which customers are at risk?', merchantId });
    expect(result.intent).toBe('AT_RISK_CUSTOMERS');
    expect(result.agentRuns.map((r) => r.agentName)).toContain('CustomerAgent');
    const atRisk = result.data.CustomerAgent?.atRiskCustomers as { churnProbability: number }[] | undefined;
    expect(Array.isArray(atRisk)).toBe(true);
  });

  it('step 3 — generates a recommendation via Revenue Agent with ROI', async () => {
    const result = await orchestrator.run({
      message: 'What should I do today to increase revenue?',
      merchantId,
    });
    expect(result.agentRuns.map((r) => r.agentName)).toContain('RevenueAgent');
    const best = (result.data.RevenueAgent as { bestStrategy?: { roi: { expectedROI: number } } })?.bestStrategy;
    expect(best?.roi.expectedROI).toBeGreaterThan(1);
  });

  it('step 4 — creates a campaign in PENDING_APPROVAL (human-in-the-loop)', async () => {
    const roi = simulateCampaign({
      merchantId,
      targetCount: 12,
      offer: { type: 'CASHBACK', value: 200 },
    });
    const policy = checkPolicy({ budget: roi.campaignCost, targetSize: 12 });
    const campaign = await prisma.campaign.create({
      data: {
        merchantId,
        name: 'E2E Winback',
        description: 'Test campaign',
        offer: '₹200 cashback',
        targetSegment: 'AT_RISK',
        budget: roi.campaignCost,
        expectedRevenue: roi.expectedRevenue,
        expectedROI: roi.expectedROI,
        status: 'PENDING_APPROVAL',
      },
    });
    expect(campaign.status).toBe('PENDING_APPROVAL');
    expect(policy.requiresApproval).toBe(false); // small campaign

    // Step 5 — merchant approves
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'APPROVED' } });

    // Step 6 — execute (mock commerce API)
    const outcome = await executeApprovedCampaign(campaign.id, merchantId);
    expect(outcome.reached).toBeGreaterThan(0);
    expect(outcome.conversions).toBeGreaterThan(0);
    expect(outcome.actualROI).toBeGreaterThan(0);

    // Step 7 — results + prediction comparison (learning loop)
    const full = await prisma.campaign.findUnique({ where: { id: campaign.id }, include: { results: true } });
    const result = full?.results[0];
    expect(result).toBeTruthy();
    expect(Number(result?.predictionError)).toBeGreaterThanOrEqual(0);
    expect(Number(result?.predictionError)).toBeLessThan(50); // prediction within 50%
    expect(Number(result?.actualROI)).toBeGreaterThan(0);
  });

  it('records agent runs and tool calls for observability', async () => {
    const runs = await prisma.agentRun.findMany({ where: { merchantId }, include: { toolCalls: true } });
    expect(runs.length).toBeGreaterThan(0);
    const withTools = runs.find((r) => r.toolCalls.length > 0);
    expect(withTools).toBeTruthy();
  });
});
