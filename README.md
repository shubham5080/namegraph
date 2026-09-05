# NameGraph

**ENS-named agents that pay to query [The Graph](https://thegraph.com) for live onchain answers.**

Built at **ETHOnline 2026** (Classic / From Scratch).

## What it is

`namegraph.eth` is an onchain research agent:

1. You ask in plain language  
2. The agent routes to the right Graph subgraph (Uniswap V3 or ENS)  
3. A credit is charged (Privy wallet next)  
4. You get an answer **plus a query receipt**

This is the agent interface to The Graph — not a trading dashboard.

## Partners

| Partner | Role |
|---------|------|
| **The Graph** | Multi-subgraph live queries + receipts |
| **ENS** | Agent identity (`namegraph.eth`) |
| **Privy** | Wallet login → `paid_by` on query receipts |

## Quick start

```bash
# both servers
./scripts/dev.sh
```

Or separately:

```bash
# backend
cd backend && source .venv/bin/activate
cp .env.example .env   # add GRAPH_API_KEY
uvicorn app.main:app --reload --port 8000

# frontend
cd frontend && npm install
cp .env.example .env.local
# set NEXT_PUBLIC_PRIVY_APP_ID from https://dashboard.privy.io
npm run dev
```

Open http://localhost:3000

## Demo path (≤4 min)

1. Show `namegraph.eth` identity card  
2. **Connect wallet** (Privy)  
3. Ask: Uniswap pool count  
4. Ask: `Look up vitalik.eth`  
5. Open the **receipt** — `paid_by` is your wallet, plus subgraph + proof  
6. Credits / top-up

## Docs

- [`PLAN.md`](./PLAN.md) — elevated build plan  
- [`AI_USAGE.md`](./AI_USAGE.md) — AI disclosure  
- [`FEEDBACK.md`](./FEEDBACK.md) — partner DX notes  

## License

MIT
