import { prisma, Prisma } from '@commercepilot/database';
import { AgentName, AgentRunStatus } from '@commercepilot/shared';
import { runTool, ToolExecutionContext } from '../tools/index.js';
import { logger } from '../logger.js';

export interface AgentResult {
  agentName: AgentName;
  task: string;
  summary: string;
  data: Record<string, unknown>;
  toolCalls: {
    toolName: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    success: boolean;
    durationMs: number;
  }[];
  durationMs: number;
  agentRunId: string;
}

export interface AgentContext {
  merchantId: string;
}

export abstract class BaseAgent {
  abstract readonly name: AgentName;
  abstract readonly description: string;
  protected readonly allowedTools: string[] = [];

  async run(task: string, input: Record<string, unknown>, ctx: AgentContext): Promise<AgentResult> {
    const start = Date.now();

    // Record agent run start
    const agentRun = await prisma.agentRun.create({
      data: {
        merchantId: ctx.merchantId,
        agentName: this.name,
        task,
        input: input as Prisma.InputJsonValue,
        status: AgentRunStatus.RUNNING,
      },
    });

    try {
      logger.info(`[${this.name}] Starting task: ${task}`, { merchantId: ctx.merchantId });
      const { summary, data, toolCalls } = await this.execute(task, input, ctx);
      const durationMs = Date.now() - start;

      // Record tool calls
      await prisma.toolCall.createMany({
        data: toolCalls.map((tc) => ({
          agentRunId: agentRun.id,
          toolName: tc.toolName,
          input: tc.input as Prisma.InputJsonValue,
          output: tc.output as Prisma.InputJsonValue,
          success: tc.success,
          durationMs: tc.durationMs,
        })),
      });

      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: { status: AgentRunStatus.COMPLETED, output: data as Prisma.InputJsonValue, durationMs },
      });

      logger.info(`[${this.name}] Completed in ${durationMs}ms`);
      return {
        agentName: this.name,
        task,
        summary,
        data,
        toolCalls,
        durationMs,
        agentRunId: agentRun.id,
      };
    } catch (e) {
      const durationMs = Date.now() - start;
      const error = e instanceof Error ? e.message : String(e);
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: { status: AgentRunStatus.FAILED, output: { error } as Prisma.InputJsonValue, durationMs },
      });
      logger.error(`[${this.name}] Failed: ${error}`);
      throw e;
    }
  }

  protected abstract execute(
    task: string,
    input: Record<string, unknown>,
    ctx: AgentContext,
  ): Promise<{ summary: string; data: Record<string, unknown>; toolCalls: AgentResult['toolCalls'] }>;

  // Helper to run an allowed tool with observability
  protected async callTool(
    toolName: string,
    toolInput: Record<string, unknown>,
    ctx: AgentContext,
  ): Promise<{ output: Record<string, unknown>; success: boolean; durationMs: number; error?: string }> {
    if (!this.allowedTools.includes(toolName)) {
      throw new Error(`${this.name} is not allowed to call tool "${toolName}"`);
    }
    const toolCtx: ToolExecutionContext = { merchantId: ctx.merchantId };
    return runTool(toolName, toolInput, toolCtx);
  }
}
