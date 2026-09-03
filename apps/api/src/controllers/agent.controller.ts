import { Request, Response } from 'express';
import { prisma } from '@commercepilot/database';
import { AgentName } from '@commercepilot/shared';
import { IntelligenceAgent, CustomerAgent, RevenueAgent, ActionAgent, LearningAgent } from '@commercepilot/agents';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { resolveMerchant } from '../middleware/auth.js';
import { NotFoundError } from '../utils/errors.js';

const agents = {
  [AgentName.INTELLIGENCE]: new IntelligenceAgent(),
  [AgentName.CUSTOMER]: new CustomerAgent(),
  [AgentName.REVENUE]: new RevenueAgent(),
  [AgentName.ACTION]: new ActionAgent(),
  [AgentName.LEARNING]: new LearningAgent(),
};

export const run = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const agentName = req.body.agentName as AgentName;
  const task = String(req.body.task ?? 'Analyze business');
  const input = (req.body.input as Record<string, unknown>) ?? {};

  const agent = agents[agentName];
  if (!agent) {
    res.status(400).json({ success: false, message: `Unknown agent: ${agentName}` });
    return;
  }

  const result = await agent.run(task, input, { merchantId });
  ok(res, result);
});

export const listRuns = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const limit = Math.min(100, Number(req.query.limit ?? 20));
  const runs = await prisma.agentRun.findMany({
    where: { merchantId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { toolCalls: true },
  });
  ok(res, { runs });
});

export const getRun = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const run = await prisma.agentRun.findFirst({
    where: { id: req.params.id, merchantId },
    include: { toolCalls: { orderBy: { createdAt: 'asc' } } },
  });
  if (!run) throw new NotFoundError('Agent run not found');
  ok(res, { run });
});

export const getRunTools = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = await resolveMerchant(req);
  const run = await prisma.agentRun.findFirst({ where: { id: req.params.id, merchantId } });
  if (!run) throw new NotFoundError('Agent run not found');
  const toolCalls = await prisma.toolCall.findMany({
    where: { agentRunId: run.id },
    orderBy: { createdAt: 'asc' },
  });
  ok(res, { toolCalls });
});
