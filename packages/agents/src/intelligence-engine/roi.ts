import { ROISimulation, CampaignPlan, CustomerSegment } from '@commercepilot/shared';

// ─── Historical conversion baselines ─────────────────
// Derived from prior campaign outcomes (pattern 4) to inform predictions.
const BASELINE_CONVERSION: Record<string, number> = {
  CASHBACK: 0.172, // ₹200 cashback historically converts ~17.2%
  DISCOUNT_10: 0.12,
  DISCOUNT_20: 0.15,
  LOYALTY: 0.1,
  FREE_SHIPPING: 0.08,
  DEFAULT: 0.1,
};

export interface OfferSpec {
  type: 'CASHBACK' | 'DISCOUNT' | 'LOYALTY' | 'FREE_SHIPPING';
  value: number; // cashback amount (₹) or discount percent
  perCustomerCost?: number;
}

export interface CampaignSimulationInput {
  merchantId: string;
  targetCount: number;
  offer: OfferSpec;
  avgOrderValue?: number;
  historicalConversion?: number;
  confidence?: number;
}

export function offerConversionRate(offer: OfferSpec): number {
  const base = BASELINE_CONVERSION[offer.type] ?? BASELINE_CONVERSION.DEFAULT;
  // Higher-value incentives convert slightly better
  const boost = offer.type === 'CASHBACK' ? Math.min(0.04, (offer.value / 1000) * 0.02) : 0;
  return base + boost;
}

export function perCustomerCost(offer: OfferSpec, avgOrderValue: number): number {
  switch (offer.type) {
    case 'CASHBACK':
      return offer.value;
    case 'DISCOUNT':
      return avgOrderValue * (offer.value / 100);
    case 'FREE_SHIPPING':
      return 50;
    case 'LOYALTY':
      return avgOrderValue * 0.08;
    default:
      return 0;
  }
}

export function simulateCampaign(input: CampaignSimulationInput): ROISimulation {
  const { targetCount, offer, avgOrderValue = 2600 } = input;
  const conversionRate = input.historicalConversion ?? offerConversionRate(offer);
  const costPerCustomer = perCustomerCost(offer, avgOrderValue);
  const campaignCost = costPerCustomer * targetCount;
  const expectedConversions = Math.round(targetCount * conversionRate);
  const expectedRevenue = expectedConversions * avgOrderValue;
  const incrementalProfit = expectedRevenue - campaignCost;
  const expectedROI = campaignCost > 0 ? expectedRevenue / campaignCost : 0;

  return {
    expectedRevenue: round2(expectedRevenue),
    campaignCost: round2(campaignCost),
    incrementalProfit: round2(incrementalProfit),
    expectedROI: round2(expectedROI),
    conversionRate: round2(conversionRate * 100),
    confidence: input.confidence ?? 84,
  };
}

// ─── Strategy comparison ────────────────────────────

export function compareCampaignStrategies(merchantId: string, targetCount: number, avgOrderValue: number) {
  const strategies: { name: string; offer: OfferSpec; roi: ROISimulation }[] = [
    {
      name: 'Strategy A: 10% discount',
      offer: { type: 'DISCOUNT', value: 10 },
      roi: simulateCampaign({ merchantId, targetCount, avgOrderValue, offer: { type: 'DISCOUNT', value: 10 } }),
    },
    {
      name: 'Strategy B: ₹200 cashback',
      offer: { type: 'CASHBACK', value: 200 },
      roi: simulateCampaign({ merchantId, targetCount, avgOrderValue, offer: { type: 'CASHBACK', value: 200 } }),
    },
    {
      name: 'Strategy C: Loyalty reward',
      offer: { type: 'LOYALTY', value: 0 },
      roi: simulateCampaign({ merchantId, targetCount, avgOrderValue, offer: { type: 'LOYALTY', value: 0 } }),
    },
  ];

  strategies.sort((a, b) => b.roi.expectedROI - a.roi.expectedROI);
  return strategies;
}

// ─── Campaign plan builder ──────────────────────────

