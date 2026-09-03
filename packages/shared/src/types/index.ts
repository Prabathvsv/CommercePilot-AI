// ─── Enums ───────────────────────────────────────────

export enum CustomerSegment {
  VIP = 'VIP',
  LOYAL = 'LOYAL',
  REGULAR = 'REGULAR',
  NEW = 'NEW',
  AT_RISK = 'AT_RISK',
  CHURNED = 'CHURNED',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
}

export enum OpportunityType {
  RETENTION = 'RETENTION',
  UPSELL = 'UPSELL',
  CROSS_SELL = 'CROSS_SELL',
  REACTIVATION = 'REACTIVATION',
  REVENUE_ANOMALY = 'REVENUE_ANOMALY',
}

export enum TransactionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  REFUNDED = 'REFUNDED',
}

export enum CustomerEventType {
  PURCHASE = 'PURCHASE',
  LOGIN = 'LOGIN',
  CART_ABANDONED = 'CART_ABANDONED',
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  REFUND = 'REFUND',
}

export enum AgentName {
  INTELLIGENCE = 'IntelligenceAgent',
  CUSTOMER = 'CustomerAgent',
  REVENUE = 'RevenueAgent',
  ACTION = 'ActionAgent',
  LEARNING = 'LearningAgent',
}

export enum AgentRunStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// ─── Dashboard ───────────────────────────────────────

export interface DashboardOverview {
  totalRevenue: number;
  revenueGrowth: number;
  totalTransactions: number;
  averageOrderValue: number;
  activeCustomers: number;
  repeatPurchaseRate: number;
  conversionRate: number;
  revenueAtRisk: number;
  aiOpportunities: AIOpportunity[];
}

export interface AIOpportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedRevenue: number;
  confidence: number;
}

// ─── Revenue ─────────────────────────────────────────

export interface RevenueMetrics {
  revenue: number;
  growthRate: number;
  transactionCount: number;
  averageOrderValue: number;
  paymentSuccessRate: number;
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  transactions: number;
  aov: number;
}

export interface RevenueAnomaly {
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

// ─── Customer ────────────────────────────────────────

export interface CustomerProfile {
  id: string;
  externalId: string;
  name: string;
  email: string;
  segment: CustomerSegment;
  churnScore: number;
  totalOrders: number;
  totalSpend: number;
  averageOrderValue: number;
  lastPurchaseAt: Date | null;
  daysSinceLastPurchase: number | null;
}

export interface CustomerSegmentSummary {
  segment: CustomerSegment;
  count: number;
  totalRevenue: number;
  averageSpend: number;
}

export interface ChurnRisk {
  customerId: string;
  customerName: string;
  churnProbability: number;
  reasons: string[];
  historicalValue: number;
}

// ─── RFM ─────────────────────────────────────────────

export interface RFMScore {
  recency: number; // 1-5
  frequency: number; // 1-5
  monetary: number; // 1-5
  segment: CustomerSegment;
}

// ─── Campaign ────────────────────────────────────────

export interface CampaignPlan {
  name: string;
  description: string;
  offer: string;
  targetSegment: CustomerSegment;
  targetCount: number;
  budget: number;
  expectedRevenue: number;
  expectedROI: number;
  duration: number; // days
  confidence: number;
}

export interface CampaignResult {
  targeted: number;
  reached: number;
  conversions: number;
  revenue: number;
  cost: number;
  actualROI: number;
}

export interface ROISimulation {
  expectedRevenue: number;
  campaignCost: number;
  incrementalProfit: number;
  expectedROI: number;
  confidence: number;
  conversionRate: number;
}

// ─── Agent ───────────────────────────────────────────

export interface AgentToolCall {
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  success: boolean;
  durationMs: number;
}

export interface AgentRun {
  id: string;
  merchantId: string;
  agentName: AgentName;
  task: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status: AgentRunStatus;
  durationMs: number;
  toolCalls: AgentToolCall[];
  createdAt: Date;
}

// ─── Copilot ─────────────────────────────────────────

export interface CopilotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: AgentToolCall[];
}

export interface CopilotRequest {
  message: string;
  merchantId: string;
}

export interface CopilotResponse {
  reply: string;
  toolCalls: AgentToolCall[];
  agentRuns: AgentRun[];
}

// ─── API Response ────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
