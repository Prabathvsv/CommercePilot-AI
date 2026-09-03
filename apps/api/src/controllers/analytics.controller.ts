import { Request, Response } from 'express';
import { prisma } from '@commercepilot/database';
import { getRevenueMetrics, getRevenueTrends, simulateCampaign } from '@commercepilot/agents';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { resolveMerchant } from '../middleware/auth.js';

export const campaigns = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const campaigns = await prisma.campaign.findMany({
    where: { merchantId },
    orderBy: { createdAt: 'desc' },
    include: { predictions: true, results: true },
  });
  ok(res, {
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      offer: c.offer,
      status: c.status,
      expectedROI: Number(c.expectedROI),
      actualROI: c.actualROI ? Number(c.actualROI) : null,
      predictedRevenue: Number(c.expectedRevenue),
      actualRevenue: c.actualRevenue ? Number(c.actualRevenue) : null,
      predictionError: c.results[0] ? Number(c.results[0].predictionError) : null,
      executedAt: c.executedAt,
    })),
  });
});

export const revenue = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const days = Number(req.query.days ?? 30);
  const metrics = await getRevenueMetrics(merchantId, days);
  const trends = await getRevenueTrends(merchantId, days, 'week');
  ok(res, { metrics, trends });
});

export const roi = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const targetCount = Number(req.query.targetCount ?? 400);
  const offerType = (req.query.offerType as string) ?? 'CASHBACK';
  const value = Number(req.query.value ?? 200);
  const roi = simulateCampaign({
    merchantId,
    targetCount,
    offer: { type: offerType as 'CASHBACK' | 'DISCOUNT' | 'LOYALTY' | 'FREE_SHIPPING', value },
  });
  ok(res, { roi });
});

export const predictions = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const predictions = await prisma.prediction.findMany({
    where: { campaign: { merchantId } },
    orderBy: { createdAt: 'desc' },
    include: { campaign: { select: { name: true, actualRevenue: true, actualROI: true } } },
    take: 50,
  });
  ok(res, {
    predictions: predictions.map((p) => ({
      id: p.id,
      campaignId: p.campaignId,
      campaignName: p.campaign.name,
      predictedRevenue: Number(p.predictedRevenue),
      predictedConversions: p.predictedConversions,
      predictedROI: Number(p.predictedROI),
      confidence: p.confidence,
      actualRevenue: p.campaign.actualRevenue ? Number(p.campaign.actualRevenue) : null,
      actualROI: p.campaign.actualROI ? Number(p.campaign.actualROI) : null,
      createdAt: p.createdAt,
    })),
  });
});
