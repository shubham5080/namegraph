# NameGraph architecture

```
Browser (Next.js + Privy)
   │  POST /ask
   ▼
FastAPI agent
   │  GraphQL
   ▼
The Graph gateway / subgraph
```

## Components

- `frontend` — UI, Privy session (planned), demo chat
- `backend` — `/health`, `/agent`, `/ask` + Graph client
- ENS — agent identity shown in UI / text records (Mon)
- Payment — credits_charged stub → real USDC/x402 (Tue)
