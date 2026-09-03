import { prisma } from '@commercepilot/database';
import {
  getRevenueMetrics,
  getTransactionMetrics,
  detectRevenueAnomalies,
  getRevenueTrends,
  getSegmentSummaries,
  getAtRiskCustomers,
  getHighValueCustomers,
} from '../intelligence-engine/analytics.js';
import {
  simulateCampaign,
  compareCampaignStrategies,
  buildCampaignPlan,
  OfferSpec,
} from '../intelligence-engine/roi.js';
import { AppError } from '../intelligence-engine/errors.js';
import { CustomerSegment } from '@commercepilot/shared';

export interface ToolExecutionContext {
  merchantId: string;
  userId?: string;
}

export type ToolHandler = (
  input: Record<string, unknown>,
  ctx: ToolExecutionContext,
) => Promise<Record<string, unknown>>;

// ─── Tool registry ──────────────────────────────────
const registry: Record<string, ToolHandler> = {
  // ── Intelligence Agent tools ──
  get_revenue_metrics: async (input, ctx) => {
    const periodDays = toNumber(input.periodDays, 30);
    return (await getRevenueMetrics(ctx.merchantId, periodDays)) as unknown as Record<string, unknown>;
  },

  get_transaction_metrics: async (input, ctx) => {
    const days = toNumber(input.days, 30);
    const m = await getTransactionMetrics(ctx.merchantId, days);
    return {
      revenue: m.revenue,
      growthRate: m.growthRate,
      transactionCount: m.transactionCount,
      averageOrderValue: m.averageOrderValue,
      paymentSuccessRate: m.paymentSuccessRate,
      statusBreakdown: m.statusBreakdown,
      paymentMethods: m.paymentMethods,
    };
  },

  detect_revenue_anomalies: async (_input, ctx) => {
    const anomalies = await detectRevenueAnomalies(ctx.merchantId);
    return { anomalies };
  },

  get_business_trends: async (input, ctx) => {
    const days = toNumber(input.days, 30);
    const granularity = (input.granularity as 'day' | 'week' | 'month') ?? 'day';
    const trends = await getRevenueTrends(ctx.merchantId, days, granularity);
    return { trends };
  },

  // ── Customer Agent tools ──
  get_customer: async (input, ctx) => {
    const customerId = String(input.customerId ?? '');
    const customer = await prisma.customer.findFirst({
      where: {
        merchantId: ctx.merchantId,
        OR: [{ id: customerId }, { externalId: customerId }],
      },
    });
    if (!customer) throw new AppError(`Customer not found: ${customerId}`, 404);
    return {
      id: customer.id,
      externalId: customer.externalId,
      name: customer.name,
      segment: customer.segment,
      churnScore: customer.churnScore,
      totalOrders: customer.totalOrders,
      totalSpend: Number(customer.totalSpend),
      averageOrderValue: Number(customer.averageOrderValue),
      lastPurchaseAt: customer.lastPurchaseAt,
    };
  },

  get_customer_segments: async (_input, ctx) => {
    const segments = await getSegmentSummaries(ctx.merchantId);
    return { segments };
  },

  calculate_churn_risk: async (input, ctx) => {
    const limit = toNumber(input.limit, 100);
    const minChurnScore = toNumber(input.minChurnScore, 50);
    const atRisk = await getAtRiskCustomers(ctx.merchantId, limit, minChurnScore);
    return { churnRiskCustomers: atRisk };
  },

  get_high_value_customers: async (input, ctx) => {
    const minSpend = toNumber(input.minSpend, 15000);
    const limit = toNumber(input.limit, 100);
    const customers = await getHighValueCustomers(ctx.merchantId, minSpend, limit);
    return { customers: customers.map((c) => ({ ...c, totalSpend: Number(c.totalSpend) })) };
  },

  get_at_risk_customers: async (input, ctx) => {
    const limit = toNumber(input.limit, 100);
    const atRisk = await getAtRiskCustomers(ctx.merchantId, limit, 70);
    return { atRiskCustomers: atRisk };
  },

  // ── Revenue Agent tools ──
  generate_offer: async (input, ctx) => {
    const targetCount = toNumber(input.targetCount, 400);
    const offer = offerFrom(input);
    const plan = await buildCampaignPlan({
      merchantId: ctx.merchantId,
      targetCount,
      targetSegment: CustomerSegment.AT_RISK,
      offer,
    });
    return plan as unknown as Record<string, unknown>;
  },

  estimate_revenue: async (input, ctx) => {
    const targetCount = toNumber(input.targetCount, 400);
    const offer = offerFrom(input);
    const roi = simulateCampaign({ merchantId: ctx.merchantId, targetCount, offer });
    return roi as unknown as Record<string, unknown>;
  },

  calculate_campaign_roi: async (input, ctx) => {
    const targetCount = toNumber(input.targetCount, 400);
    const offer = offerFrom(input);
    const roi = simulateCampaign({ merchantId: ctx.merchantId, targetCount, offer });
    return roi as unknown as Record<string, unknown>;
  },

  compare_campaign_strategies: async (input, ctx) => {
    const targetCount = toNumber(input.targetCount, 400);
    const strategies = compareCampaignStrategies(ctx.merchantId, targetCount, 2600);
    return { strategies: strategies.map((s) => ({ name: s.name, roi: s.roi })) };
  },

  // ── Action Agent tools ──
  create_campaign: async (input, ctx) => {
    const name = String(input.name ?? 'Untitled campaign');
    const offer = String(input.offer ?? '');
    const targetSegment = String(input.targetSegment ?? 'AT_RISK');
    const budget = toNumber(input.budget, 0);
    const expectedRevenue = toNumber(input.expectedRevenue, 0);
    const expectedROI = toNumber(input.expectedROI, 0);

    const campaign = await prisma.campaign.create({
      data: {
        merchantId: ctx.merchantId,
        name,
        description: `Auto-generated campaign: ${offer}`,
        offer,
        targetSegment,
        budget,
        expectedRevenue,
        expectedROI,
        status: 'PENDING_APPROVAL',
      },
    });
    return { campaignId: campaign.id, status: campaign.status, name: campaign.name };
  },

  get_campaign_results: async (input, ctx) => {
    const campaignId = String(input.campaignId ?? '');
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, merchantId: ctx.merchantId },
      include: { predictions: true, results: true },
    });
    if (!campaign) throw new AppError('Campaign not found', 404);
    return {
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      expectedRevenue: Number(campaign.expectedRevenue),
      expectedROI: Number(campaign.expectedROI),
      actualRevenue: campaign.actualRevenue ? Number(campaign.actualRevenue) : null,
      actualROI: campaign.actualROI ? Number(campaign.actualROI) : null,
      prediction: campaign.predictions[0] ?? null,
      result: campaign.results[0] ?? null,
    };
  },

  get_historical_campaign_performance: async (_input, ctx) => {
    const campaigns = await prisma.campaign.findMany({
      where: { merchantId: ctx.merchantId, status: 'COMPLETED' },
      include: { predictions: true, results: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return {
      historicalCampaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        offer: c.offer,
        expectedROI: Number(c.expectedROI),
        actualROI: c.actualROI ? Number(c.actualROI) : null,
        predictionError: c.results[0] ? Number(c.results[0].predictionError) : null,
      })),
    };
  },
};

// ─── Helpers ────────────────────────────────────────

function toNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function offerFrom(input: Record<string, unknown>): OfferSpec {
  const type = (String(input.offerType ?? 'CASHBACK').toUpperCase() as OfferSpec['type']) ?? 'CASHBACK';
  const value = toNumber(input.value, type === 'CASHBACK' ? 200 : type === 'DISCOUNT' ? 10 : 0);
  return { type, value };
}

export function getTool(name: string): ToolHandler {
  const handler = registry[name];
  if (!handler) throw new AppError(`Unknown tool: ${name}`, 400);
  return handler;
}

export function listTools(): string[] {
  return Object.keys(registry);
}

export async function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolExecutionContext,
): Promise<{ success: boolean; output: Record<string, unknown>; durationMs: number; error?: string }> {
  const start = Date.now();
  try {
    const handler = getTool(name);
    const output = await handler(input, ctx);
    return { success: true, output, durationMs: Date.now() - start };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      output: { error },
      durationMs: Date.now() - start,
      error,
    };
  }
}
