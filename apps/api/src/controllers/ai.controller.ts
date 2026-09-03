import { Request, Response } from 'express';
import { Orchestrator } from '@commercepilot/agents';
import { detectRevenueAnomalies, getRevenueMetrics, getAtRiskCustomers, simulateCampaign } from '@commercepilot/agents';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { resolveMerchant } from '../middleware/auth.js';

// Singleton orchestrator (stateless across requests)
const orchestrator = new Orchestrator();

// Merchant Copilot: natural language → tool calls → response
export const chat = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const message = String(req.body.message ?? '');

  if (!message.trim()) {
    res.status(400).json({ success: false, message: 'Message is required' });
    return;
  }

  const result = await orchestrator.run({ message, merchantId });
  ok(res, result);
});

export const analyzeBusiness = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const [metrics, anomalies, atRisk] = await Promise.all([
    getRevenueMetrics(merchantId, 30),
    detectRevenueAnomalies(merchantId),
    getAtRiskCustomers(merchantId, 100, 70),
  ]);

  ok(res, {
    metrics,
    anomalies,
    atRiskCustomerCount: atRisk.length,
    summary:
      anomalies.length > 0
        ? anomalies.map((a) => a.description).join(' ')
        : 'Business metrics are stable.',
  });
});

export const generateCampaign = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const atRisk = await getAtRiskCustomers(merchantId, 500, 70);
  const targetCount = Number(req.body.targetCount ?? atRisk.length ?? 400);
  const offerType = (req.body.offerType as string) ?? 'CASHBACK';
  const value = Number(req.body.value ?? 200);

  const roi = simulateCampaign({
    merchantId,
    targetCount,
    offer: { type: offerType as 'CASHBACK' | 'DISCOUNT' | 'LOYALTY' | 'FREE_SHIPPING', value },
  });

  const offerLabel = offerType === 'CASHBACK' ? `₹${value} cashback` : `${value}% discount`;
  const plan = {
    name: `We Miss You — ${offerLabel}`,
    description: `Personalized reactivation campaign for ${targetCount} at-risk high-value customers with ${offerLabel}.`,
    offer: offerLabel,
    targetSegment: 'AT_RISK',
    targetCount,
    budget: roi.campaignCost,
    expectedRevenue: roi.expectedRevenue,
    expectedROI: roi.expectedROI,
    duration: 7,
    confidence: roi.confidence,
  };

  ok(res, { plan });
});

export const estimateRoi = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const targetCount = Number(req.body.targetCount ?? 400);
  const offerType = (req.body.offerType as string) ?? 'CASHBACK';
  const value = Number(req.body.value ?? 200);

  const roi = simulateCampaign({
    merchantId,
    targetCount,
    offer: { type: offerType as 'CASHBACK' | 'DISCOUNT' | 'LOYALTY' | 'FREE_SHIPPING', value },
  });
  ok(res, { roi });
});
