"""The Graph multi-subgraph client."""

from __future__ import annotations

import httpx

from .config import settings


async def run_graph_query(
    query: str,
    *,
    subgraph_id: str | None = None,
    source_label: str = "thegraph",
) -> dict:
    """Run a GraphQL query against a subgraph on The Graph Network."""
    q = query.strip()
    sid = subgraph_id or settings.graph_subgraph_id

    if not settings.graph_api_key or not sid:
        return {
            "source": "stub",
            "subgraph_id": sid,
            "message": "Set GRAPH_API_KEY for live The Graph data.",
            "query": q,
            "data": {},
        }

    url = (
        f"{settings.graph_gateway_url.rstrip('/')}/"
        f"{settings.graph_api_key}/subgraphs/id/{sid}"
    )
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json={"query": q})
        resp.raise_for_status()
        body = resp.json()
    return {
        "source": source_label,
        "subgraph_id": sid,
        "query": q,
        **body,
    }
