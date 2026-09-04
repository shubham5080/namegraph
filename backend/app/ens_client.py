"""ENS identity lookup for the NameGraph agent."""

from __future__ import annotations

import httpx

from .config import settings

ENS_API = "https://api.ensideas.com/ens/resolve"


async def resolve_ens_name(name: str) -> dict:
    """Resolve an ENS name to address + avatar metadata."""
    url = f"{ENS_API}/{name}"
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:  # noqa: BLE001 — demo fallback
        return {
            "name": name,
            "resolved": False,
            "error": str(exc),
            "address": None,
            "avatar": None,
            "display_name": name,
        }

    return {
        "name": data.get("name") or name,
        "resolved": bool(data.get("address")),
        "address": data.get("address"),
        "avatar": data.get("avatar"),
        "display_name": data.get("displayName") or name,
        "description": data.get("description"),
    }


async def get_agent_identity() -> dict:
    """Load the configured agent's ENS profile."""
    identity = await resolve_ens_name(settings.agent_ens_name)
    identity["ens"] = settings.agent_ens_name
    identity["tagline"] = "ENS-named agents that pay to query The Graph"
    identity["partners"] = ["The Graph", "ENS", "Privy"]
    return identity
