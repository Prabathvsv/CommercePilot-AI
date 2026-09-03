import { Request, Response } from 'express';
import { prisma } from '@commercepilot/database';
import { getTransactionMetrics, detectRevenueAnomalies, getRevenueTrends } from '@commercepilot/agents';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, paginated } from '../utils/respond.js';
import { resolveMerchant } from '../middleware/auth.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const status = req.query.status as string | undefined;
  const customerId = req.query.customerId as string | undefined;

  const where: Record<string, unknown> = { merchantId };
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { customer: { select: { name: true, externalId: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  paginated(
    res,
    transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
    total,
    page,
    limit,
  );
});

export const metrics = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const days = Number(req.query.days ?? 30);
  const data = await getTransactionMetrics(merchantId, days);
  ok(res, data);
});

export const trends = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const days = Number(req.query.days ?? 30);
  const granularity = (req.query.granularity as 'day' | 'week' | 'month') ?? 'day';
  const trends = await getRevenueTrends(merchantId, days, granularity);
  ok(res, { trends });
});

export const anomalies = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const anomalies = await detectRevenueAnomalies(merchantId);
  ok(res, { anomalies });
});
