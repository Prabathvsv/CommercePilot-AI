import { z } from 'zod';
import { AgentName } from '@commercepilot/shared';

export const runAgentSchema = z.object({
  agentName: z.nativeEnum(AgentName),
  task: z.string().optional(),
  input: z.record(z.unknown()).optional(),
});
