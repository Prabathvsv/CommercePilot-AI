import { z } from 'zod';
import { CampaignStatus } from '@commercepilot/shared';

export const createCampaignSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  offer: z.string().optional(),
  targetSegment: z.string().optional(),
  targetCount: z.coerce.number().int().positive().optional(),
  budget: z.coerce.number().nonnegative().optional(),
  expectedRevenue: z.coerce.number().nonnegative().optional(),
  expectedROI: z.coerce.number().nonnegative().optional(),
  confidence: z.coerce.number().min(0).max(100).optional(),
  opportunityId: z.string().optional(),
});

export const campaignIdParams = z.object({
  id: z.string().min(1),
});

export const updateCampaignSchema = z.object({
  status: z.nativeEnum(CampaignStatus).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  offer: z.string().optional(),
  targetSegment: z.string().optional(),
  budget: z.coerce.number().nonnegative().optional(),
  expectedRevenue: z.coerce.number().nonnegative().optional(),
  expectedROI: z.coerce.number().nonnegative().optional(),
});
