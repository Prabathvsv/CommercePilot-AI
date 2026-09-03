import { describe, it, expect } from 'vitest';
import { computeRFM, computeChurnScore } from '@commercepilot/agents';
import { simulateCampaign, checkPolicy, offerConversionRate } from '@commercepilot/agents';
import { CustomerSegment } from '@commercepilot/shared';

describe('Analytics — RFM segmentation', () => {
  it('classifies a frequent, recent, high-spend customer as VIP', () => {
    const rfm = computeRFM({ recencyDays: 5, orderCount: 25, monetary: 80000 });
    expect(rfm.segment).toBe(CustomerSegment.VIP);
    expect(rfm.recency).toBe(5);
    expect(rfm.frequency).toBe(5);
    expect(rfm.monetary).toBe(5);
  });

  it('classifies an active mid customer as LOYAL', () => {
    const rfm = computeRFM({ recencyDays: 20, orderCount: 10, monetary: 12000 });
    expect(rfm.segment).toBe(CustomerSegment.LOYAL);
  });

  it('classifies a recent single purchase as NEW', () => {
    const rfm = computeRFM({ recencyDays: 10, orderCount: 1, monetary: 1000 });
    expect(rfm.segment).toBe(CustomerSegment.NEW);
  });

  it('classifies a long-inactive low-frequency customer as CHURNED', () => {
    const rfm = computeRFM({ recencyDays: 200, orderCount: 2, monetary: 3000 });
    expect(rfm.segment).toBe(CustomerSegment.CHURNED);
  });

  it('classifies a declining valuable customer as AT_RISK', () => {
    const rfm = computeRFM({ recencyDays: 90, orderCount: 8, monetary: 30000 });
    expect(rfm.segment).toBe(CustomerSegment.AT_RISK);
  });

  it('classifies an average customer as REGULAR', () => {
    const rfm = computeRFM({ recencyDays: 40, orderCount: 5, monetary: 6000 });
    expect(rfm.segment).toBe(CustomerSegment.REGULAR);
  });
});

describe('Analytics — churn score', () => {
  it('computes a low score for a healthy VIP customer', () => {
    const rfm = computeRFM({ recencyDays: 3, orderCount: 30, monetary: 100000 });
    const score = computeChurnScore(rfm);
    expect(score).toBeLessThan(30);
  });

  it('computes a high score for a churned customer', () => {
    const rfm = computeRFM({ recencyDays: 300, orderCount: 1, monetary: 500 });
    const score = computeChurnScore(rfm);
    expect(score).toBeGreaterThan(60);
  });

  it('clamps score to the 1-99 range', () => {
    const worst = computeChurnScore({ recency: 1, frequency: 1, monetary: 1, segment: CustomerSegment.CHURNED });
    expect(worst).toBeLessThanOrEqual(99);
    expect(worst).toBeGreaterThanOrEqual(1);
  });
});

describe('Analytics — ROI simulation', () => {
  it('calculates expected revenue from target count and conversion rate', () => {
    const roi = simulateCampaign({
      merchantId: 'm1',
      targetCount: 412,
      avgOrderValue: 2600,
      offer: { type: 'CASHBACK', value: 200 },
    });
    // cost = 412 * 200 = 82,400
    expect(roi.campaignCost).toBeCloseTo(82400, 0);
    expect(roi.expectedROI).toBeGreaterThan(1);
    expect(roi.confidence).toBeGreaterThan(0);
    expect(roi.confidence).toBeLessThanOrEqual(100);
  });

  it('returns higher ROI for cashback than a large discount on same audience', () => {
    const cashback = simulateCampaign({ merchantId: 'm1', targetCount: 400, offer: { type: 'CASHBACK', value: 200 } });
    const discount = simulateCampaign({ merchantId: 'm1', targetCount: 400, offer: { type: 'DISCOUNT', value: 20 } });
    expect(cashback.expectedROI).toBeGreaterThan(discount.expectedROI);
  });

  it('computes conversion rate within a sane band', () => {
    const roi = simulateCampaign({ merchantId: 'm1', targetCount: 500, offer: { type: 'CASHBACK', value: 200 } });
    expect(roi.conversionRate).toBeGreaterThan(5);
    expect(roi.conversionRate).toBeLessThan(40);
  });
});

describe('Analytics — offer conversion baselines', () => {
  it('has known conversion baselines per offer type', () => {
    expect(offerConversionRate({ type: 'CASHBACK', value: 200 })).toBeGreaterThan(0.1);
    expect(offerConversionRate({ type: 'FREE_SHIPPING', value: 0 })).toBeGreaterThan(0);
  });
});

describe('Analytics — policy guardrails', () => {
  it('flags a budget over the threshold as requiring approval', () => {
    const policy = checkPolicy({ budget: 100000, targetSize: 500 });
    expect(policy.requiresApproval).toBe(true);
    expect(policy.reasons.length).toBeGreaterThan(0);
  });

  it('does not require approval for a small safe campaign', () => {
    const policy = checkPolicy({ budget: 20000, targetSize: 300 });
    expect(policy.requiresApproval).toBe(false);
  });

  it('flags a discount over 30% as requiring approval', () => {
    const policy = checkPolicy({ budget: 10000, targetSize: 100, discountPercent: 40 });
    expect(policy.requiresApproval).toBe(true);
  });

  it('flags a target size over 10,000 as requiring approval', () => {
    const policy = checkPolicy({ budget: 10000, targetSize: 15000 });
    expect(policy.requiresApproval).toBe(true);
  });
});
