import { Request, Response } from 'express';
import { prisma } from '@commercepilot/database';
import {
  getSegmentSummaries,
  getAtRiskCustomers,
  getHighValueCustomers,
  computeRFM,
  computeChurnScore,
} from '@commercepilot/agents';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, paginated } from '../utils/respond.js';
import { resolveMerchant } from '../middleware/auth.js';
import { NotFoundError } from '../utils/errors.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const segment = req.query.segment as string | undefined;
  const search = req.query.search as string | undefined;

  const where: Record<string, unknown> = { merchantId };
  if (segment) where.segment = segment;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { externalId: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { totalSpend: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        externalId: true,
        name: true,
        email: true,
        segment: true,
        churnScore: true,
        totalOrders: true,
        totalSpend: true,
        averageOrderValue: true,
        lastPurchaseAt: true,
      },
    }),
    prisma.customer.count({ where }),
  ]);

  paginated(
    res,
    customers.map((c) => ({ ...c, totalSpend: Number(c.totalSpend), averageOrderValue: Number(c.averageOrderValue) })),
    total,
    page,
    limit,
  );
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const id = req.params.id;

  const customer = await prisma.customer.findFirst({
    where: { merchantId, OR: [{ id }, { externalId: id }] },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
  if (!customer) throw new NotFoundError('Customer not found');

  const daysSinceLast = customer.lastPurchaseAt
    ? Math.floor((Date.now() - customer.lastPurchaseAt.getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const rfm = computeRFM({
    recencyDays: daysSinceLast ?? 365,
    orderCount: customer.totalOrders,
    monetary: Number(customer.totalSpend),
  });
  const computedChurn = computeChurnScore(rfm);

  ok(res, {
    id: customer.id,
    externalId: customer.externalId,
    name: customer.name,
    email: customer.email,
    segment: customer.segment,
    churnScore: customer.churnScore,
    computedChurnScore: computedChurn,
    totalOrders: customer.totalOrders,
    totalSpend: Number(customer.totalSpend),
    averageOrderValue: Number(customer.averageOrderValue),
    firstPurchaseAt: customer.firstPurchaseAt,
    lastPurchaseAt: customer.lastPurchaseAt,
    daysSinceLastPurchase: daysSinceLast,
    rfm,
    recentTransactions: customer.transactions.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      status: t.status,
      paymentMethod: t.paymentMethod,
      createdAt: t.createdAt,
    })),
  });
});

export const segments = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const segments = await getSegmentSummaries(merchantId);
  ok(res, { segments });
});

export const atRisk = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const limit = Number(req.query.limit ?? 100);
  const minScore = Number(req.query.minScore ?? 50);
  const customers = await getAtRiskCustomers(merchantId, limit, minScore);
  ok(res, { customers });
});

export const highValue = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const minSpend = Number(req.query.minSpend ?? 15000);
  const limit = Number(req.query.limit ?? 100);
  const customers = await getHighValueCustomers(merchantId, minSpend, limit);
  ok(res, {
    customers: customers.map((c) => ({ ...c, totalSpend: Number(c.totalSpend), averageOrderValue: Number(c.averageOrderValue) })),
  });
});
