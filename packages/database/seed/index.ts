import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// ─── Configuration ──────────────────────────────────
const NUM_CUSTOMERS = 10_000;
const NUM_PRODUCTS = 100;

const CURRENCY = 'INR';

// Deliberate pattern targets
const PATTERN = {
  // Pattern 1: revenue decline — recent 4 weeks are ~14% lower
  REVENUE_DECLINE_WEEKS: 4,
  REVENUE_DECLINE_FACTOR: 0.14,
  // Pattern 2: high-value customers going inactive (last purchase 30+ days ago)
  AT_RISK_FRACTION: 0.12,
  // Pattern 3: cross-sell — Product A (coffee machine) buyers rarely own Product B (grinder)
  CROSS_SELL_PRODUCT_A: 'Coffee Machine',
  CROSS_SELL_PRODUCT_B: 'Coffee Grinder',
  CROSS_SELL_GAP: 0.31,
  // Pattern 4: prior successful campaigns (for learning loop)
  PREVIOUS_CAMPAIGNS: 4,
};

// ─── Helpers ────────────────────────────────────────
function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Rohan', 'Kabir', 'Dev', 'Krishna',
  'Ananya', 'Diya', 'Ishaan', 'Aadhya', 'Saanvi', 'Anaya', 'Myra', 'Kiara', 'Navya', 'Ira',
  'Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Pooja', 'Rajesh', 'Neha', 'Suresh', 'Kavita',
  'Manish', 'Deepa', 'Sunil', 'Rekha', 'Anil', 'Shweta', 'Nitin', 'Asha', 'Sanjay', 'Meera',
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Reddy', 'Nair', 'Iyer', 'Mehta',
  'Joshi', 'Das', 'Chopra', 'Mishra', 'Agarwal', 'Rao', 'Menon', 'Kapoor', 'Bose', 'Desai',
  'Malhotra', 'Bhatt', 'Pillai', 'Kulkarni', 'Saxena', 'Shetty', 'Trivedi', 'Bajaj', 'Rastogi', 'Chawla',
];

const PRODUCT_TEMPLATES: { name: string; category: string; price: [number, number] }[] = [
  { name: 'Coffee Machine', category: 'Machines', price: [15000, 40000] },
  { name: 'Coffee Grinder', category: 'Brewing', price: [3000, 12000] },
  { name: 'French Press', category: 'Brewing', price: [800, 2500] },
  { name: 'Pour-Over Set', category: 'Brewing', price: [1000, 3000] },
  { name: 'Espresso Beans 1kg', category: 'Coffee', price: [600, 1200] },
  { name: 'Arabica Beans 500g', category: 'Coffee', price: [400, 800] },
  { name: 'Robusta Beans 500g', category: 'Coffee', price: [300, 600] },
  { name: 'Cold Brew Kit', category: 'Brewing', price: [1200, 4000] },
  { name: 'Ceramic Mug', category: 'Mugs', price: [400, 1200] },
  { name: 'Travel Tumbler', category: 'Mugs', price: [800, 2000] },
  { name: 'Caramel Syrup', category: 'Syrups', price: [250, 500] },
  { name: 'Vanilla Syrup', category: 'Syrups', price: [250, 500] },
  { name: 'Hazelnut Syrup', category: 'Syrups', price: [250, 500] },
  { name: 'Matcha Powder', category: 'Tea', price: [700, 1500] },
  { name: 'Chai Masala Blend', category: 'Tea', price: [350, 700] },
  { name: 'Green Tea Pack', category: 'Tea', price: [300, 600] },
];

const PAYMENT_METHODS = ['UPI', 'Card', 'NetBanking', 'Wallet'];
const STATUSES: Prisma.TransactionCreateManyInput['status'][] = [
  'SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS',
  'FAILED', 'PENDING', 'REFUNDED',
];

