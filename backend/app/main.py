"""NameGraph FastAPI entrypoint."""

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .agent import DEMO_QUESTIONS, format_answer, route_question
from .config import settings
from .credits import credit_store
from .ens_client import get_agent_identity
from .graph_client import run_graph_query

app = FastAPI(title="NameGraph API", version="0.1.0")

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


class AskResponse(BaseModel):
    agent: str
    question: str
    answer: str
    graph: dict
    credits_charged: int = 1
    credits_remaining: int


def _session_id(x_session_id: str | None) -> str:
    return (x_session_id or "demo").strip() or "demo"


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "namegraph", "agent": settings.agent_ens_name}


@app.get("/agent")
def agent_info() -> dict:
    return {
        "ens": settings.agent_ens_name,
        "partners": ["The Graph", "ENS", "Privy"],
        "tagline": "ENS-named agents that pay to query The Graph",
        "demo_questions": DEMO_QUESTIONS,
    }


@app.get("/agent/identity")
async def agent_identity() -> dict:
    """ENS-resolved agent profile for the demo UI."""
    return await get_agent_identity()


@app.get("/credits")
def get_credits(x_session_id: str | None = Header(default=None)) -> dict:
    session = _session_id(x_session_id)
    return {"session_id": session, "balance": credit_store.balance(session)}


@app.post("/credits/topup")
def topup_credits(x_session_id: str | None = Header(default=None)) -> dict:
    """Demo top-up until Privy payments land."""
    session = _session_id(x_session_id)
    balance = credit_store.top_up(session, amount=5)
    return {"session_id": session, "balance": balance, "added": 5}


@app.post("/ask", response_model=AskResponse)
async def ask(
    body: AskRequest,
    x_session_id: str | None = Header(default=None),
) -> AskResponse:
    """Route question → charge credit → Graph query → plain-language answer."""
    session = _session_id(x_session_id)
    try:
        credit_store.charge(session, amount=1)
    except ValueError:
        raise HTTPException(
            status_code=402,
            detail="Insufficient credits. Top up to keep querying.",
        )

    intent, query = route_question(body.question)
    graph = await run_graph_query(body.graphql or query)
    source = graph.get("source", "unknown")
    data = graph.get("data") or {}
    graph["intent"] = intent.value
    answer = format_answer(
        intent,
        data,
        settings.agent_ens_name,
        stub=source == "stub",
    )
    return AskResponse(
        agent=settings.agent_ens_name,
        question=body.question,
        answer=answer,
        graph=graph,
        credits_charged=1,
        credits_remaining=credit_store.balance(session),
    )
