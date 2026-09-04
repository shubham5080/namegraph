"""Route natural-language questions across multiple Graph subgraphs."""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum

from .config import settings


class Intent(str, Enum):
    POOL_COUNT = "pool_count"
    TX_COUNT = "tx_count"
    VOLUME = "volume"
    TOP_POOLS = "top_pools"
    RECENT_SWAPS = "recent_swaps"
    ENS_DOMAIN = "ens_domain"
    ENS_AGENT = "ens_agent"
    SNAPSHOT = "snapshot"
    HELP = "help"


@dataclass
class RoutedQuery:
    intent: Intent
    query: str
    subgraph_id: str
    subgraph_name: str
    extracted: dict | None = None
    needs_graph: bool = True
    charge: bool = True


UNISWAP_QUERIES: dict[Intent, str] = {
    Intent.POOL_COUNT: """
{
  factories(first: 1) {
    id
    poolCount
  }
}
""",
    Intent.TX_COUNT: """
{
  factories(first: 1) {
    id
    txCount
  }
}
""",
    Intent.VOLUME: """
{
  factories(first: 1) {
    id
    totalVolumeUSD
  }
}
""",
    Intent.TOP_POOLS: """
{
  pools(first: 5, orderBy: totalValueLockedUSD, orderDirection: desc) {
    id
    token0 { symbol }
    token1 { symbol }
    totalValueLockedUSD
    volumeUSD
  }
}
""",
    Intent.RECENT_SWAPS: """
{
  swaps(first: 5, orderBy: timestamp, orderDirection: desc) {
    id
    timestamp
    amountUSD
    token0 { symbol }
    token1 { symbol }
  }
}
""",
    Intent.SNAPSHOT: """
{
  factories(first: 1) {
    id
    poolCount
    txCount
    totalVolumeUSD
  }
}
""",
}


DEMO_QUESTIONS = [
    "How many Uniswap V3 pools does the factory report?",
    "What is the total trading volume on Uniswap V3?",
    "Show the latest Uniswap V3 swaps",
    "What are the top Uniswap V3 pools by TVL?",
    "Look up vitalik.eth on the ENS subgraph",
    "Who is namegraph.eth?",
]


def _ens_domain_query(name: str) -> str:
    safe = name.replace('\\', '\\\\').replace('"', '\\"')
    return f"""
{{
  domains(where: {{ name: "{safe}" }}, first: 1) {{
    name
    id
    createdAt
    subdomainCount
    resolvedAddress {{ id }}
    owner {{ id }}
    resolver {{ address texts }}
  }}
}}
"""


def route_question(question: str) -> RoutedQuery:
    """Pick subgraph + GraphQL from a natural-language question."""
    q = question.lower().strip()
    uniswap = settings.graph_subgraph_id
    ens = settings.ens_subgraph_id

    # Greetings / help — no Graph call, no credit charge
    if (
        q in {"hi", "hello", "hey", "yo", "sup", "thanks", "thank you", "help", "?"}
        or any(
            q.startswith(p)
            for p in ("hi ", "hello ", "hey ", "what can you", "how do i", "help ")
        )
        or q in {"what can you do", "what do you do", "who are you"}
    ):
        return RoutedQuery(
            Intent.HELP,
            "",
            "",
            "NameGraph",
            needs_graph=False,
            charge=False,
        )

    if any(
        p in q
        for p in ("who is namegraph", "about namegraph", "agent identity", "your ens")
    ):
        return RoutedQuery(
            Intent.ENS_AGENT,
            _ens_domain_query(settings.agent_ens_name),
            ens,
            "ENS",
            {"name": settings.agent_ens_name},
        )

    ens_match = re.search(r"\b([a-z0-9-]{1,63}\.eth)\b", q)
    if ens_match or (
        any(p in q for p in ("look up", "resolve ", "who owns", "ens subgraph"))
        and (ens_match or ".eth" in q)
    ):
        name = ens_match.group(1) if ens_match else settings.agent_ens_name
        return RoutedQuery(
            Intent.ENS_DOMAIN,
            _ens_domain_query(name),
            ens,
            "ENS",
            {"name": name},
        )

    if (
        "swap" in q
        and any(p in q for p in ("latest", "recent", "last", "show", "live"))
    ) or any(p in q for p in ("latest swaps", "recent swaps", "last swap")):
        return RoutedQuery(
            Intent.RECENT_SWAPS, UNISWAP_QUERIES[Intent.RECENT_SWAPS], uniswap, "Uniswap V3"
        )

    if any(p in q for p in ("top pool", "top pools", "highest tvl", "largest pool", "by tvl")):
        return RoutedQuery(
            Intent.TOP_POOLS, UNISWAP_QUERIES[Intent.TOP_POOLS], uniswap, "Uniswap V3"
        )

    if any(p in q for p in ("volume", "trading volume", "total volume")):
        return RoutedQuery(Intent.VOLUME, UNISWAP_QUERIES[Intent.VOLUME], uniswap, "Uniswap V3")

    if any(p in q for p in ("transaction", "transactions", "tx count", "txs")):
        return RoutedQuery(
            Intent.TX_COUNT, UNISWAP_QUERIES[Intent.TX_COUNT], uniswap, "Uniswap V3"
        )

    if any(p in q for p in ("pool", "pools")) and any(
        p in q for p in ("how many", "count", "number", "uniswap")
    ):
        return RoutedQuery(
            Intent.POOL_COUNT, UNISWAP_QUERIES[Intent.POOL_COUNT], uniswap, "Uniswap V3"
        )

    if any(p in q for p in ("snapshot", "overview", "summary")) and "uniswap" in q:
        return RoutedQuery(
            Intent.SNAPSHOT, UNISWAP_QUERIES[Intent.SNAPSHOT], uniswap, "Uniswap V3"
        )

    # Unclear question — guide the user instead of dumping random Graph data
    return RoutedQuery(
        Intent.HELP,
        "",
        "",
        "NameGraph",
        needs_graph=False,
        charge=False,
    )


