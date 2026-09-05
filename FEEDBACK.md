# Partner feedback (NameGraph)

Notes for The Graph / ENS / Privy developer experience during ETHOnline 2026.

## The Graph

- (fill while integrating)

## ENS

- `api.ensideas.com` resolves `namegraph.eth` cleanly for demo avatar + address
- Text records (`description`, `url`) not returned by that API yet — may add direct resolver calls later

## Privy

- React Auth SDK (`@privy-io/react-auth`) via client `Providers` wrapper for Next App Router
- Connect wallet → address sent as `wallet` on `POST /ask` → receipt `paid_by`
- Without `NEXT_PUBLIC_PRIVY_APP_ID`, UI still runs; connect button stays disabled with setup hint
- Dashboard: create app, allow localhost:3000 (+ production URL after deploy)
