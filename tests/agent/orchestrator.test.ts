import { describe, it, expect } from 'vitest';
import { Orchestrator } from '@commercepilot/agents';

describe('Orchestrator — intent detection', () => {
  const orch = new Orchestrator();

  it('detects a revenue decline question', () => {
    expect(orch.detectIntent('Why is revenue declining?')).toBe('REVENUE_DECLINE');
    expect(orch.detectIntent('Our revenue dropped 14% this week')).toBe('REVENUE_DECLINE');
  });

  it('detects an at-risk customers question', () => {
    expect(orch.detectIntent('Which customers are at risk?')).toBe('AT_RISK_CUSTOMERS');
    expect(orch.detectIntent('who is likely to churn')).toBe('AT_RISK_CUSTOMERS');
  });

  it('detects a recommendation request', () => {
    expect(orch.detectIntent('What should I do today to increase revenue?')).toBe('RECOMMEND_ACTION');
  });

  it('detects a create-campaign request', () => {
    expect(orch.detectIntent('Create a campaign for high-value customers.')).toBe('CREATE_CAMPAIGN');
  });

  it('detects a revenue-recovery question', () => {
    expect(orch.detectIntent('How much revenue can we recover?')).toBe('RECOVER_REVENUE');
  });

  it('detects a business overview request', () => {
    expect(orch.detectIntent('How is my business doing overall?')).toBe('BUSINESS_OVERVIEW');
  });

  it('returns UNKNOWN for an unrelated question', () => {
    expect(orch.detectIntent('What is the weather today?')).toBe('UNKNOWN');
  });
});

describe('Orchestrator — planning', () => {
  const orch = new Orchestrator();

  it('routes revenue-decline through intelligence, customer, and revenue agents', () => {
    const plan = orch.planFor('REVENUE_DECLINE');
    expect(plan).toContain('IntelligenceAgent');
    expect(plan).toContain('CustomerAgent');
    expect(plan).toContain('RevenueAgent');
  });

  it('routes create-campaign through customer, revenue, and action agents', () => {
    const plan = orch.planFor('CREATE_CAMPAIGN');
    expect(plan).toContain('CustomerAgent');
    expect(plan).toContain('RevenueAgent');
    expect(plan).toContain('ActionAgent');
  });

  it('routes campaign-performance through the learning agent', () => {
    const plan = orch.planFor('CAMPAIGN_PERFORMANCE');
    expect(plan).toContain('LearningAgent');
  });
});
