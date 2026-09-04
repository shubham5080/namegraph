# NameGraph 🔎

**ENS-named AI agents that pay to query [The Graph](https://thegraph.com) for live onchain answers.**

Built at **ETHOnline 2026** (Classic / From Scratch track).

## One-liner

An agent with an ENS identity uses a Privy wallet session and pays to fetch real onchain data from The Graph — then answers in plain language.

## Partners we target

| Partner | How we use it |
|---------|----------------|
| **The Graph** | Live Subgraph / Token API / GraphQL queries |
| **ENS** | Agent name + text records (identity) |
| **Privy** | Embedded wallet / login |

## Architecture

```
User → Privy login
     → Agent identity (ENS)
     → Pay / credit step
     → The Graph query
     → Answer + receipt
```

```
frontend/   Next.js + Privy UI
backend/    FastAPI agent + Graph client
```

## Quick start

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000

### One command (both servers)

```bash
./scripts/dev.sh
```

## Demo credits

Each ask costs **1 credit**. New browser sessions start with **10 credits**.
Use **Top up (+5)** in the UI until Privy payments are wired in.

## Demo script (≤4 min)

1. Show agent ENS name
2. Privy login
3. Ask a question
4. Show payment / credit step
5. Show Graph-backed answer

## Docs in this repo

- [`PLAN.md`](./PLAN.md) — build plan by date
- [`AI_USAGE.md`](./AI_USAGE.md) — how AI was used (ETHOnline requirement)
- [`FEEDBACK.md`](./FEEDBACK.md) — partner DX notes

## License

MIT
