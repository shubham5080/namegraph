"""NameGraph FastAPI entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

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
    }


@app.post("/ask", response_model=AskResponse)
async def ask(body: AskRequest) -> AskResponse:
    """MVP agent: run a Graph query and narrate the result."""
    graph = await run_graph_query(body.graphql)
    source = graph.get("source", "unknown")
    if source == "stub":
        answer = (
            f"I'm {settings.agent_ens_name}. Graph is in stub mode — "
            "add GRAPH_API_KEY and GRAPH_SUBGRAPH_ID for live data. "
            f"You asked: {body.question}"
        )
    else:
        data = graph.get("data") or {}
        answer = (
            f"I'm {settings.agent_ens_name}. Live The Graph response for "
            f"“{body.question}”: {data}"
        )
    return AskResponse(
        agent=settings.agent_ens_name,
        question=body.question,
        answer=answer,
        graph=graph,
        credits_charged=1,
    )
