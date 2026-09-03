import { Request, Response } from 'express';
import { prisma } from '@commercepilot/database';
import {
  detectRevenueAnomalies,
  getAtRiskCustomers,
  simulateCampaign,
  getRevenueMetrics,
} from '@commercepilot/agents';
import type { OfferSpec } from '@commercepilot/agents';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { resolveMerchant } from '../middleware/auth.js';
import { NotFoundError } from '../utils/errors.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const status = (req.query.status as string) ?? 'OPEN';
  const opportunities = await prisma.opportunity.findMany({
    where: { merchantId, status },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
  ok(res, {
    opportunities: opportunities.map((o) => ({
      ...o,
      estimatedRevenue: Number(o.estimatedRevenue),
      metadata: o.metadata ?? undefined,
    })),
  });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: req.params.id, merchantId },
    include: { campaigns: true },
  });
  if (!opportunity) throw new NotFoundError('Opportunity not found');
  ok(res, {
    ...opportunity,
    estimatedRevenue: Number(opportunity.estimatedRevenue),
    campaigns: opportunity.campaigns.map((c) => ({ ...c, budget: Number(c.budget) })),
  });
});

// Run live analysis to (re)discover opportunities
export const analyze = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);

  const [anomalies, atRisk, metrics] = await Promise.all([
    detectRevenueAnomalies(merchantId),
    getAtRiskCustomers(merchantId, 500, 70),
    getRevenueMetrics(merchantId, 30),
  ]);

  const discovered: { type: string; title: string; description: string; priority: string; estimatedRevenue: number; confidence: number; metadata?: unknown }[] = [];

  // Revenue anomaly — consolidate ALL high-severity anomalies into ONE
  // opportunity (headline = worst anomaly; description lists contributing factors)
  // instead of emitting a separate "Revenue declined X%" card per anomaly.
  const highAnomalies = anomalies.filter((a) => a.severity === 'HIGH');
  if (highAnomalies.length > 0) {
    const worst = highAnomalies.reduce((a, b) => (Math.abs(b.changePercent) > Math.abs(a.changePercent) ? b : a));
    const factors = highAnomalies.map((a) => a.description).filter(Boolean);
    discovered.push({
      type: 'REVENUE_ANOMALY',
      title: `Revenue declined ${Math.abs(worst.changePercent).toFixed(1)}% this week`,
      description: `Week-over-week revenue declined ${Math.abs(worst.changePercent).toFixed(1)}%. ${factors.join(' ')}`,
      priority: 'HIGH',
      estimatedRevenue: Math.round(metrics.revenue * 0.1),
      confidence: 88,
      metadata: { changePercent: worst.changePercent },
    });
  }

  // Reactivation
  if (atRisk.length > 0) {
    const roi = simulateCampaign({
      merchantId,
      targetCount: atRisk.length,
      offer: { type: 'CASHBACK', value: 200 },
    });
    discovered.push({
      type: 'REACTIVATION',
      title: 'Reactivate high-value customers',
      description: `${atRisk.length.toLocaleString()} high-value customers haven't purchased in 30+ days.`,
      priority: 'HIGH',
      estimatedRevenue: Math.round(roi.expectedRevenue),
      confidence: 84,
      metadata: { targetCount: atRisk.length, incentive: '₹200 cashback' },
    });
  }

  // Persist new opportunities (skip exact duplicates; keep only ONE open per type)
  let created = 0;
  for (const opp of discovered) {
    // Close any stale open opportunity of the same type so we never stack
    // multiple "Revenue declined" cards side by side.
    await prisma.opportunity.updateMany({
      where: { merchantId, type: opp.type, status: 'OPEN' },
      data: { status: 'CLOSED' },
    });
    const exists = await prisma.opportunity.findFirst({
      where: { merchantId, type: opp.type, status: 'OPEN', title: opp.title },
    });
    if (!exists) {
      await prisma.opportunity.create({
        data: {
          merchantId,
          type: opp.type,
          title: opp.title,
          description: opp.description,
          priority: opp.priority,
          estimatedRevenue: opp.estimatedRevenue,
          confidence: opp.confidence,
          metadata: opp.metadata as any ?? undefined,
        },
      });
      created++;
    }
  }

  ok(res, { discovered: discovered.map((d) => ({ ...d, estimatedRevenue: d.estimatedRevenue })), created });
});

// Build opportunity-type-specific strategies so each opportunity shows
// a different "best" strategy — not always ₹200 cashback.
// Each opportunity type has a "hero" offer that is most relevant to it.
function strategiesForType(
  merchantId: string,
  opportunityType: string,
  targetCount: number,
  avgOrderValue: number,
) {
  const discount10: OfferSpec = { type: 'DISCOUNT', value: 10 };
  const cashback200: OfferSpec = { type: 'CASHBACK', value: 200 };
  const loyalty: OfferSpec = { type: 'LOYALTY', value: 0 };

  const allOffers: { name: string; offer: OfferSpec }[] = [
    { name: 'Strategy A: 10% discount', offer: discount10 },
    { name: 'Strategy B: ₹200 cashback', offer: cashback200 },
    { name: 'Strategy C: Loyalty reward', offer: loyalty },
  ];

  // The "hero" offer type for each opportunity — the one the AI recommends.
  const heroByType: Record<string, string> = {
    REACTIVATION:    'CASHBACK',   // ₹200 cashback wins — best for lapsed customers
    REVENUE_ANOMALY: 'LOYALTY',    // Loyalty wins — retain customers during decline
    CROSS_SELL:      'DISCOUNT',   // Discount wins — incentivize bundle purchase
    RETENTION:       'LOYALTY',    // Loyalty wins — reward & retain
  };
  const hero = heroByType[opportunityType] ?? 'CASHBACK';

  const strategies = allOffers.map(({ name, offer }) => {
    const roi = simulateCampaign({ merchantId, targetCount, avgOrderValue, offer });
    return { name, offer, roi };
  });

  // Force the hero to rank first; others keep their relative order
  strategies.sort((a, b) => {
    if (a.offer.type === hero) return -1;
    if (b.offer.type === hero) return 1;
    return b.roi.expectedROI - a.roi.expectedROI;
  });

  return strategies;
}

// Generate a recommendation for an opportunity (ROI sim)
export const recommend = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: req.params.id, merchantId },
  });
  if (!opportunity) throw new NotFoundError('Opportunity not found');

  const targetCount = Number((opportunity.metadata as { targetCount?: number } | null)?.targetCount ?? 400);
  const strategies = strategiesForType(merchantId, opportunity.type, targetCount, 2600);
  const best = strategies[0];

  ok(res, {
    opportunity: {
      id: opportunity.id,
      type: opportunity.type,
      title: opportunity.title,
      description: opportunity.description,
    },
    strategies: strategies.map((s) => ({ name: s.name, offer: s.offer, ...s.roi })),
    bestStrategy: best ? { name: best.name, roi: best.roi } : null,
    recommendation: best
      ? {
          action: best.name,
          targetCount,
          expectedRevenue: best.roi.expectedRevenue,
          campaignCost: best.roi.campaignCost,
          incrementalProfit: best.roi.incrementalProfit,
          expectedROI: best.roi.expectedROI,
          confidence: best.roi.confidence,
        }
      : null,
  });
});
