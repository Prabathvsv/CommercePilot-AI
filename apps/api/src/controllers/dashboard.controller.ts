import { Request, Response } from 'express';
import { getDashboardOverview, getRevenueTrends } from '@commercepilot/agents';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { resolveMerchant } from '../middleware/auth.js';

export const overview = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const data = await getDashboardOverview(merchantId);
  ok(res, data);
});

export const revenue = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const days = Number(req.query.days ?? 30);
  const granularity = (req.query.granularity as 'day' | 'week' | 'month') ?? 'day';
  const trends = await getRevenueTrends(merchantId, days, granularity);
  ok(res, { trends, days, granularity });
});

export const customers = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const data = await getDashboardOverview(merchantId);
  ok(res, {
    totalCustomers: data.totalCustomers,
    activeCustomers: data.activeCustomers,
    repeatPurchaseRate: data.repeatPurchaseRate,
    conversionRate: data.conversionRate,
    revenueAtRisk: data.revenueAtRisk,
  });
});

export const opportunities = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const data = await getDashboardOverview(merchantId);
  ok(res, { aiOpportunities: data.aiOpportunities });
});