export async function buildCampaignPlan(input: {
  merchantId: string;
  opportunityId?: string;
  targetCount: number;
  targetSegment: CustomerSegment;
  offer: OfferSpec;
  avgOrderValue?: number;
}): Promise<CampaignPlan> {
  const roi = simulateCampaign({
    merchantId: input.merchantId,
    targetCount: input.targetCount,
    avgOrderValue: input.avgOrderValue,
    offer: input.offer,
  });

  const segmentLabel = input.targetSegment.toLowerCase().replace('_', ' ');
  const offerText =
    input.offer.type === 'CASHBACK'
      ? `₹${input.offer.value} cashback`
      : input.offer.type === 'DISCOUNT'
        ? `${input.offer.value}% discount`
        : input.offer.type === 'LOYALTY'
          ? 'loyalty reward points'
          : 'free shipping';

  return {
    name: `We Miss You — ${offerText}`,
    description: `Personalized reactivation campaign for ${input.targetCount} ${segmentLabel} customers with ${offerText} incentive.`,
    offer: offerText,
    targetSegment: input.targetSegment,
    targetCount: input.targetCount,
    budget: roi.campaignCost,
    expectedRevenue: roi.expectedRevenue,
    expectedROI: roi.expectedROI,
    duration: 7,
    confidence: roi.confidence,
  };
}

// ─── Execution simulator (mock commerce API) ────────

export interface ExecutionOutcome {
  targeted: number;
  reached: number;
  conversions: number;
  revenue: number;
  cost: number;
  actualROI: number;
}

export async function simulateExecution(input: {
  merchantId: string;
  campaignId: string;
  targetCount: number;
  offer: OfferSpec;
  avgOrderValue: number;
  predictedROI: number;
}): Promise<ExecutionOutcome> {
  const { targetCount, offer, avgOrderValue } = input;

  const conversionRate = offerConversionRate(offer) + rand(-0.02, 0.02); // small variance
  const reachedRate = 0.965 + rand(-0.02, 0.02); // ~96.5% reachable
  const reached = Math.round(targetCount * reachedRate);
  const conversions = Math.round(reached * conversionRate);
  const revenue = conversions * avgOrderValue;
  const cost = perCustomerCost(offer, avgOrderValue) * targetCount;
  const actualROI = cost > 0 ? revenue / cost : 0;

  return {
    targeted: targetCount,
    reached,
    conversions,
    revenue: round2(revenue),
    cost: round2(cost),
    actualROI: round2(actualROI),
  };
}

// ─── Guardrails / policy validator ──────────────────

import { GUARDRAILS } from '@commercepilot/shared';

export interface PolicyCheck {
  requiresApproval: boolean;
  reasons: string[];
  budget: number;
  discountPercent?: number;
  targetSize: number;
}

export function checkPolicy(input: {
  budget: number;
  targetSize: number;
  discountPercent?: number;
}): PolicyCheck {
  const { budget, targetSize, discountPercent } = input;
  const reasons: string[] = [];

  if (budget > GUARDRAILS.MANDATORY_APPROVAL_BUDGET) {
    reasons.push(`Campaign budget ₹${budget.toLocaleString('en-IN')} exceeds ₹${GUARDRAILS.MANDATORY_APPROVAL_BUDGET.toLocaleString('en-IN')} threshold`);
  }
  if ((discountPercent ?? 0) > GUARDRAILS.MANDATORY_APPROVAL_DISCOUNT) {
    reasons.push(`Discount ${discountPercent}% exceeds ${GUARDRAILS.MANDATORY_APPROVAL_DISCOUNT}% threshold`);
  }
  if (targetSize > GUARDRAILS.MANDATORY_APPROVAL_TARGET_SIZE) {
    reasons.push(`Target ${targetSize} customers exceeds ${GUARDRAILS.MANDATORY_APPROVAL_TARGET_SIZE} threshold`);
  }

  return {
    requiresApproval: reasons.length > 0,
    reasons,
    budget,
    discountPercent,
    targetSize,
  };
}

// ─── Helpers ────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
