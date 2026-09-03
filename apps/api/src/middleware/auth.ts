import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@commercepilot/database';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';

export interface AuthPayload {
  merchantId: string;
  email: string;
}

// Augment Express Request with merchant context
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      merchant?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthPayload;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }
    const token = header.slice(7);
    const payload = verifyToken(token);
    req.merchant = payload;
    next();
  } catch (e) {
    next(e instanceof Error ? new UnauthorizedError(e.message) : e);
  }
}

// For demo convenience, allow a demo merchant to be used without login when configured
export async function resolveMerchant(req: Request): Promise<string> {
  if (req.merchant) return req.merchant.merchantId;

  // Demo fallback: find the seeded demo merchant
  const demo = await prisma.merchant.findFirst({ where: { email: 'merchant@commercepilot.ai' } });
  if (demo) return demo.id;
  throw new UnauthorizedError('No merchant context');
}
