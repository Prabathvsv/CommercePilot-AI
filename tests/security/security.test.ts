import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { prisma } from '@commercepilot/database';
import { createApp } from '../../apps/api/src/server.js';
import { signToken } from '../../apps/api/src/middleware/auth.js';

const app = createApp();

describe('Security — authentication & authorization', () => {
  let merchantA: string;
  let merchantB: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    // Create two merchants for isolation tests
    const a = await prisma.merchant.create({
      data: { name: 'A', email: `a-${Date.now()}@test.com`, passwordHash: 'x', businessName: 'Biz A', industry: 'Retail' },
    });
    const b = await prisma.merchant.create({
      data: { name: 'B', email: `b-${Date.now()}@test.com`, passwordHash: 'x', businessName: 'Biz B', industry: 'Retail' },
    });
    merchantA = a.id;
    merchantB = b.id;
    tokenA = signToken({ merchantId: a.id, email: a.email });
    tokenB = signToken({ merchantId: b.id, email: b.email });
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/v1/customers');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid JWT', async () => {
    const res = await request(app).get('/api/v1/customers').set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed auth header', async () => {
    const res = await request(app).get('/api/v1/customers').set('Authorization', 'Basic abc123');
    expect(res.status).toBe(401);
  });

  it('accepts a valid token', async () => {
    const res = await request(app).get('/api/v1/customers').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('prevents merchant A from seeing merchant B customers (isolation)', async () => {
    await prisma.customer.create({
      data: { merchantId: merchantB, externalId: 'B-SEC-1', name: 'Secret B Customer', segment: 'REGULAR', totalSpend: 999, totalOrders: 1 },
    });
    const res = await request(app).get('/api/v1/customers').set('Authorization', `Bearer ${tokenA}`);
    const names = res.body.data.map((c: { name: string }) => c.name);
    expect(names).not.toContain('Secret B Customer');
  });

  it('returns 404 when merchant A requests merchant B campaign by id', async () => {
    const campB = await prisma.campaign.create({
      data: { merchantId: merchantB, name: 'B private campaign', description: 'private', offer: 'x', targetSegment: 'REGULAR', status: 'DRAFT' },
    });
    const res = await request(app).get(`/api/v1/campaigns/${campB.id}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });

  it('blocks executing an unapproved campaign (no bypass)', async () => {
    const camp = await prisma.campaign.create({
      data: { merchantId: merchantA, name: 'Unapproved', description: 'unapproved', offer: '₹200 cashback', targetSegment: 'AT_RISK', status: 'DRAFT' },
    });
    const res = await request(app).post(`/api/v1/campaigns/${camp.id}/execute`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/approv/i);
  });

  it('rejects malformed body with 400 (Zod validation)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: '' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });
});
