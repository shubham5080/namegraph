"""The Graph GraphQL client (stub → live on Sat Sep 5)."""

from __future__ import annotations

import httpx

from .config import settings


# Public hosted demo subgraph (Uniswap V3 Ethereum) — replace with your key/subgraph later.
DEFAULT_QUERY = """
{
  factories(first: 1) {
    id
    poolCount
    txCount
    totalVolumeUSD
  }
}
"""


async def run_graph_query(query: str | None = None) -> dict:
    """Run a GraphQL query against The Graph.

    If GRAPH_API_KEY + GRAPH_SUBGRAPH_ID are set, uses the decentralized gateway.
    Otherwise returns a structured stub so the UI can be developed offline.
    """
    q = query or DEFAULT_QUERY

    if not settings.graph_api_key or not settings.graph_subgraph_id:
        return {
            "source": "stub",
            "message": "Set GRAPH_API_KEY and GRAPH_SUBGRAPH_ID for live The Graph data.",
            "query": q.strip(),
            "data": {
                "factories": [
                    {
                        "id": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
                        "poolCount": "0",
                        "txCount": "0",
                        "totalVolumeUSD": "0",
                    }
                ]
            },
        }

    url = (
        f"{settings.graph_gateway_url.rstrip('/')}/"
        f"{settings.graph_api_key}/subgraphs/id/{settings.graph_subgraph_id}"
    )
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json={"query": q})
        resp.raise_for_status()
        body = resp.json()
    return {"source": "thegraph", "query": q.strip(), **body}
