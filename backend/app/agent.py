"""Route natural-language questions to GraphQL and format answers."""

from __future__ import annotations

from enum import Enum


class Intent(str, Enum):
    POOL_COUNT = "pool_count"
    TX_COUNT = "tx_count"
    VOLUME = "volume"
    TOP_POOLS = "top_pools"
    DEFAULT = "default"


QUERIES: dict[Intent, str] = {
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
    Intent.DEFAULT: """
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
    "How many transactions has Uniswap V3 processed?",
    "What are the top Uniswap V3 pools by TVL?",
]


def route_question(question: str) -> tuple[Intent, str]:
    """Pick a GraphQL query from a natural-language question."""
    q = question.lower()

    if any(
        phrase in q
        for phrase in ("top pool", "top pools", "highest tvl", "largest pool", "by tvl")
    ):
        return Intent.TOP_POOLS, QUERIES[Intent.TOP_POOLS]
    if any(phrase in q for phrase in ("volume", "trading volume", "total volume")):
        return Intent.VOLUME, QUERIES[Intent.VOLUME]
    if any(
        phrase in q
        for phrase in ("transaction", "transactions", "tx count", "txs", "swaps")
    ):
        return Intent.TX_COUNT, QUERIES[Intent.TX_COUNT]
    if any(phrase in q for phrase in ("pool", "pools", "how many")):
        return Intent.POOL_COUNT, QUERIES[Intent.POOL_COUNT]

    return Intent.DEFAULT, QUERIES[Intent.DEFAULT]


def _fmt_usd(value: str) -> str:
    try:
        num = float(value)
    except (TypeError, ValueError):
        return str(value)
    if num >= 1_000_000_000_000:
        return f"${num / 1_000_000_000_000:.2f} trillion"
    if num >= 1_000_000_000:
        return f"${num / 1_000_000_000:.2f} billion"
    if num >= 1_000_000:
        return f"${num / 1_000_000:.2f} million"
    return f"${num:,.2f}"


def _fmt_int(value: str) -> str:
    try:
        return f"{int(float(value)):,}"
    except (TypeError, ValueError):
        return str(value)


def _factory(data: dict) -> dict | None:
    factories = data.get("factories") or []
    return factories[0] if factories else None


def format_answer(intent: Intent, data: dict, agent_name: str, stub: bool) -> str:
    """Turn GraphQL data into a short demo-friendly answer."""
    prefix = f"I'm {agent_name}."
    if stub:
        prefix += " (stub mode — add GRAPH_API_KEY for live data.)"

    if intent == Intent.POOL_COUNT:
        factory = _factory(data)
        if not factory:
            return f"{prefix} I queried The Graph but couldn't find factory data."
        count = _fmt_int(factory.get("poolCount", "0"))
        return (
            f"{prefix} The Uniswap V3 factory reports {count} liquidity pools "
            "on Ethereum mainnet, indexed by The Graph."
        )

    if intent == Intent.TX_COUNT:
        factory = _factory(data)
        if not factory:
            return f"{prefix} I queried The Graph but couldn't find factory data."
        count = _fmt_int(factory.get("txCount", "0"))
        return (
            f"{prefix} Uniswap V3 has processed {count} transactions "
            "on Ethereum mainnet, per The Graph."
        )

    if intent == Intent.VOLUME:
        factory = _factory(data)
        if not factory:
            return f"{prefix} I queried The Graph but couldn't find factory data."
        volume = _fmt_usd(factory.get("totalVolumeUSD", "0"))
        return (
            f"{prefix} Uniswap V3 lifetime trading volume is about {volume} "
            "on Ethereum mainnet, per The Graph."
        )

    if intent == Intent.TOP_POOLS:
        pools = data.get("pools") or []
        if not pools:
            return f"{prefix} I queried The Graph but couldn't find pool rankings."
        lines = [f"{prefix} Top Uniswap V3 pools by TVL (The Graph):"]
        for i, pool in enumerate(pools, start=1):
            t0 = (pool.get("token0") or {}).get("symbol", "?")
            t1 = (pool.get("token1") or {}).get("symbol", "?")
            tvl = _fmt_usd(pool.get("totalValueLockedUSD", "0"))
            lines.append(f"{i}. {t0}/{t1} — TVL {tvl}")
        return "\n".join(lines)

    factory = _factory(data)
    if not factory:
        return f"{prefix} I queried The Graph but didn't get usable data."
    return (
        f"{prefix} Uniswap V3 snapshot from The Graph: "
        f"{_fmt_int(factory.get('poolCount', '0'))} pools, "
        f"{_fmt_int(factory.get('txCount', '0'))} transactions, "
        f"{_fmt_usd(factory.get('totalVolumeUSD', '0'))} lifetime volume."
    )
