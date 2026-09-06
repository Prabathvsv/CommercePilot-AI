# CommercePilot AI

**Autonomous Agentic Growth Engine for Digital Commerce**

CommercePilot AI continuously analyzes merchant transaction and customer behavior, discovers revenue opportunities, reasons over the best intervention, executes approved growth actions through specialized AI agents, and learns from campaign outcomes.

> **This is not an AI chatbot with a dashboard.** It is an agentic decision-and-action system built around one core loop:
>
> **OBSERVE → UNDERSTAND → DECIDE → ACT → MEASURE → LEARN**

---

## The Problem

Merchants don't lack data. They lack **continuous intelligent action**. Transaction data sits in a database, but nobody turns it into a revenue-saving decision and executes it — until it's too late.

## The Solution

CommercePilot runs specialized AI agents that:

1. **Detect** revenue declines and churn before they compound
2. **Identify** which high-value customers are at risk
3. **Reason** over the best intervention (cashback vs discount vs loyalty)
4. **Simulate** expected ROI before spending a rupee
5. **Execute** approved campaigns through a simulated commerce layer
6. **Learn** from actual vs predicted outcomes to improve future decisions

## Architecture

```
                     ┌───────────────────┐
                     │ Merchant          │
                     │ Dashboard         │
                     └─────────┬─────────┘
                               │
                               ↓
                     ┌───────────────────┐
                     │ AI Copilot        │
                     └─────────┬─────────┘
                               │
                               ↓
                     ┌───────────────────┐
                     │ Agent Orchestrator│
                     └─────────┬─────────┘
              ┌────────────────┼────────────────┐
              ↓                ↓                ↓
       Intelligence       Customer          Revenue
          Agent             Agent             Agent
              │                │                │
              └────────────────┼────────────────┘
                               ↓
                         Action Agent
                               │
                               ↓
                      Approval / Guardrail
                               │
                               ↓
                       Commerce Simulator
                               │
                               ↓
                          PostgreSQL
                               │
                               ↓
                       Learning Agent
                               │
                               ↓
                     Historical Outcomes
                               │
                               └──────→ Future
                                      Decisions
```

### Agent Responsibilities

| Agent | Responsibility | Tools |
|-------|---------------|-------|
| **Intelligence** | Revenue analysis, anomaly detection, KPI trends | `getRevenueMetrics`, `detectRevenueAnomalies`, `getBusinessTrends` |
| **Customer** | Segmentation, churn prediction, targeting | `getCustomer`, `getCustomerSegments`, `calculateChurnRisk`, `getAtRiskCustomers` |
| **Revenue** | Offer generation, ROI estimation, strategy | `generateOffer`, `estimateRevenue`, `calculateCampaignROI`, `compareCampaignStrategies` |
| **Action** | Create campaigns (never auto-executes) | `createCampaign` |
| **Learning** | Prediction vs actual, accuracy, historical performance | `getCampaignResults`, `getHistoricalCampaignPerformance` |

### Human-in-the-Loop

Campaigns **never** execute automatically. The AI recommends → merchant reviews → merchant approves → action executes. Guardrails force approval for budgets > ₹50,000, discounts > 30%, or targets > 10,000 customers.

### The Key Demo Moment

Ask the Copilot *"What can I do today to increase revenue?"* and watch it:

```
Analyzing business...
  → Revenue opportunity detected
Analyzing customers...
  → 412 high-value customers at risk
Generating strategies...
  → A: 10% discount  B: ₹200 cashback  C: Loyalty reward
Simulating ROI...
  → Best: ₹200 cashback · ₹2.1L expected · 2.55× ROI · 84% confidence
Campaign generated → Awaiting merchant approval
```

Click **APPROVE** → executed → 398 reached → 71 conversions → 2.60× actual ROI → prediction error 1.96%.

---

## Features (12 MVP)

- **F1** Merchant Dashboard — revenue, growth, AOV, repeat purchase, revenue at risk, AI opportunities
- **F2** Transaction Intelligence — trends + automatic anomaly detection
- **F3** Customer Segmentation — RFM-based VIP/LOYAL/REGULAR/NEW/AT_RISK/CHURNED
- **F4** Churn Detection — 0–100 risk score with reasons
- **F5** Growth Opportunity Detection — retention, upsell, cross-sell, re-engagement, anomalies
- **F6** AI Recommendation Engine — impact, action, expected revenue/cost/ROI
- **F7** AI Campaign Generator — name, message, audience, offer, duration
- **F8** ROI Simulator — revenue, cost, profit, ROI, confidence
- **F9** Human Approval — no bypass
- **F10** Campaign Execution Simulator — mock commerce API
- **F11** Campaign Analytics — predicted vs actual with learning
- **F12** Natural Language Merchant Copilot — NL → tool calls

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Recharts, Axios, React Router |
| Backend | Node.js, TypeScript, Express, Zod, Prisma |
| Database | PostgreSQL |
| AI | Google Gemini (primary) · deterministic offline fallback (no key needed) |