def _fmt_usd(value: str | float | None) -> str:
    try:
        num = float(value or 0)
    except (TypeError, ValueError):
        return str(value)
    if num >= 1_000_000_000_000:
        return f"${num / 1_000_000_000_000:.2f} trillion"
    if num >= 1_000_000_000:
        return f"${num / 1_000_000_000:.2f} billion"
    if num >= 1_000_000:
        return f"${num / 1_000_000:.2f} million"
    return f"${num:,.2f}"


def _fmt_int(value: str | float | None) -> str:
    try:
        return f"{int(float(value or 0)):,}"
    except (TypeError, ValueError):
        return str(value)


def _short(addr: str | None) -> str:
    if not addr or len(addr) < 10:
        return addr or "—"
    return f"{addr[:6]}…{addr[-4:]}"


def _factory(data: dict) -> dict | None:
    factories = data.get("factories") or []
    return factories[0] if factories else None


def format_answer(
    intent: Intent,
    data: dict,
    agent_name: str,
    *,
    stub: bool,
    extracted: dict | None = None,
) -> str:
    """Turn GraphQL data into a demo-quality answer."""
    prefix = f"I'm {agent_name}."
    if stub:
        prefix += " (stub mode — add GRAPH_API_KEY for live data.)"

    if intent == Intent.HELP:
        return (
            f"{prefix} I answer onchain questions with The Graph.\n"
            "Try:\n"
            "• How many Uniswap V3 pools exist?\n"
            "• Show latest Uniswap V3 swaps\n"
            "• Look up vitalik.eth\n"
            "• Who is namegraph.eth?\n"
            "Each Graph query costs 1 credit and returns a receipt."
        )

    if intent in (Intent.ENS_DOMAIN, Intent.ENS_AGENT):
        domains = data.get("domains") or []
        wanted = (extracted or {}).get("name", "unknown.eth")
        if not domains:
            return (
                f"{prefix} I queried the ENS subgraph for `{wanted}` "
                "but found no domain record."
            )
        d = domains[0]
        owner = _short((d.get("owner") or {}).get("id"))
        resolved = _short((d.get("resolvedAddress") or {}).get("id"))
        subs = d.get("subdomainCount", 0)
        if intent == Intent.ENS_AGENT:
            return (
                f"{prefix} My ENS identity `{d.get('name')}` is live on the ENS subgraph. "
                f"Owner {owner}, resolves to {resolved}, "
                f"{subs} subdomains indexed by The Graph."
            )
        return (
            f"{prefix} ENS subgraph says `{d.get('name')}` is owned by {owner}, "
            f"resolves to {resolved}, with {subs} subdomains."
        )

    if intent == Intent.POOL_COUNT:
        factory = _factory(data)
        if not factory:
            return f"{prefix} No Uniswap factory data from The Graph."
        return (
            f"{prefix} Uniswap V3 reports {_fmt_int(factory.get('poolCount'))} "
            "liquidity pools on Ethereum — indexed by The Graph."
        )

    if intent == Intent.TX_COUNT:
        factory = _factory(data)
        if not factory:
            return f"{prefix} No Uniswap factory data from The Graph."
        return (
            f"{prefix} Uniswap V3 has processed {_fmt_int(factory.get('txCount'))} "
            "transactions on Ethereum, per The Graph."
        )

    if intent == Intent.VOLUME:
        factory = _factory(data)
        if not factory:
            return f"{prefix} No Uniswap factory data from The Graph."
        return (
            f"{prefix} Uniswap V3 lifetime volume is about "
            f"{_fmt_usd(factory.get('totalVolumeUSD'))} on Ethereum."
        )

    if intent == Intent.TOP_POOLS:
        pools = data.get("pools") or []
        if not pools:
            return f"{prefix} No pool rankings returned."
        lines = [f"{prefix} Top Uniswap V3 pools by TVL:"]
        for i, pool in enumerate(pools, start=1):
            t0 = (pool.get("token0") or {}).get("symbol", "?")
            t1 = (pool.get("token1") or {}).get("symbol", "?")
            lines.append(f"{i}. {t0}/{t1} — TVL {_fmt_usd(pool.get('totalValueLockedUSD'))}")
        return "\n".join(lines)

    if intent == Intent.RECENT_SWAPS:
        swaps = data.get("swaps") or []
        if not swaps:
            return f"{prefix} No recent swaps returned."
        lines = [f"{prefix} Latest Uniswap V3 swaps on The Graph:"]
        for i, swap in enumerate(swaps, start=1):
            t0 = (swap.get("token0") or {}).get("symbol", "?")
            t1 = (swap.get("token1") or {}).get("symbol", "?")
            lines.append(f"{i}. {t0}/{t1} — {_fmt_usd(swap.get('amountUSD'))}")
        return "\n".join(lines)

    factory = _factory(data)
    if not factory:
        return f"{prefix} I queried The Graph but didn't get usable data."
    return (
        f"{prefix} Uniswap V3 snapshot: "
        f"{_fmt_int(factory.get('poolCount'))} pools · "
        f"{_fmt_int(factory.get('txCount'))} txs · "
        f"{_fmt_usd(factory.get('totalVolumeUSD'))} volume."
    )
