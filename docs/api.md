# API Reference

Base URL: `/api/v1`. All endpoints (except auth) require `Authorization: Bearer <JWT>`.

## Auth

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | name, email, password, businessName, industry | Create merchant |
| POST | `/auth/login` | email, password | Login → JWT |
| POST | `/auth/refresh` | — | Refresh token |

## Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/overview` | KPIs + AI opportunities |
| GET | `/dashboard/revenue?days=&granularity=` | Revenue trend |
| GET | `/dashboard/customers` | Customer KPIs |
| GET | `/dashboard/opportunities` | Open AI opportunities |

## Customers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/customers?page=&limit=&segment=&search=` | List (paginated) |
| GET | `/customers/:id` | Detail + RFM + churn + recent txns |
| GET | `/customers/segments` | Segment distribution |
| GET | `/customers/at-risk?minScore=` | At-risk customers |
| GET | `/customers/high-value` | High-spend customers |

## Transactions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/transactions` | List (paginated, filter by status) |
| GET | `/transactions/metrics` | Revenue, AOV, success rate, methods |
| GET | `/transactions/trends` | Daily/weekly/monthly trends |
| GET | `/transactions/anomalies` | Detected anomalies |

## Opportunities

| Method | Path | Description |
|--------|------|-------------|
| GET | `/opportunities` | List |
| GET | `/opportunities/:id` | Detail + campaigns |
| POST | `/opportunities/analyze` | Run live analysis, discover new |
| POST | `/opportunities/:id/recommend` | ROI recommendation |

## Campaigns

| Method | Path | Description |
|--------|------|-------------|
| GET | `/campaigns` | List |
| GET | `/campaigns/:id` | Detail + results |
| POST | `/campaigns` | Create (PENDING_APPROVAL) |
| POST | `/campaigns/:id/approve` | Approve |
| POST | `/campaigns/:id/reject` | Reject |
| POST | `/campaigns/:id/execute` | Execute (approved only) |
| POST | `/campaigns/:id/pause` | Pause |

## AI (Copilot)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/ai/chat` | { message } | NL → agents → tool calls → reply |
| POST | `/ai/analyze-business` | — | Metrics + anomalies summary |
| POST | `/ai/generate-campaign` | targetCount, offerType, value | Campaign plan |
| POST | `/ai/estimate-roi` | targetCount, offerType, value | ROI simulation |

## Agent

| Method | Path | Description |
|--------|------|-------------|
| POST | `/agent/run` | Run a specific agent |
| GET | `/agent/runs` | Agent runs (observability) |
| GET | `/agent/runs/:id` | Run detail |
| GET | `/agent/runs/:id/tools` | Tool calls for a run |

## Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/campaigns` | Campaign performance + accuracy |
| GET | `/analytics/revenue` | Revenue metrics + trends |
| GET | `/analytics/roi` | ROI simulation |
| GET | `/analytics/predictions` | Prediction history |
