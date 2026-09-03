import { ToolDefinition } from '../providers/index.js';

// Shared tool schema definitions exposed to the LLM.
export const TOOLS: ToolDefinition[] = [
  {
    name: 'get_revenue_metrics',
    description: 'Get revenue, growth rate, transaction count, and average order value for a merchant over a period.',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string', description: 'Merchant id' },
        periodDays: { type: 'number', description: 'Number of days to look back (default 30)' },
      },
      required: ['merchantId'],
    },
  },
  {
    name: 'get_transaction_metrics',
    description: 'Get transaction metrics including trends, payment status breakdown, and payment methods.',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
        days: { type: 'number', default: 30 },
      },
      required: ['merchantId'],
    },
  },
  {
    name: 'detect_revenue_anomalies',
    description: 'Detect unusual changes in revenue, transaction volume, and average order value.',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
      },
      required: ['merchantId'],
    },
  },
  {
    name: 'get_business_trends',
    description: 'Get daily/weekly/monthly revenue trends.',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
        days: { type: 'number', default: 30 },
        granularity: { type: 'string', enum: ['day', 'week', 'month'], default: 'day' },
      },
      required: ['merchantId'],
    },
  },
  {
    name: 'get_customer',
    description: 'Get a single customer profile by id or external id.',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
        customerId: { type: 'string', description: 'Customer id or external id like CUST-10482' },
      },
      required: ['merchantId', 'customerId'],
    },
  },
  {
    name: 'get_customer_segments',
    description: 'Get customer segment distribution (VIP, LOYAL, REGULAR, NEW, AT_RISK, CHURNED).',
    parameters: {
      type: 'object',
      properties: { merchantId: { type: 'string' } },
      required: ['merchantId'],
    },
  },
  {
    name: 'calculate_churn_risk',
    description: 'Calculate churn risk for customers, returns a 0-100 probability with reasons.',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
        minChurnScore: { type: 'number', default: 50 },
        limit: { type: 'number', default: 100 },
      },
      required: ['merchantId'],
    },
  },
  {
    name: 'get_high_value_customers',
    description: 'Get the highest spend customers.',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
        minSpend: { type: 'number', default: 15000 },
        limit: { type: 'number', default: 100 },
      },
      required: ['merchantId'],
    },
  },
  {
    name: 'get_at_risk_customers',
    description: 'Get high-value customers at risk of churning.',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
        limit: { type: 'number', default: 100 },
      },
      required: ['merchantId'],
    },
  },
  {
    name: 'generate_offer',
    description: 'Generate an offer/strategy for a campaign.',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
        targetCount: { type: 'number' },
        offerType: { type: 'string', enum: ['CASHBACK', 'DISCOUNT', 'LOYALTY', 'FREE_SHIPPING'] },
        value: { type: 'number' },
      },
      required: ['merchantId', 'targetCount', 'offerType'],
    },
  },
  {
    name: 'estimate_revenue',
    description: 'Estimate expected revenue, cost, and ROI for a campaign.',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
        targetCount: { type: 'number' },
        offerType: { type: 'string', enum: ['CASHBACK', 'DISCOUNT', 'LOYALTY', 'FREE_SHIPPING'] },
        value: { type: 'number' },
      },
      required: ['merchantId', 'targetCount', 'offerType'],
    },
  },
  {
    name: 'calculate_campaign_roi',
    description: 'Calculate expected ROI for a campaign.',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
        targetCount: { type: 'number' },
        offerType: { type: 'string', enum: ['CASHBACK', 'DISCOUNT', 'LOYALTY', 'FREE_SHIPPING'] },
        value: { type: 'number' },
      },
      required: ['merchantId', 'targetCount', 'offerType'],
    },
  },
  {
    name: 'compare_campaign_strategies',
    description: 'Compare multiple campaign strategies and return the best by ROI.',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
        targetCount: { type: 'number' },
      },
      required: ['merchantId', 'targetCount'],
    },
  },
  {
    name: 'create_campaign',
    description: 'Create a new campaign (as DRAFT or PENDING_APPROVAL).',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
        name: { type: 'string' },
        offer: { type: 'string' },
        targetSegment: { type: 'string' },
        targetCount: { type: 'number' },
        budget: { type: 'number' },
        expectedRevenue: { type: 'number' },
        expectedROI: { type: 'number' },
      },
      required: ['merchantId', 'name', 'offer', 'targetSegment'],
    },
  },
  {
    name: 'get_campaign_results',
    description: 'Get actual results and prediction accuracy for a completed campaign.',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
        campaignId: { type: 'string' },
      },
      required: ['merchantId', 'campaignId'],
    },
  },
  {
    name: 'get_historical_campaign_performance',
    description: 'Get historical campaign performance to inform future predictions.',
    parameters: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
      },
      required: ['merchantId'],
    },
  },
];
