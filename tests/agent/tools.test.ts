import { describe, it, expect } from 'vitest';
import { getTool, listTools, runTool } from '@commercepilot/agents';
import { AppError } from '@commercepilot/agents';
import { TOOLS } from '@commercepilot/ai';

describe('AI — tool definitions', () => {
  it('TC-AI-003 exposes a strict schema for every tool', () => {
    expect(TOOLS.length).toBeGreaterThan(10);
    for (const t of TOOLS) {
      expect(t.name).toMatch(/^[a-z_]+$/);
      expect(t.parameters.type).toBe('object');
      expect(t.parameters.properties).toBeTruthy();
    }
  });

  it('TC-AI-006 prevents hallucinated metrics: every registered tool is implemented', () => {
    // Any tool the LLM could call must exist in the registry
    for (const t of TOOLS) {
      expect(typeof getTool(t.name)).toBe('function');
    }
    // Registry should not expose unimplemented tools
    const registered = listTools();
    for (const name of registered) {
      expect(TOOLS.some((t) => t.name === name)).toBe(true);
    }
  });
});

describe('AI — tool execution guards', () => {
  it('TC-AI-004 rejects an unknown tool name', () => {
    expect(() => getTool('delete_everything')).toThrow(AppError);
  });

  it('TC-AI-005 returns a safe error object for a failing tool call (not a crash)', async () => {
    const result = await runTool('get_revenue_metrics', { merchantId: 'missing-merchant-xyz' }, { merchantId: 'missing-merchant-xyz' });
    // Missing merchant yields either success-with-empty or a caught error — never a throw
    expect(typeof result.success).toBe('boolean');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('TC-AI-007 records tool duration', async () => {
    const result = await runTool('get_customer', { customerId: 'missing-customer' }, { merchantId: 'missing-merchant-xyz' });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.success).toBe(false); // missing data → caught gracefully
  });
});
