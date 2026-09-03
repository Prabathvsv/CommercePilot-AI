export const DEFAULT_MERCHANT_ID = 'merchant-001';

export const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const SEGMENT_WEIGHTS = {
  VIP: { recencyMin: 4, frequencyMin: 4, monetaryMin: 4 },
  LOYAL: { recencyMin: 3, frequencyMin: 3, monetaryMin: 3 },
  REGULAR: { recencyMin: 2, frequencyMin: 2, monetaryMin: 2 },
  NEW: { recencyMin: 4, frequencyMin: 1, monetaryMin: 1 },
  AT_RISK: { recencyMin: 1, frequencyMin: 2, monetaryMin: 3 },
  CHURNED: { recencyMin: 1, frequencyMin: 1, monetaryMin: 1 },
} as const;

export const CHURN_THRESHOLDS = {
  HIGH_RISK: 70,
  MEDIUM_RISK: 50,
  LOW_RISK: 30,
} as const;

export const GUARDRAILS = {
  MANDATORY_APPROVAL_BUDGET: 50000,
  MANDATORY_APPROVAL_DISCOUNT: 30,
  MANDATORY_APPROVAL_TARGET_SIZE: 10000,
} as const;

export const ANOMALY_THRESHOLDS = {
  REVENUE_DROP_PERCENT: 10,
  VOLUME_DROP_PERCENT: 15,
  AOV_DROP_PERCENT: 8,
} as const;

export const OPPORTUNITY_PRIORITIES = {
  HIGH: { minEstimatedRevenue: 100000, minConfidence: 70 },
  MEDIUM: { minEstimatedRevenue: 50000, minConfidence: 50 },
  LOW: { minEstimatedRevenue: 0, minConfidence: 0 },
} as const;
