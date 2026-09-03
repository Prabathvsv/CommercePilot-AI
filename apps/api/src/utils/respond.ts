import { Response } from 'express';
import { ApiResponse } from '@commercepilot/shared';

export function ok<T>(res: Response, data: T, status = 200): void {
  const body: ApiResponse<T> = { success: true, data };
  res.status(status).json(body);
}

export function paginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
): void {
  res.json({
    success: true,
    data: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export function fail(res: Response, message: string, status = 400, error?: string): void {
  const body: ApiResponse<null> = { success: false, error, message };
  res.status(status).json(body);
}
