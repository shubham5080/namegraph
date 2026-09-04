"""NameGraph FastAPI entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .agent import DEMO_QUESTIONS, format_answer, route_question
from .config import settings
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
    # Optional raw GraphQL override for debugging
    graphql: str | None = None


class AskResponse(BaseModel):
    agent: str
    question: str
    answer: str
    graph: dict
    credits_charged: int = 1


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


@app.post("/ask", response_model=AskResponse)
async def ask(body: AskRequest) -> AskResponse:
    """MVP agent: route question → Graph query → plain-language answer."""
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
    )
