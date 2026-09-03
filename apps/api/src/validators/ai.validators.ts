import { z } from 'zod';

export const chatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
});

export const generateCampaignSchema = z.object({
  targetCount: z.coerce.number().int().positive().optional(),
  offerType: z.enum(['CASHBACK', 'DISCOUNT', 'LOYALTY', 'FREE_SHIPPING']).optional(),
  value: z.coerce.number().nonnegative().optional(),
});

export const estimateRoiSchema = z.object({
  targetCount: z.coerce.number().int().positive().optional(),
  offerType: z.enum(['CASHBACK', 'DISCOUNT', 'LOYALTY', 'FREE_SHIPPING']).optional(),
  value: z.coerce.number().nonnegative().optional(),
});
