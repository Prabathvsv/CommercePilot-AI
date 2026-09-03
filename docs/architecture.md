# Architecture

## Core Loop

```
OBSERVE → UNDERSTAND → DECIDE → ACT → MEASURE → LEARN
```

Every feature in CommercePilot serves this single loop.

## Layered Design

### 1. Data Layer (PostgreSQL via Prisma)
Stores merchants, customers, products, transactions, events, opportunities, campaigns, agent runs, tool calls, predictions, and results. Synthetic seed generates realistic, pattern-rich data.

### 2. Intelligence Engine (deterministic, LLM-free)
Pure, trusted computations that the agents reason *over* — never inventing numbers:
- Revenue metrics & trends
- RFM segmentation (VIP/LOYAL/REGULAR/NEW/AT_RISK/CHURNED)
- Churn scoring (0–100 with reasons)
- Anomaly detection (revenue/volume/AOV drops)
- ROI simulation & strategy comparison
- Policy guardrails

This is a deliberate design decision: **the LLM reasons over trusted computed data, not raw numbers.**

### 3. Agent System
Five specialized agents, each with a strict allow-list of tools:
- **Intelligence Agent** — revenue analysis, anomalies
- **Customer Agent** — segmentation, churn, targeting
- **Revenue Agent** — offers, ROI, strategy
- **Action Agent** — campaign creation (never auto-executes)
- **Learning Agent** — prediction vs actual, historical knowledge

### 4. Orchestrator
Controlled orchestration — agents can't call tools freely:
```
User Request → Intent Detection → Planning → Tool Selection → Tool Execution → Result Validation → Response
```

### 5. Approval Layer
The Action Agent creates campaigns as `PENDING_APPROVAL`. Merchant review is mandatory. Guardrails force approval for high-budget / high-discount / large-target campaigns. **There is no bypass.**

### 6. Execution Simulator
A mock commerce API that "delivers" a campaign to targeted customers and produces realized outcomes (reached, conversions, revenue, ROI) with small variance around the prediction.

### 7. Learning Loop
After execution, predicted vs actual ROI is compared, prediction error is stored, and the Learning Agent aggregates historical accuracy to inform future recommendations.

## AI Safety
- LLM → predefined tool → validated backend query (never LLM → database)
- No raw SQL generation
- Tool schemas are strict; unknown or malformed tool calls fail safely

## Observability
Every agent run and tool call is persisted (`agent_runs`, `tool_calls`) with durations, inputs, outputs, and status, powering the Agent Activity screen and structured logs.
