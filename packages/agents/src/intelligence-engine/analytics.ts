import { prisma } from '@commercepilot/database';
import {
  CustomerSegment,
  RevenueAnomaly,
  RevenueMetrics,
  RevenueTrend,
  CustomerSegmentSummary,
  ChurnRisk,
  RFMScore,
} from '@commercepilot/shared';
import { CHURN_THRESHOLDS, ANOMALY_THRESHOLDS } from '@commercepilot/shared';

const dayMs = 24 * 60 * 60 * 1000;

// ─── Revenue Analytics ───────────────────────────────

export interface RevenueMetricsInput {
  merchantId: string;
  periodDays?: number; // window for "current"
  compareDays?: number; // previous window for growth
}

export async function getRevenueMetrics(
  merchantId: string,
  periodDays = 30,
): Promise<RevenueMetrics> {
  const now = new Date();
  const currentStart = new Date(now.getTime() - periodDays * dayMs);
  const compareStart = new Date(now.getTime() - periodDays * 2 * dayMs);

  const [current, previous] = await Promise.all([
    prisma.transaction.aggregate({
      where: { merchantId, createdAt: { gte: currentStart }, status: 'SUCCESS' },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.transaction.aggregate({
      where: { merchantId, createdAt: { gte: compareStart, lt: currentStart }, status: 'SUCCESS' },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const revenue = Number(current._sum.amount ?? 0);
  const prevRevenue = Number(previous._sum.amount ?? 0);
  const transactionCount = current._count.id;

  const growthRate = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
  const aov = transactionCount > 0 ? revenue / transactionCount : 0;
  const paymentSuccessRate = await computePaymentSuccessRate(merchantId, currentStart);

  return {
    revenue,
    growthRate: round1(growthRate),
    transactionCount,
    averageOrderValue: round2(aov),
    paymentSuccessRate: round1(paymentSuccessRate),
  };
}

async function computePaymentSuccessRate(merchantId: string, since: Date): Promise<number> {
  const all = await prisma.transaction.count({ where: { merchantId, createdAt: { gte: since } } });
  if (all === 0) return 100;
  const success = await prisma.transaction.count({
    where: { merchantId, createdAt: { gte: since }, status: 'SUCCESS' },
  });
  return (success / all) * 100;
}

// ─── Revenue Trends ─────────────────────────────────

export async function getRevenueTrends(
  merchantId: string,
  days = 30,
  granularity: 'day' | 'week' | 'month' = 'day',
): Promise<RevenueTrend[]> {
  const now = new Date();
  const start = new Date(now.getTime() - days * dayMs);

  const txns = await prisma.transaction.findMany({
    where: { merchantId, createdAt: { gte: start }, status: 'SUCCESS' },
    select: { amount: true, createdAt: true },
  });

  const buckets = new Map<string, { revenue: number; count: number }>();

  for (const t of txns) {
    const key = bucketKey(t.createdAt, granularity);
    const cur = buckets.get(key) ?? { revenue: 0, count: 0 };
    cur.revenue += Number(t.amount);
    cur.count += 1;
    buckets.set(key, cur);
  }

  // Fill all buckets chronologically
  const result: RevenueTrend[] = [];
  const steps = granularity === 'day' ? days : granularity === 'week' ? Math.ceil(days / 7) : Math.ceil(days / 30);
  for (let i = 0; i < steps; i++) {
    const t = granularity === 'day'
      ? start.getTime() + i * dayMs
      : granularity === 'week'
        ? start.getTime() + i * 7 * dayMs
        : start.getTime() + i * 30 * dayMs;
    const key = bucketKey(new Date(t), granularity);
    const b = buckets.get(key);
    result.push({
      date: new Date(t).toISOString().slice(0, 10),
      revenue: Math.round(b?.revenue ?? 0),
      transactions: b?.count ?? 0,
      aov: b && b.count > 0 ? round2(b.revenue / b.count) : 0,
    });
  }

  return result;
}

function bucketKey(date: Date, granularity: 'day' | 'week' | 'month'): string {
  const d = new Date(date);
  if (granularity === 'day') return d.toISOString().slice(0, 10);
  if (granularity === 'week') {
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - d.getDay());
    return startOfWeek.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 7);
}

// ─── Anomaly Detection ──────────────────────────────

export async function detectRevenueAnomalies(merchantId: string): Promise<RevenueAnomaly[]> {
  const anomalies: RevenueAnomaly[] = [];

  const currentWeek = await getRevenueMetrics(merchantId, 7);
  const prevWeekStart = new Date(Date.now() - 14 * dayMs);
  const prevWeekEnd = new Date(Date.now() - 7 * dayMs);
  const prevWeek = await prisma.transaction.aggregate({
    where: { merchantId, createdAt: { gte: prevWeekStart, lt: prevWeekEnd }, status: 'SUCCESS' },
    _sum: { amount: true },
    _count: { id: true },
  });

  const prevRevenue = Number(prevWeek._sum.amount ?? 0);
  const prevCount = prevWeek._count.id;

  // Revenue drop
  if (prevRevenue > 0) {
    const change = ((currentWeek.revenue - prevRevenue) / prevRevenue) * 100;
    if (change < -ANOMALY_THRESHOLDS.REVENUE_DROP_PERCENT) {
      anomalies.push({
        metric: 'revenue',
        currentValue: currentWeek.revenue,
        previousValue: prevRevenue,
        changePercent: round1(change),
        severity: change < -20 ? 'HIGH' : 'MEDIUM',
        description: `Revenue decreased ${Math.abs(change).toFixed(1)}% compared with the previous 7-day period.`,
      });
    }
  }

  // Volume drop
  if (prevCount > 0) {
    const volChange = ((currentWeek.transactionCount - prevCount) / prevCount) * 100;
    if (volChange < -ANOMALY_THRESHOLDS.VOLUME_DROP_PERCENT) {
      anomalies.push({
        metric: 'transaction_volume',
        currentValue: currentWeek.transactionCount,
        previousValue: prevCount,
        changePercent: round1(volChange),
        severity: 'MEDIUM',
        description: `Transaction volume decreased ${Math.abs(volChange).toFixed(1)}%.`,
      });
    }
  }

  // AOV drop
  if (prevRevenue > 0 && prevCount > 0) {
    const prevAov = prevRevenue / prevCount;
    const aovChange = ((currentWeek.averageOrderValue - prevAov) / prevAov) * 100;
    if (aovChange < -ANOMALY_THRESHOLDS.AOV_DROP_PERCENT) {
      anomalies.push({
        metric: 'average_order_value',
        currentValue: currentWeek.averageOrderValue,
        previousValue: round2(prevAov),
        changePercent: round1(aovChange),
        severity: 'LOW',
        description: `Average order value decreased ${Math.abs(aovChange).toFixed(1)}%.`,
      });
    }
  }

  return anomalies;
}

// ─── RFM Segmentation ───────────────────────────────

export function computeRFM(input: {
  recencyDays: number;
  orderCount: number;
  monetary: number;
}): RFMScore {
  const { recencyDays, orderCount, monetary } = input;

  const recency =
    recencyDays <= 7 ? 5 : recencyDays <= 30 ? 4 : recencyDays <= 60 ? 3 : recencyDays <= 120 ? 2 : 1;
  const frequency = orderCount >= 20 ? 5 : orderCount >= 12 ? 4 : orderCount >= 6 ? 3 : orderCount >= 3 ? 2 : 1;
  const m =
    monetary >= 50000 ? 5 : monetary >= 20000 ? 4 : monetary >= 8000 ? 3 : monetary >= 2000 ? 2 : 1;

  let segment = CustomerSegment.REGULAR;
  if (recencyDays > 180 || (recencyDays > 90 && frequency <= 2)) {
    segment = CustomerSegment.CHURNED;
  } else if (recency <= 2 && m >= 3 && frequency >= 2) {
    segment = CustomerSegment.AT_RISK;
  } else if (recency >= 4 && frequency >= 4 && m >= 4) {
    segment = CustomerSegment.VIP;
  } else if (recency >= 3 && frequency >= 3 && m >= 3) {
    segment = CustomerSegment.LOYAL;
  } else if (frequency <= 1 && recencyDays <= 45) {
    segment = CustomerSegment.NEW;
  }

  return { recency, frequency, monetary: m, segment };
}

export function computeChurnScore(rfm: RFMScore): number {
  let score = 0;
  score += Math.max(0, (5 - rfm.recency) * 25);
  score += Math.max(0, (5 - rfm.frequency) * 12);
  score += Math.max(0, (5 - rfm.monetary) * 6);
  return Math.min(99, Math.max(1, score));
}

// ─── Customer Segment Summaries ─────────────────────

export async function getSegmentSummaries(merchantId: string): Promise<CustomerSegmentSummary[]> {
  const grouped = await prisma.customer.groupBy({
    by: ['segment'],
    where: { merchantId },
    _count: { id: true },
    _sum: { totalSpend: true },
  });

  const segments: CustomerSegmentSummary[] = [];
  for (const g of grouped) {
    const totalRevenue = Number(g._sum.totalSpend ?? 0);
    segments.push({
      segment: g.segment as CustomerSegment,
      count: g._count.id,
      totalRevenue,
      averageSpend: g._count.id > 0 ? round2(totalRevenue / g._count.id) : 0,
    });
  }

  return segments.sort((a, b) => b.count - a.count);
}

// ─── At-Risk Customers ──────────────────────────────

export async function getAtRiskCustomers(
  merchantId: string,
  limit = 100,
  minChurnScore: number = CHURN_THRESHOLDS.MEDIUM_RISK,
): Promise<ChurnRisk[]> {
  const customers = await prisma.customer.findMany({
    where: { merchantId, churnScore: { gte: minChurnScore } },
    orderBy: { churnScore: 'desc' },
    take: limit,
    select: {
      id: true,
      externalId: true,
      name: true,
      churnScore: true,
      totalSpend: true,
      lastPurchaseAt: true,
      totalOrders: true,
    },
  });

  const now = Date.now();
  return customers.map((c) => {
    const daysSinceLast = c.lastPurchaseAt
      ? Math.floor((now - c.lastPurchaseAt.getTime()) / dayMs)
      : 365;
    const reasons: string[] = [];
    if (daysSinceLast >= 30) reasons.push(`${daysSinceLast} days since last purchase`);
    if (c.totalOrders < 10) reasons.push('Purchase frequency declining');
    if (Number(c.totalSpend) > 20000) reasons.push('High historical value');

    return {
      customerId: c.id,
      customerName: c.name,
      churnProbability: c.churnScore,
      reasons,
      historicalValue: Number(c.totalSpend),
      externalId: c.externalId,
      daysSinceLastPurchase: daysSinceLast,
    };
  });
}

// ─── High Value Customers ───────────────────────────

export async function getHighValueCustomers(merchantId: string, minSpend = 15000, limit = 100) {
  return prisma.customer.findMany({
    where: { merchantId, totalSpend: { gte: minSpend } },
    orderBy: { totalSpend: 'desc' },
    take: limit,
    select: {
      id: true,
      externalId: true,
      name: true,
      totalSpend: true,
      totalOrders: true,
      averageOrderValue: true,
      segment: true,
      churnScore: true,
      lastPurchaseAt: true,
    },
  });
}

// ─── Dashboard Overview ─────────────────────────────

export async function getDashboardOverview(merchantId: string) {
  const metrics = await getRevenueMetrics(merchantId, 30);

  const totalCustomers = await prisma.customer.count({ where: { merchantId } });
  const activeWindow = new Date(Date.now() - 90 * dayMs);
  const activeCustomers = await prisma.customer.count({
    where: { merchantId, lastPurchaseAt: { gte: activeWindow } },
  });

  // Repeat purchase rate: customers with >1 order / all customers
  const repeatCustomers = await prisma.customer.count({
    where: { merchantId, totalOrders: { gt: 1 } },
  });
  const repeatPurchaseRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

  // Conversion rate: successful / total transactions
  const totalTxns = await prisma.transaction.count({ where: { merchantId } });
  const successTxns = await prisma.transaction.count({
    where: { merchantId, status: 'SUCCESS' },
  });
  const conversionRate = totalTxns > 0 ? (successTxns / totalTxns) * 100 : 0;

  // Revenue at risk: high-value customers with high churn
  const atRisk = await getAtRiskCustomers(merchantId, 500, 60);
  const revenueAtRisk = atRisk.reduce((sum, c) => sum + c.historicalValue, 0);

  // AI opportunities (open)
  const opportunities = await prisma.opportunity.findMany({
    where: { merchantId, status: 'OPEN' },
    orderBy: { priority: 'desc' },
    take: 5,
    select: { id: true, type: true, title: true, description: true, priority: true, estimatedRevenue: true, confidence: true },
  });

  return {
    totalRevenue: metrics.revenue,
    revenueGrowth: metrics.growthRate,
    totalTransactions: metrics.transactionCount,
    averageOrderValue: metrics.averageOrderValue,
    activeCustomers,
    totalCustomers,
    repeatPurchaseRate: round1(repeatPurchaseRate),
    conversionRate: round1(conversionRate),
    revenueAtRisk: round2(revenueAtRisk),
    aiOpportunities: opportunities.map((o) => ({
      id: o.id,
      type: o.type,
      title: o.title,
      description: o.description,
      priority: o.priority,
      estimatedRevenue: Number(o.estimatedRevenue),
      confidence: o.confidence,
    })),
  };
}

// ─── Transaction Metrics ────────────────────────────

export async function getTransactionMetrics(merchantId: string, days = 30) {
  const metrics = await getRevenueMetrics(merchantId, days);
  const trends = await getRevenueTrends(merchantId, days, 'day');

  const statuses = await prisma.transaction.groupBy({
    by: ['status'],
    where: { merchantId, createdAt: { gte: new Date(Date.now() - days * dayMs) } },
    _count: { id: true },
  });

  const paymentMethods = await prisma.transaction.groupBy({
    by: ['paymentMethod'],
    where: { merchantId, createdAt: { gte: new Date(Date.now() - days * dayMs) } },
    _count: { id: true },
    _sum: { amount: true },
  });

  return {
    ...metrics,
    trends,
    statusBreakdown: Object.fromEntries(statuses.map((s) => [s.status, s._count.id])),
    paymentMethods: paymentMethods.map((p) => ({
      method: p.paymentMethod,
      count: p._count.id,
      amount: Number(p._sum.amount ?? 0),
    })),
  };
}

// ─── Helpers ────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
