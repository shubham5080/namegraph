"""NameGraph FastAPI entrypoint."""

from __future__ import annotations

import hashlib
import time
import uuid

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .agent import DEMO_QUESTIONS, format_answer, route_question
from .config import settings
from .credits import credit_store
from .ens_client import get_agent_identity
from .graph_client import run_graph_query

app = FastAPI(title="NameGraph API", version="0.2.0")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    graphql: str | None = None
    wallet: str | None = None


class Receipt(BaseModel):
    id: str
    paid_by: str
    agent: str
    intent: str
    subgraph: str
    subgraph_id: str
    credits: int
    ts: int
    proof: str


class AskResponse(BaseModel):
    agent: str
    question: str
    answer: str
    graph: dict
    credits_charged: int = 1
    credits_remaining: int
    receipt: Receipt


def _session_id(x_session_id: str | None) -> str:
    return (x_session_id or "demo").strip() or "demo"


def _make_receipt(
    *,
    session: str,
    wallet: str | None,
    intent: str,
    subgraph: str,
    subgraph_id: str,
) -> Receipt:
    rid = str(uuid.uuid4())
    ts = int(time.time())
    paid_by = wallet or f"session:{session[:8]}"
    material = f"{rid}|{paid_by}|{intent}|{subgraph_id}|{ts}"
    proof = hashlib.sha256(material.encode()).hexdigest()[:24]
    return Receipt(
        id=rid,
        paid_by=paid_by,
        agent=settings.agent_ens_name,
        intent=intent,
        subgraph=subgraph,
        subgraph_id=subgraph_id,
        credits=1,
        ts=ts,
        proof=f"ng_{proof}",
    )


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "service": "namegraph",
        "version": "0.2.0",
        "agent": settings.agent_ens_name,
    }


@app.get("/agent")
def agent_info() -> dict:
    return {
        "ens": settings.agent_ens_name,
        "partners": ["The Graph", "ENS", "Privy"],
        "tagline": "ENS-named agents that pay to query The Graph",
        "demo_questions": DEMO_QUESTIONS,
        "capabilities": [
            "Uniswap V3 subgraph queries",
            "ENS subgraph name lookups",
            "Pay-per-query credits",
            "Query receipts",
        ],
    }


@app.get("/agent/identity")
async def agent_identity() -> dict:
    return await get_agent_identity()


@app.get("/credits")
def get_credits(x_session_id: str | None = Header(default=None)) -> dict:
    session = _session_id(x_session_id)
    return {"session_id": session, "balance": credit_store.balance(session)}


@app.post("/credits/topup")
def topup_credits(x_session_id: str | None = Header(default=None)) -> dict:
    session = _session_id(x_session_id)
    balance = credit_store.top_up(session, amount=5)
    return {"session_id": session, "balance": balance, "added": 5}


@app.post("/ask", response_model=AskResponse)
async def ask(
    body: AskRequest,
    x_session_id: str | None = Header(default=None),
) -> AskResponse:
    """Charge credit → route across subgraphs → answer + receipt."""
    session = _session_id(x_session_id)
    try:
        credit_store.charge(session, amount=1)
    except ValueError:
        raise HTTPException(
            status_code=402,
            detail="Insufficient credits. Top up to keep querying.",
        )

    routed = route_question(body.question)
    graph = await run_graph_query(
        body.graphql or routed.query,
        subgraph_id=routed.subgraph_id,
        source_label="thegraph",
    )
    source = graph.get("source", "unknown")
    data = graph.get("data") or {}
    graph["intent"] = routed.intent.value
    graph["subgraph"] = routed.subgraph_name
    answer = format_answer(
        routed.intent,
        data,
        settings.agent_ens_name,
        stub=source == "stub",
        extracted=routed.extracted,
    )
    receipt = _make_receipt(
        session=session,
        wallet=body.wallet,
        intent=routed.intent.value,
        subgraph=routed.subgraph_name,
        subgraph_id=routed.subgraph_id,
    )
    return AskResponse(
        agent=settings.agent_ens_name,
        question=body.question,
        answer=answer,
        graph=graph,
        credits_charged=1,
        credits_remaining=credit_store.balance(session),
        receipt=receipt,
    )