The system ships with a **deterministic reasoning engine** so the full demo runs end-to-end with **zero API keys**. Add a `GEMINI_API_KEY` to upgrade intent detection and response generation to Gemini.

---

## Database Schema

10 models: `Merchant`, `Customer`, `Product`, `Transaction`, `CustomerEvent`, `Opportunity`, `Campaign`, `CampaignTarget`, `AgentRun`, `ToolCall`, `Prediction`, `CampaignResult`.

Synthetic dataset: **10,000 customers · 50,000 transactions · 100 products · 12 months history** with deliberate patterns (revenue decline, at-risk high-value customers, cross-sell gap, historical campaigns for the learning loop).

---

## API (Base: `/api/v1`)

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register` `POST /auth/login` `POST /auth/refresh` |
| Dashboard | `GET /dashboard/overview` `/revenue` `/customers` `/opportunities` |
| Customers | `GET /customers` `/customers/:id` `/segments` `/at-risk` `/high-value` |
| Transactions | `GET /transactions` `/metrics` `/trends` `/anomalies` |
| Opportunities | `GET /opportunities` `POST /analyze` `POST /:id/recommend` |
| Campaigns | `POST /campaigns` `POST /:id/approve` `/reject` `/execute` `/pause` |
| AI | `POST /ai/chat` `/analyze-business` `/generate-campaign` `/estimate-roi` |
| Agent | `POST /agent/run` `GET /agent/runs` `GET /agent/runs/:id/tools` |
| Analytics | `GET /analytics/campaigns` `/revenue` `/roi` `/predictions` |

---

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16

### 1. Install & configure

```bash
npm install
cp .env.example .env        # set your DATABASE_URL and JWT_SECRET
```

### 2. Database

```bash
npm run db:push --workspace=@commercepilot/database   # create schema
npm run db:seed --workspace=@commercepilot/database   # 10K customers, ~28K txns
```

### 3. Run

```bash
npm run dev:api     # API on :5000
npm run dev:web     # Web app on :5173
```

Open http://localhost:5173 — the app auto-logins as the demo merchant.

**Demo login:** `merchant@commercepilot.ai` / `password123`

The seed deliberately plants the interesting patterns: a ~14% revenue decline in the last 4 weeks, high-value customers going quiet (churn risk), a coffee-machine→grinder cross-sell gap, and 4 historical campaigns for the learning loop. The deterministic intelligence engine means the **full demo runs with no API key** (offline). Add a `GEMINI_API_KEY` to `.env` to switch the Copilot to Gemini for natural-language intent detection and replies.

### Docker

```bash
docker compose up --build
```

### Tests

```bash
npm test            # 40+ tests: unit, integration, agent, security, e2e
npm run lint
npm run build
```

---

## Environment Variables

```
DATABASE_URL=postgresql://USER:PASS@HOST:5432/commercepilot?schema=public
JWT_SECRET=your-secret
GEMINI_API_KEY=            # optional — enables Gemini; omit for offline deterministic mode
OLLAMA_BASE_URL=           # optional local fallback
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

`.env` is never committed. Provide `.env.example`.

---

## Security

- JWT authentication with merchant-level isolation
- Zod input validation on every route
- Helmet, CORS allow-list, rate limiting
- **LLM never touches the database** — LLM → predefined tool → validated backend query
- No raw SQL generation by AI
- Mandatory human approval before any execution

---

## Screens

1. **Overview** — KPIs, revenue trend, AI opportunities
2. **Customers** — table with segment filters + churn
3. **AI Opportunities** — discovered revenue opportunities
4. **Opportunity Detail** — why the AI recommended it + ROI
5. **Campaign Builder** — AI-generated campaign → approve
6. **Campaign Results** — execution + predicted vs actual
7. **Agent Activity** — full agent/tool-call observability
8. **Analytics** — prediction accuracy across campaigns

Plus the floating **Merchant Copilot** chat panel on every screen.

---

## Future Improvements

- Real payment/campaign provider adapters (Razorpay, email/SMS)
- Production LLM fine-tuning from campaign outcomes
- Multi-channel execution (email, push, in-app)
- Automated A/B testing of offers
- Time-series forecasting for revenue

---

## License

MIT