// ─── Main ───────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding CommercePilot database...');
  const start = Date.now();
  const BATCH = 2000;

  // Clean existing data
  await prisma.$transaction([
    prisma.campaignResult.deleteMany(),
    prisma.prediction.deleteMany(),
    prisma.toolCall.deleteMany(),
    prisma.agentRun.deleteMany(),
    prisma.campaignTarget.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.opportunity.deleteMany(),
    prisma.customerEvent.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.product.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.merchant.deleteMany(),
  ]);
  console.log('  ✓ Cleared existing data');

  // 1. Merchant
  // Demo login: merchant@commercepilot.ai / password123
  const merchant = await prisma.merchant.create({
    data: {
      name: 'Demo Merchant',
      email: 'merchant@commercepilot.ai',
      passwordHash: '$2a$10$5Bb94izVlc5MnqIgT2Q1GeLwK3OmYTHQ1cItmX.ST0pAG9f.6t/Gy',
      businessName: 'BrewHaus Coffee Co.',
      industry: 'Retail / Specialty Coffee',
      currency: CURRENCY,
    },
  });
  console.log('  ✓ Merchant created (demo login: merchant@commercepilot.ai / password123)');

  // 2. Products (100)
  const products: Prisma.ProductCreateManyInput[] = [];
  for (let i = 0; i < NUM_PRODUCTS; i++) {
    const template = PRODUCT_TEMPLATES[i % PRODUCT_TEMPLATES.length];
    products.push({
      merchantId: merchant.id,
      name: i < PRODUCT_TEMPLATES.length ? template.name : `${template.name} — Variant ${Math.floor(i / PRODUCT_TEMPLATES.length) + 1}`,
      category: template.category,
      price: new Prisma.Decimal(rand(template.price[0], template.price[1]).toFixed(2)),
      inventory: randInt(20, 500),
    });
  }
  await prisma.product.createMany({ data: products });
  const productRecords = await prisma.product.findMany({ where: { merchantId: merchant.id } });
  const coffeeMachine = productRecords.find((p) => p.name === 'Coffee Machine');
  const coffeeGrinder = productRecords.find((p) => p.name === 'Coffee Grinder');
  console.log(`  ✓ ${NUM_PRODUCTS} products created`);

  // 3. Customers (10,000)
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Precompute customer profiles (so transactions reference them)
  type SeedCustomer = {
    id: string;
    externalId: string;
    name: string;
    email: string;
    firstPurchaseAt: Date;
    lastPurchaseAt: Date | null;
    // Behavioral profile
    baseFrequency: number; // avg purchases per month
    baseAov: number; // average order value
    isHighValue: boolean;
    isAtRisk: boolean; // pattern 2
    grinderOwner: boolean; // pattern 3
  };

  const customers: SeedCustomer[] = [];
  const customerNames: string[] = [];

  for (let i = 0; i < NUM_CUSTOMERS; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const externalId = `CUST-${(10000 + i).toString()}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;

    // Behavioral tier: 15% high value, 35% mid, 50% low
    const r = Math.random();
    const isHighValue = r < 0.15;
    const isMidValue = r < 0.5;

    // First purchase within last 12 months
    const tenureDays = randInt(30, 365);
    const firstPurchaseAt = new Date(now - tenureDays * dayMs);

    // At-risk pattern: ~12% of high/mid value customers went quiet 30+ days ago
    const isAtRisk =
      (isHighValue || isMidValue) &&
      Math.random() < (isHighValue ? PATTERN.AT_RISK_FRACTION * 2 : PATTERN.AT_RISK_FRACTION);

    // Grinder ownership (pattern 3)
    const grinderOwner = Math.random() < (coffeeMachine ? 0.42 : 0);

    const baseFrequency = isHighValue ? rand(1.5, 4) : isMidValue ? rand(0.6, 1.6) : rand(0.15, 0.6);
    const baseAov = isHighValue ? rand(2500, 8000) : isMidValue ? rand(1200, 3000) : rand(500, 1400);

    customers.push({
      id: randomUUID(),
      externalId,
      name,
      email,
      firstPurchaseAt,
      lastPurchaseAt: null,
      baseFrequency,
      baseAov,
      isHighValue,
      isAtRisk,
      grinderOwner,
    });
    customerNames.push(name);
  }
  console.log(`  ✓ ${NUM_CUSTOMERS} customer profiles computed`);

  // 3b. Insert minimal customer rows BEFORE transactions so FK references resolve.
  //     RFM/segment fields are populated later once transactions exist.
  for (let i = 0; i < customers.length; i += BATCH) {
    const batch = customers.slice(i, i + BATCH);
    await prisma.customer.createMany({
      data: batch.map((c) => ({
        id: c.id,
        merchantId: merchant.id,
        externalId: c.externalId,
        name: c.name,
        email: c.email,
        firstPurchaseAt: c.firstPurchaseAt,
      })),
      skipDuplicates: true,
    });
  }
  console.log(`  ✓ ${customers.length.toLocaleString()} customers created`);

  // 4. Transactions (50,000) spread over 12 months
  type SeedTxn = {
    merchantId: string;
    customerId: string | null;
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string;
    productId: string | null;
    createdAt: Date;
  };

  const txns: SeedTxn[] = [];

  // Track customer stats incrementally
  const custStats = new Map<string, { orders: number; spend: number; last: Date; first: Date }>();
  const custCounts = new Map<string, number>();
  for (const c of customers) {
    custStats.set(c.id, { orders: 0, spend: 0, last: c.firstPurchaseAt, first: c.firstPurchaseAt });
    custCounts.set(c.id, 0);
  }

  // Assign purchase counts per customer across history
  // Each customer has expected total orders = baseFrequency * activeMonths
  for (const c of customers) {
    // Active months: from first purchase to now (or to inactivity start if at-risk)
    let activeDays = 365 - (now - c.firstPurchaseAt.getTime()) / dayMs;
    if (c.isAtRisk) {
      // went quiet 30+ days ago
      activeDays -= 30 + randInt(10, 40);
      if (activeDays < 0) activeDays = 0;
    }
    const activeMonths = Math.max(0.2, activeDays / 30);
    let expectedOrders = Math.round(c.baseFrequency * activeMonths);
    if (expectedOrders < 1) expectedOrders = randInt(1, 2);

    // Generate purchase timestamps
    let t = c.firstPurchaseAt.getTime();
    let orders = 0;
    while (orders < expectedOrders && t < now) {
      // gap between purchases
      const gap = (30 / c.baseFrequency) * rand(0.5, 1.6) * dayMs;
      t += gap;
      if (t > now) break;
      orders++;
      const created = new Date(t);
      custStats.get(c.id)!.orders++;
      custCounts.set(c.id, custCounts.get(c.id)! + 1);
      if (created > custStats.get(c.id)!.last) custStats.get(c.id)!.last = created;
    }
  }

  // Now generate actual transaction rows
  let txnIndex = 0;
  const orderIdx = new Map<string, number>();
  for (const c of customers) {
    const count = custCounts.get(c.id)!;
    const stats = custStats.get(c.id)!;

    // Build purchase dates sorted
    const dates: number[] = [];
    let t = c.firstPurchaseAt.getTime();
    let produced = 0;
    while (produced < count) {
      const gap = (30 / Math.max(c.baseFrequency, 0.2)) * rand(0.5, 1.6) * dayMs;
      t += gap;
      if (t > now) break;
      dates.push(t);
      produced++;
    }

    for (let k = 0; k < dates.length; k++) {
      const created = new Date(dates[k]);
      stats.last = created;
      stats.orders = k + 1;

      // Recent decline (pattern 1): for all customers, last 4 weeks have fewer purchases + smaller amounts
      const ageDays = (now - dates[k]) / dayMs;
      const declineFactor = ageDays < 28 ? 1 - PATTERN.REVENUE_DECLINE_FACTOR : 1;

      // Amount varies around base AOV
      let amount = c.baseAov * rand(0.6, 1.4) * declineFactor;
      if (amount < 200) amount = rand(200, 600);

      const status: string = pick(STATUSES) ?? 'SUCCESS';

      // Product: skew by category; grinder owners buy machines w/ accessories
      let product: (typeof productRecords)[number] | undefined;
      const roll = Math.random();
      if (c.grinderOwner && roll < 0.35) {
        product = coffeeMachine ?? productRecords[0];
      } else if (roll < 0.4) {
        product = pick(productRecords);
      } else {
        // lean toward beans/coffee for non-grinder owners
        const coffeeProducts = productRecords.filter((p) => p.category === 'Coffee' || p.category === 'Tea');
        product = coffeeProducts.length ? pick(coffeeProducts) : pick(productRecords);
      }

      if (product) {
        amount = Number(product.price) * rand(0.9, 1.1) * declineFactor;
        if (amount < 200) amount = rand(200, 600);
      }

      orderIdx.set(c.id, (orderIdx.get(c.id) ?? 0) + 1);
      txns.push({
        merchantId: merchant.id,
        customerId: c.id,
        amount,
        currency: CURRENCY,
        status,
        paymentMethod: pick(PAYMENT_METHODS),
        productId: product?.id ?? null,
        createdAt: created,
      });
      txnIndex++;
    }
  }

  // Sort transactions chronologically
  txns.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Insert in batches
  for (let i = 0; i < txns.length; i += BATCH) {
    const batch = txns.slice(i, i + BATCH);
    await prisma.transaction.createMany({ data: batch, skipDuplicates: true });
  }
  console.log(`  ✓ ${txns.length.toLocaleString()} transactions created`);

  // 5. Update customer aggregates
  console.log('  Computing customer segments & RFM...');

  // Recompute customer stats from actual transactions
  const agg = await prisma.transaction.groupBy({
    by: ['customerId'],
    where: { customerId: { not: null }, status: 'SUCCESS' },
    _count: { id: true },
    _sum: { amount: true },
    _max: { createdAt: true },
    _min: { createdAt: true },
  });

  const successfulTxns = await prisma.transaction.findMany({
    where: { customerId: { not: null }, status: 'SUCCESS' },
    select: { customerId: true, amount: true, createdAt: true },
  });

  // Build per-customer purchase history for frequency/recency
  const custHistory = new Map<string, Date[]>();
  for (const t of successfulTxns) {
    if (!t.customerId) continue;
    if (!custHistory.has(t.customerId)) custHistory.set(t.customerId, []);
    custHistory.get(t.customerId)!.push(t.createdAt);
  }

  const customerData: Prisma.CustomerCreateManyInput[] = [];

  for (const c of customers) {
    const history = (custHistory.get(c.id) ?? []).sort((a, b) => a.getTime() - b.getTime());
    const stat = agg.find((a) => a.customerId === c.id);

    const orders = stat?._count.id ?? 0;
    const spend = Number(stat?._sum.amount ?? 0);
    const last = history.length ? history[history.length - 1] : c.firstPurchaseAt;
    const first = c.firstPurchaseAt;

    const daysSinceLast = Math.floor((now - last.getTime()) / dayMs);

    // RFM scoring
    const recency =
      daysSinceLast <= 7 ? 5 : daysSinceLast <= 30 ? 4 : daysSinceLast <= 60 ? 3 : daysSinceLast <= 120 ? 2 : 1;
    const frequency = orders >= 20 ? 5 : orders >= 12 ? 4 : orders >= 6 ? 3 : orders >= 3 ? 2 : 1;
    const monetary =
      spend >= 50000 ? 5 : spend >= 20000 ? 4 : spend >= 8000 ? 3 : spend >= 2000 ? 2 : 1;

    let segment = 'REGULAR';
    if (daysSinceLast > 180 || (daysSinceLast > 90 && frequency <= 2)) {
      segment = 'CHURNED';
    } else if (recency <= 2 && monetary >= 3 && frequency >= 2) {
      segment = 'AT_RISK';
    } else if (recency >= 4 && frequency >= 4 && monetary >= 4) {
      segment = 'VIP';
    } else if (recency >= 3 && frequency >= 3 && monetary >= 3) {
      segment = 'LOYAL';
    } else if (frequency <= 1 && daysSinceLast <= 45) {
      segment = 'NEW';
    }

    // Churn score: 0-100
    let churnScore = 0;
    churnScore += Math.max(0, 100 - daysSinceLast * 1.5); // recency pressure
    churnScore += Math.max(0, (5 - frequency) * 8);
    churnScore += Math.max(0, (5 - monetary) * 3);
    churnScore = Math.min(99, Math.max(1, Math.round(churnScore / 2)));

    // Deliberate boost for at-risk high value customers (pattern 2)
    if (c.isAtRisk) {
      churnScore = Math.min(99, churnScore + randInt(20, 35));
    }

    const aov = orders > 0 ? spend / orders : 0;

    customerData.push({
      id: c.id,
      merchantId: merchant.id,
      externalId: c.externalId,
      name: c.name,
      email: c.email,
      firstPurchaseAt: first,
      lastPurchaseAt: last,
      totalOrders: orders,
      totalSpend: new Prisma.Decimal(spend.toFixed(2)),
      averageOrderValue: new Prisma.Decimal(aov.toFixed(2)),
      segment,
      churnScore,
    });
  }

  // Update customers with RFM/segment aggregates (rows already exist from step 3b)
  const CHUNK = 200;
  for (let i = 0; i < customerData.length; i += CHUNK) {
    const batch = customerData.slice(i, i + CHUNK);
    await prisma.$transaction(
      batch.map((cd) =>
        prisma.customer.update({
          where: { id: cd.id },
          data: {
            lastPurchaseAt: cd.lastPurchaseAt,
            totalOrders: cd.totalOrders,
            totalSpend: cd.totalSpend,
            averageOrderValue: cd.averageOrderValue,
            segment: cd.segment,
            churnScore: cd.churnScore,
          },
        }),
      ),
    );
  }
  console.log(`  ✓ ${customerData.length.toLocaleString()} customers updated with segments`);

  // 6. Customer events (a sample for observability richness)
  const events: Prisma.CustomerEventCreateManyInput[] = [];
  const sampleCustomers = customers.slice(0, 3000);
  for (const c of sampleCustomers) {
    const n = randInt(1, 6);
    for (let k = 0; k < n; k++) {
      const eventType = pick(['PURCHASE', 'LOGIN', 'CART_ABANDONED', 'PRODUCT_VIEW', 'REFUND']);
      events.push({
        customerId: c.id,
        eventType,
        metadata: {
          source: pick(['web', 'mobile', 'email', 'campaign']),
          device: pick(['desktop', 'mobile', 'tablet']),
        },
        createdAt: new Date(now - randInt(0, 350) * dayMs),
      });
    }
  }
  for (let i = 0; i < events.length; i += BATCH) {
    await prisma.customerEvent.createMany({ data: events.slice(i, i + BATCH) });
  }
  console.log(`  ✓ ${events.length.toLocaleString()} customer events created`);

  // 7. Opportunities (pre-seeded for demo richness)
  const atRiskHighValue = customerData.filter((c) => c.segment === 'AT_RISK' || (c.churnScore ?? 0) >= 70);
  const opportunities: Prisma.OpportunityCreateManyInput[] = [
    {
      merchantId: merchant.id,
      type: 'REACTIVATION',
      title: 'Reactivate high-value customers',
      description: `${atRiskHighValue.length.toLocaleString()} high-value customers haven't purchased in 30+ days. Recovery opportunity: ₹200 cashback campaign.`,
      priority: 'HIGH',
      estimatedRevenue: new Prisma.Decimal(210000),
      confidence: 84,
      status: 'OPEN',
      metadata: { targetCount: atRiskHighValue.length, incentive: '₹200 cashback' },
    },
    {
      merchantId: merchant.id,
      type: 'REVENUE_ANOMALY',
      title: 'Revenue declined 14% this week',
      description: 'Revenue dropped compared with previous 7-day period, driven by repeat purchase rate decline.',
      priority: 'HIGH',
      estimatedRevenue: new Prisma.Decimal(180000),
      confidence: 88,
      status: 'OPEN',
      metadata: { dropPercent: 14, period: 'last_7_days' },
    },
    {
      merchantId: merchant.id,
      type: 'CROSS_SELL',
      title: 'Cross-sell Coffee Grinder to Coffee Machine buyers',
      description: `${Math.round(PATTERN.CROSS_SELL_GAP * 100)}% of Coffee Machine buyers don't own a Coffee Grinder.`,
      priority: 'MEDIUM',
      estimatedRevenue: new Prisma.Decimal(95000),
      confidence: 72,
      status: 'OPEN',
      metadata: { gapPercent: PATTERN.CROSS_SELL_GAP * 100 },
    },
    {
      merchantId: merchant.id,
      type: 'RETENTION',
      title: 'High-value customers becoming inactive',
      description: 'VIP customer purchase frequency declining; proactive retention incentive recommended.',
      priority: 'MEDIUM',
      estimatedRevenue: new Prisma.Decimal(120000),
      confidence: 76,
      status: 'OPEN',
      metadata: { segment: 'VIP' },
    },
  ];
  await prisma.opportunity.createMany({ data: opportunities });
  console.log('  ✓ 4 opportunities seeded');

  // 8. Previous campaigns (pattern 4 — for learning loop)
  const campaigns: Prisma.CampaignCreateManyInput[] = [];
  const prevCampaigns = [
    { name: 'Summer Cashback Blast', offer: '₹150 cashback', budget: 60000, expectedRevenue: 145000, expectedROI: 2.42, actualRevenue: 158000, actualROI: 2.63 },
    { name: 'Loyalty Reward Program', offer: '10% loyalty discount', budget: 45000, expectedRevenue: 98000, expectedROI: 2.18, actualRevenue: 102000, actualROI: 2.27 },
    { name: 'New Year Big Sale', offer: '20% off storewide', budget: 120000, expectedRevenue: 310000, expectedROI: 2.58, actualRevenue: 296000, actualROI: 2.47 },
    { name: 'Churn Winback Drive', offer: '₹200 cashback', budget: 82400, expectedRevenue: 210000, expectedROI: 2.55, actualRevenue: 213000, actualROI: 2.6 },
  ];

  for (let i = 0; i < prevCampaigns.length; i++) {
    const p = prevCampaigns[i];
    const createdDaysAgo = 30 + i * 40;
    const executedDaysAgo = createdDaysAgo - 3;
    const campaign = await prisma.campaign.create({
      data: {
        merchantId: merchant.id,
        name: p.name,
        description: `Previously executed campaign: ${p.offer}`,
        offer: p.offer,
        targetSegment: 'AT_RISK',
        budget: new Prisma.Decimal(p.budget),
        expectedRevenue: new Prisma.Decimal(p.expectedRevenue),
        expectedROI: new Prisma.Decimal(p.expectedROI),
        actualRevenue: new Prisma.Decimal(p.actualRevenue),
        actualROI: new Prisma.Decimal(p.actualROI),
        status: 'COMPLETED',
        scheduledAt: new Date(now - executedDaysAgo * dayMs),
        executedAt: new Date(now - executedDaysAgo * dayMs + 3 * dayMs),
        createdAt: new Date(now - createdDaysAgo * dayMs),
        predictions: {
          create: {
            predictedRevenue: new Prisma.Decimal(p.expectedRevenue),
            predictedConversions: Math.round(p.expectedRevenue / 3000),
            predictedROI: new Prisma.Decimal(p.expectedROI),
            confidence: 80 + i * 2,
          },
        },
        results: {
          create: {
            actualRevenue: new Prisma.Decimal(p.actualRevenue),
            actualConversions: Math.round(p.actualRevenue / 3000),
            actualCost: new Prisma.Decimal(p.budget),
            actualROI: new Prisma.Decimal(p.actualROI),
            predictionError: new Prisma.Decimal(Math.abs((p.actualROI - p.expectedROI) / p.expectedROI * 100).toFixed(2)),
          },
        },
      },
    });
    campaigns.push(campaign);
    console.log(`  ✓ Previous campaign: ${p.name}`);
  }

  // Cross-sell pattern 3 detail: log a few customer notifications
  if (coffeeMachine && coffeeGrinder) {
    const machineBuyers = txns.filter((t) => t.productId === coffeeMachine.id && t.status === 'SUCCESS');
    const uniqueBuyers = new Set(machineBuyers.map((t) => t.customerId));
    const withGrinder = customers.filter((c) => c.grinderOwner).length;
    const withoutGrinder = uniqueBuyers.size - withGrinder;
    console.log(
      `  📊 Pattern 3 (cross-sell): ${uniqueBuyers.size} coffee machine buyers, ~${Math.round(
        (withoutGrinder / Math.max(uniqueBuyers.size, 1)) * 100,
      )}% don't own a grinder`,
    );
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Seeding complete in ${elapsed}s`);
  console.log(`   Customers: ${customerData.length.toLocaleString()}`);
  console.log(`   Transactions: ${txns.length.toLocaleString()}`);
  console.log(`   Products: ${productRecords.length}`);
  console.log(`   Opportunities: ${opportunities.length}`);
  console.log(`   Previous campaigns: ${campaigns.length}`);
  console.log(`\n   Pattern 1 (revenue decline): last 4 weeks ~${PATTERN.REVENUE_DECLINE_FACTOR * 100}% lower`);
  console.log(`   Pattern 2 (at-risk high value): seeded in segments/churn scores`);
  console.log(`   Pattern 3 (cross-sell): coffee machine vs grinder gap`);
  console.log(`   Pattern 4 (learning): ${prevCampaigns.length} historical campaigns`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
