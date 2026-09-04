"""ENS identity lookup for the NameGraph agent."""

from __future__ import annotations

import httpx

from .config import settings

ENS_API = "https://api.ensideas.com/ens/resolve"


async def _avatar_is_usable(client: httpx.AsyncClient, avatar_url: str | None) -> str | None:
    """Only keep avatar URLs that actually return an image."""
    if not avatar_url:
        return None
    try:
        resp = await client.get(avatar_url, follow_redirects=True)
        if resp.status_code != 200:
            return None
        content_type = (resp.headers.get("content-type") or "").lower()
        if not content_type.startswith("image/"):
            return None
        return str(resp.url)
    except Exception:  # noqa: BLE001
        return None


async def resolve_ens_name(name: str) -> dict:
    """Resolve an ENS name to address + avatar metadata."""
    url = f"{ENS_API}/{name}"
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            avatar = await _avatar_is_usable(client, data.get("avatar"))
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
        "avatar": avatar,
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
