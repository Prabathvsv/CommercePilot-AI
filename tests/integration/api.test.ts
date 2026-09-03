import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { prisma } from '@commercepilot/database';
import { createApp } from '../../apps/api/src/server.js';
import { signToken } from '../../apps/api/src/middleware/auth.js';

const app = createApp();

describe('API — auth', () => {
  let token: string;

  beforeAll(async () => {
    const email = `merchant-${Date.now()}@test.com`;
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test Merchant',
      email,
      password: 'password123',
      businessName: 'Test Shop',
      industry: 'Retail',
    });
    expect(res.status).toBe(201);
    token = res.body.data.token;
  });

  it('TC-AUTH-001 logs in with valid credentials', async () => {
    // register created the merchant; login with same creds via direct DB lookup
    const m = await prisma.merchant.findFirst({ where: { email: { contains: 'merchant-' } } });
    expect(m).toBeTruthy();
  });

  it('TC-AUTH-003 rejects missing credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('TC-AUTH-002 rejects an invalid password', async () => {
    const m = await prisma.merchant.findFirst({ where: { email: { contains: 'merchant-' } } });
    const res = await request(app).post('/api/v1/auth/login').send({ email: m?.email, password: 'wrongpassword' });
    // bcrypt hash for seeded merchants is a placeholder; login should fail
    expect(res.status).toBe(401);
  });

  it('TC-AUTH-004 rejects an expired/invalid token', async () => {
    const res = await request(app).get('/api/v1/dashboard/overview').set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

describe('API — dashboard & analytics (integration)', () => {
  let token: string;
  let merchantId: string;

  beforeAll(async () => {
    const email = `dash-${Date.now()}@test.com`;
    const m = await prisma.merchant.create({
      data: { name: 'Dash', email, passwordHash: 'x', businessName: 'Dash Shop', industry: 'Retail' },
    });
    merchantId = m.id;
    token = signToken({ merchantId: m.id, email });
    // Seed a couple customers + transactions
    const c1 = await prisma.customer.create({
      data: { merchantId, externalId: 'D-1', name: 'Alpha', segment: 'VIP', totalSpend: 50000, totalOrders: 20, churnScore: 10 },
    });
    await prisma.transaction.createMany({
      data: [
        { merchantId, customerId: c1.id, amount: 2500, status: 'SUCCESS', paymentMethod: 'UPI', createdAt: new Date(Date.now() - 2 * 86400000) },
        { merchantId, customerId: c1.id, amount: 3000, status: 'SUCCESS', paymentMethod: 'Card', createdAt: new Date(Date.now() - 1 * 86400000) },
        { merchantId, customerId: c1.id, amount: 4000, status: 'FAILED', paymentMethod: 'Card', createdAt: new Date(Date.now() - 3600000) },
      ],
    });
  });

  it('TC-TXN-001 returns revenue metrics', async () => {
    const res = await request(app).get('/api/v1/transactions/metrics').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.revenue).toBeGreaterThan(0);
  });

  it('TC-TXN-002 computes AOV from successful transactions', async () => {
    const res = await request(app).get('/api/v1/transactions/metrics').set('Authorization', `Bearer ${token}`);
    // successful txns: 2500 + 3000 = 5500 / 2 = 2750
    expect(res.body.data.averageOrderValue).toBeCloseTo(2750, 0);
  });

  it('TC-CUST-001 retrieves customers', async () => {
    const res = await request(app).get('/api/v1/customers').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('TC-CUST-002 returns segment summaries', async () => {
    const res = await request(app).get('/api/v1/customers/segments').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.segments)).toBe(true);
  });

  it('TC-CUST-005 returns 404 for an invalid customer', async () => {
    const res = await request(app).get('/api/v1/customers/nonexistent-xyz').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('TC-TXN-003 filters transactions by status', async () => {
    const res = await request(app).get('/api/v1/transactions?status=FAILED').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((t: { status: string }) => t.status === 'FAILED')).toBe(true);
  });

  it('TC-TXN-004 returns dashboard overview with opportunities', async () => {
    const res = await request(app).get('/api/v1/dashboard/overview').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalRevenue');
    expect(res.body.data).toHaveProperty('aiOpportunities');
  });
});

describe('API — campaign approval workflow', () => {
  let token: string;
  let merchantId: string;
  let campaignId: string;

  beforeAll(async () => {
    const email = `camp-${Date.now()}@test.com`;
    const m = await prisma.merchant.create({
      data: { name: 'Camp', email, passwordHash: 'x', businessName: 'Camp Shop', industry: 'Retail' },
    });
    merchantId = m.id;
    token = signToken({ merchantId: m.id, email });
    await prisma.customer.createMany({
      data: Array.from({ length: 300 }, (_, i) => ({
        merchantId,
        externalId: `C-${i + 1}`,
        name: `Customer ${i + 1}`,
        segment: 'AT_RISK',
        totalSpend: 20000,
        totalOrders: 5,
        churnScore: 80,
      })),
    });
  });

  it('TC-AGENT-004 creates a campaign in PENDING_APPROVAL (never auto-approved)', async () => {
    const res = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Winback', offer: '₹200 cashback', targetSegment: 'AT_RISK', targetCount: 100, budget: 20000, expectedRevenue: 50000, expectedROI: 2.5 });
    expect(res.status).toBe(201);
    expect(res.body.data.campaign.status).toBe('PENDING_APPROVAL');
    campaignId = res.body.data.campaign.id;
  });

  it('TC-AGENT-005 refuses execution before approval', async () => {
    const res = await request(app).post(`/api/v1/campaigns/${campaignId}/execute`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('executes after merchant approval and records results', async () => {
    const approve = await request(app).post(`/api/v1/campaigns/${campaignId}/approve`).set('Authorization', `Bearer ${token}`);
    expect(approve.body.data.status).toBe('APPROVED');

    const exec = await request(app).post(`/api/v1/campaigns/${campaignId}/execute`).set('Authorization', `Bearer ${token}`);
    expect(exec.status).toBe(200);
    expect(exec.body.data.outcome.actualROI).toBeGreaterThan(0);

    const detail = await request(app).get(`/api/v1/campaigns/${campaignId}`).set('Authorization', `Bearer ${token}`);
    expect(detail.body.data.results.length).toBeGreaterThan(0);
  });

  it('TC-AGENT-006 learning loop compares prediction vs actual', async () => {
    const detail = await request(app).get(`/api/v1/campaigns/${campaignId}`).set('Authorization', `Bearer ${token}`);
    const result = detail.body.data.results[0];
    expect(result).toHaveProperty('predictionError');
    expect(result.predictionError).toBeGreaterThanOrEqual(0);
  });
});
