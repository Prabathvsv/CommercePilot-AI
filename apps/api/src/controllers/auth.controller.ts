import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@commercepilot/database';
import { signToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { UnauthorizedError, ConflictError } from '../utils/errors.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, businessName, industry } = req.body;

  const existing = await prisma.merchant.findUnique({ where: { email } });
  if (existing) throw new ConflictError('A merchant with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const merchant = await prisma.merchant.create({
    data: { name, email, passwordHash, businessName, industry: industry ?? 'Retail' },
  });

  const token = signToken({ merchantId: merchant.id, email: merchant.email });
  ok(res, {
    token,
    merchant: { id: merchant.id, name: merchant.name, email: merchant.email, businessName: merchant.businessName },
  }, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const merchant = await prisma.merchant.findUnique({ where: { email } });
  if (!merchant) throw new UnauthorizedError('Invalid credentials');

  const valid = await bcrypt.compare(password, merchant.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  const token = signToken({ merchantId: merchant.id, email: merchant.email });
  ok(res, {
    token,
    merchant: { id: merchant.id, name: merchant.name, email: merchant.email, businessName: merchant.businessName },
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const merchant = req.merchant;
  if (!merchant) throw new UnauthorizedError('Unauthorized');
  const token = signToken({ merchantId: merchant.merchantId, email: merchant.email });
  ok(res, { token });
});
