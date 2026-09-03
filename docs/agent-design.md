# Agent Design

## Philosophy
CommercePilot uses a **controlled orchestrator** rather than free-form agent autonomy. Each agent owns a bounded responsibility and a strict tool allow-list. The orchestrator decides which agents run for a given intent.

## Tool Calling Contract
```
LLM / Orchestrator
        ↓
   Tool (strict schema)
        ↓
   Backend service (validated query)
        ↓
   PostgreSQL
        ↓
   Validated result
        ↓
   LLM / Orchestrator
```

The LLM never accesses the database directly and never generates SQL.

## Intents
The deterministic intent detector maps natural language to a plan:

| Intent | Agents Run |
|--------|-----------|
| `REVENUE_DECLINE` | Intelligence → Customer → Revenue |
| `AT_RISK_CUSTOMERS` | Customer |
| `RECOMMEND_ACTION` | Intelligence → Customer → Revenue |
| `RECOVER_REVENUE` | Intelligence → Customer → Revenue |
| `CREATE_CAMPAIGN` | Customer → Revenue → Action |
| `CAMPAIGN_PERFORMANCE` | Learning |
| `CUSTOMER_SEGMENTS` | Customer |
| `BUSINESS_OVERVIEW` | Intelligence |
| `CROSS_SELL` | Customer → Revenue |

## Agent Implementations
Each agent records an `AgentRun` row and each tool call a `ToolCall` row for full observability, including duration.

### Action Agent Guardrails
```
Campaign budget > ₹50,000        → mandatory approval
Discount > 30%                   → mandatory approval
Target > 10,000 customers        → mandatory approval
```
Campaigns are always created `PENDING_APPROVAL`; the Action Agent **cannot** execute.

## Deterministic vs LLM mode
- **Deterministic (default, offline):** intent detection + reply composition are rule-based over trusted analytics. The full demo works with no API key.
- **Gemini:** intent detection and natural-language responses are delegated to the LLM while tool execution remains deterministic and validated.

## Learning Agent
Compares predicted vs actual ROI, computes prediction error, and aggregates historical accuracy to tune future conversion baselines (e.g., cashback historically outperforms flat discounts).
