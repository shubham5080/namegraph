# NameGraph — ETHOnline 2026 plan

Track: **Classic / From Scratch**  
Submit: **Sun Sep 13, 2026 · 9:30 PM IST** (~8 days left)

## What we are building (elevated)

**NameGraph is an ENS-named onchain research agent.**

Users talk to `namegraph.eth` in natural language. The agent:
1. Resolves its own identity via ENS
2. Routes the question to the right Graph data source (Uniswap subgraph, ENS subgraph, …)
3. Charges a credit (Privy wallet → paid query)
4. Returns a plain-language answer + a **query receipt** (who paid, which subgraph, when)

This is not a Uniswap dashboard. It is the **agent interface to The Graph**, with ENS as identity and Privy as the wallet rail.

### Why this can win

| Judge cares about | We show |
|-------------------|--------|
| The Graph | Live multi-subgraph routing + receipt of which ID was queried |
| ENS | Agent is a name (`namegraph.eth`), not a random address |
| Privy | Login → wallet session → pay-per-query |
| Demo polish | Chat transcript, receipts, Graph-quality UI, git history |

## Product bar (must feel damn good)

- Chat UI (not a form dump)
- ≥6 demo questions across ≥2 subgraphs
- Payment receipt every ask
- Privy login before Tue check-in
- Deployed public URL before video
- ≤4 min video that tells a story, not a screen tour

## Day plan (aggressive)

| Date | Focus | Exit criteria |
|------|--------|----------------|
| **Sat Sep 5 (tonight)** | Elevate agent + chat + receipts | Multi-subgraph answers + chat UI |
| Sun Sep 6 | Privy login + wallet session | Connect works on localhost |
| Mon Sep 7 | ENS text records + agent profile depth | Identity section feels real |
| Tue Sep 8 | Real pay step · **Check-in #1** | Pay → query → receipt in one path |
| Wed Sep 9 | Deploy + harden | Public URL, same demo 3× |
| Thu Sep 10 | Docs / FEEDBACK / AI_USAGE | Reproducible for judges |
| Fri Sep 11 | Draft video · **Check-in #2** | Draft ≤4 min |
| Sat Sep 12 | Final video · feature freeze | Submit-ready |
| Sun Sep 13 | **Submit by 9:30 PM IST** | Dashboard complete |

## Scope lock

**Build:** multi-subgraph agent, chat, receipts, Privy, ENS identity, deploy, video.  
**Do not:** Uniswap trading UI, bridges, 1inch, random AI chatbot fluff, scope creep after Sat 12.
