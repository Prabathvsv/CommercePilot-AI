import { Request, Response } from 'express';
import { prisma } from '@commercepilot/database';
import { CampaignStatus } from '@commercepilot/shared';
import { checkPolicy, buildCampaignPlan } from '@commercepilot/agents';
import { executeApprovedCampaign } from '@commercepilot/agents';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, paginated } from '../utils/respond.js';
import { resolveMerchant } from '../middleware/auth.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const status = req.query.status as string | undefined;

  const where: Record<string, unknown> = { merchantId };
  if (status) where.status = status;

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { predictions: true, results: true },
    }),
    prisma.campaign.count({ where }),
  ]);

  paginated(
    res,
    campaigns.map((c) => ({
      ...c,
      budget: Number(c.budget),
      expectedRevenue: Number(c.expectedRevenue),
      expectedROI: Number(c.expectedROI),
      actualRevenue: c.actualRevenue ? Number(c.actualRevenue) : null,
      actualROI: c.actualROI ? Number(c.actualROI) : null,
    })),
    total,
    page,
    limit,
  );
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id, merchantId },
    include: { predictions: true, results: true, targets: { take: 10 } },
  });
  if (!campaign) throw new NotFoundError('Campaign not found');
  const result = campaign.results[0];
  const targeted = await prisma.customer.count({
    where: { merchantId, segment: campaign.targetSegment },
  });

  const numResult = (r: { actualRevenue: unknown; actualConversions: number; actualCost: unknown; actualROI: unknown; predictionError: unknown; id: string; campaignId: string; createdAt: Date }) => ({
    ...r,
    actualRevenue: Number(r.actualRevenue),
    actualCost: Number(r.actualCost),
    actualROI: Number(r.actualROI),
    predictionError: Number(r.predictionError),
  });
  const numPrediction = (p: { predictedRevenue: unknown; predictedConversions: number; predictedROI: unknown; confidence: number; id: string; campaignId: string; createdAt: Date }) => ({
    ...p,
    predictedRevenue: Number(p.predictedRevenue),
    predictedROI: Number(p.predictedROI),
  });

  ok(res, {
    ...campaign,
    results: campaign.results.map(numResult),
    predictions: campaign.predictions.map(numPrediction),
    targeted,
    reached: result ? Math.round(Number(result.actualConversions) / 0.178) : null,
    budget: Number(campaign.budget),
    expectedRevenue: Number(campaign.expectedRevenue),
    expectedROI: Number(campaign.expectedROI),
    actualRevenue: campaign.actualRevenue ? Number(campaign.actualRevenue) : null,
    actualROI: campaign.actualROI ? Number(campaign.actualROI) : null,
  });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const body = req.body;

  // Build plan if not provided
  const targetCount = Number(body.targetCount ?? 400);
  const offer = body.offer ?? '₹200 cashback';
  const plan = await buildCampaignPlan({
    merchantId,
    targetCount,
    targetSegment: body.targetSegment ?? 'AT_RISK',
    offer: { type: 'CASHBACK', value: 200 },
  });

  const budget = Number(body.budget ?? plan.budget);
  const discountPercent = /(\d+)%/.test(offer) ? Number(offer.match(/(\d+)%/)![1]) : 0;

  // Guardrail validation
  const policy = checkPolicy({ budget, targetSize: targetCount, discountPercent });

  const campaign = await prisma.campaign.create({
    data: {
      merchantId,
      opportunityId: body.opportunityId ?? null,
      name: body.name ?? plan.name,
      description: body.description ?? plan.description,
      offer,
      targetSegment: body.targetSegment ?? 'AT_RISK',
      budget,
      expectedRevenue: Number(body.expectedRevenue ?? plan.expectedRevenue),
      expectedROI: Number(body.expectedROI ?? plan.expectedROI),
      status: CampaignStatus.PENDING_APPROVAL,
    },
  });

  await prisma.prediction.create({
    data: {
      campaignId: campaign.id,
      predictedRevenue: Number(body.expectedRevenue ?? plan.expectedRevenue),
      predictedConversions: Math.round((Number(body.expectedRevenue ?? plan.expectedRevenue) / 2600)),
      predictedROI: Number(body.expectedROI ?? plan.expectedROI),
      confidence: Number(body.confidence ?? 84),
    },
  });

  ok(res, {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      budget: Number(campaign.budget),
      expectedRevenue: Number(campaign.expectedRevenue),
      expectedROI: Number(campaign.expectedROI),
    },
    policy,
  }, 201);
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, merchantId } });
  if (!campaign) throw new NotFoundError('Campaign not found');
  if (campaign.status !== CampaignStatus.PENDING_APPROVAL && campaign.status !== CampaignStatus.DRAFT) {
    throw new ValidationError(`Cannot approve campaign in status ${campaign.status}`);
  }

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: CampaignStatus.APPROVED },
  });
  ok(res, { id: updated.id, status: updated.status, message: 'Campaign approved' });
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, merchantId } });
  if (!campaign) throw new NotFoundError('Campaign not found');

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: 'DRAFT' },
  });
  ok(res, { id: updated.id, status: updated.status, message: 'Campaign rejected' });
});

// Edit campaign fields — allowed any time, regardless of status.
export const update = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, merchantId } });
  if (!campaign) throw new NotFoundError('Campaign not found');

  const body = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  const editable = [
    'name',
    'description',
    'offer',
    'targetSegment',
    'budget',
    'expectedRevenue',
    'expectedROI',
    'status',
  ] as const;
  for (const key of editable) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (Object.keys(data).length === 0) {
    throw new ValidationError('No editable fields provided');
  }

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data,
  });
  ok(res, {
    id: updated.id,
    name: updated.name,
    offer: updated.offer,
    status: updated.status,
    budget: Number(updated.budget),
    expectedRevenue: Number(updated.expectedRevenue),
    expectedROI: Number(updated.expectedROI),
    updatedAt: updated.updatedAt,
    message: 'Campaign updated',
  });
});

export const execute = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, merchantId } });
  if (!campaign) throw new NotFoundError('Campaign not found');

  // No bypass: must be approved
  if (campaign.status !== CampaignStatus.APPROVED) {
    throw new ValidationError(`Campaign must be APPROVED before execution (current: ${campaign.status}). Human approval is required.`);
  }

  const outcome = await executeApprovedCampaign(campaign.id, merchantId);
  ok(res, { campaignId: campaign.id, outcome });
});

export const pause = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, merchantId } });
  if (!campaign) throw new NotFoundError('Campaign not found');
  if (campaign.status !== CampaignStatus.RUNNING && campaign.status !== CampaignStatus.APPROVED) {
    throw new ValidationError(`Cannot pause campaign in status ${campaign.status}`);
  }
  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: CampaignStatus.PAUSED },
  });
  ok(res, { id: updated.id, status: updated.status, message: 'Campaign paused' });
});
