"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AGENT_ENS = process.env.NEXT_PUBLIC_AGENT_ENS || "namegraph.eth";

const FALLBACK_DEMO_QUESTIONS = [
  "How many Uniswap V3 pools does the factory report?",
  "What is the total trading volume on Uniswap V3?",
  "How many transactions has Uniswap V3 processed?",
  "What are the top Uniswap V3 pools by TVL?",
];

type AgentIdentity = {
  ens: string;
  name: string;
  display_name: string;
  resolved: boolean;
  address: string | null;
  avatar: string | null;
  tagline: string;
  partners: string[];
};

type AskResponse = {
  agent: string;
  question: string;
  answer: string;
  graph: Record<string, unknown>;
  credits_charged: number;
  credits_remaining: number;
};

type HistoryItem = {
  id: string;
  question: string;
  answer: string;
  at: string;
  source: string;
};

function getSessionId(): string {
  const key = "namegraph_session";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function HomePage() {
  const [sessionId, setSessionId] = useState("demo");
  const [online, setOnline] = useState(false);
  const [identity, setIdentity] = useState<AgentIdentity | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [demoQuestions, setDemoQuestions] = useState(FALLBACK_DEMO_QUESTIONS);
  const [question, setQuestion] = useState(FALLBACK_DEMO_QUESTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showRaw, setShowRaw] = useState(false);

  const apiHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      "X-Session-Id": sessionId,
    }),
    [sessionId],
  );

  const refreshStatus = useCallback(async () => {
    try {
      const [healthRes, identityRes, creditsRes, agentRes] = await Promise.all([
        fetch(`${API_URL}/health`),
        fetch(`${API_URL}/agent/identity`),
        fetch(`${API_URL}/credits`, { headers: apiHeaders() }),
        fetch(`${API_URL}/agent`),
      ]);
      if (!healthRes.ok) throw new Error("backend offline");
      setOnline(true);
      if (identityRes.ok) setIdentity((await identityRes.json()) as AgentIdentity);
      if (creditsRes.ok) {
        const data = await creditsRes.json();
        setCredits(data.balance as number);
      }
      if (agentRes.ok) {
        const data = await agentRes.json();
        if (Array.isArray(data.demo_questions)) setDemoQuestions(data.demo_questions);
      }
      setError(null);
    } catch {
      setOnline(false);
    }
  }, [apiHeaders]);

  useEffect(() => {
    setSessionId(getSessionId());
    const saved = localStorage.getItem("namegraph_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved) as HistoryItem[]);
      } catch {
        // ignore corrupt history
      }
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const timer = setInterval(refreshStatus, 8000);
    return () => clearInterval(timer);
  }, [refreshStatus]);

  async function onTopUp() {
    try {
      const res = await fetch(`${API_URL}/credits/topup`, {
        method: "POST",
        headers: apiHeaders(),
      });
      if (!res.ok) throw new Error(`Top-up failed (${res.status})`);
      const data = await res.json();
      setCredits(data.balance as number);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Top-up failed");
    }
  }

  async function onAsk(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setShowRaw(false);
    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ question }),
      });
      if (res.status === 402) {
        throw new Error("Out of credits — use Top up (+5) to keep querying.");
      }
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as AskResponse;
      setResult(data);
      setCredits(data.credits_remaining);
      const item: HistoryItem = {
        id: crypto.randomUUID(),
        question: data.question,
        answer: data.answer,
        at: new Date().toISOString(),
        source: String(data.graph.source ?? "unknown"),
      };
      setHistory((prev) => {
        const next = [item, ...prev].slice(0, 8);
        localStorage.setItem("namegraph_history", JSON.stringify(next));
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const shortAddr = identity?.address
    ? `${identity.address.slice(0, 6)}…${identity.address.slice(-4)}`
    : null;

  return (
    <main>
      <div className="status-row">
        <p className="pill">ETHOnline 2026</p>
        <p className="pill">The Graph · ENS · Privy</p>
        <span className={`status-dot ${online ? "online" : "offline"}`}>
          {online ? "Backend online" : "Backend offline"}
        </span>
      </div>

      <h1>NameGraph</h1>
      <p className="tag">
        Agent <strong>{AGENT_ENS}</strong> — ENS-named agents that pay to query
        The Graph.
      </p>

      <div className="card agent-card">
        <div className="agent-row">
          {identity?.avatar ? (
            <img className="avatar" src={identity.avatar} alt={AGENT_ENS} />
          ) : (
            <div className="avatar placeholder">NG</div>
          )}
          <div>
            <p className="agent-name">{identity?.display_name || AGENT_ENS}</p>
            <p className="meta">
              {identity?.resolved
                ? `ENS resolved · ${shortAddr}`
                : "ENS profile loading…"}
            </p>
            <p className="meta">{identity?.tagline}</p>
          </div>
          <div className="credits-box">
            <p className="credits-label">Credits</p>
            <p className="credits-value">{credits ?? "—"}</p>
            <button type="button" className="ghost small" onClick={onTopUp}>
              Top up (+5)
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <p className="meta">
          Privy wallet login next — demo credits simulate pay-per-query today.
        </p>
        <div className="chips">
          {demoQuestions.map((demo) => (
            <button
              key={demo}
              type="button"
              className="chip"
              disabled={loading || !online}
              onClick={() => {
                setQuestion(demo);
                setResult(null);
              }}
            >
              {demo}
            </button>
          ))}
        </div>
        <form onSubmit={onAsk}>
          <label htmlFor="q">Ask NameGraph</label>
          <textarea
            id="q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || !question.trim() || !online || credits === 0}
          >
            {loading ? "Querying…" : "Ask (1 credit)"}
          </button>
        </form>
      </div>

      {error && (
        <div className="card error-card">
          <p className="answer">Error: {error}</p>
          {!online && (
            <p className="meta">
              Start backend:{" "}
              <code>
                cd backend && source .venv/bin/activate && uvicorn app.main:app
                --reload --port 8000
              </code>
            </p>
          )}
        </div>
      )}

      {result && (
        <div className="card">
          <p className="meta">
            {result.agent} · charged {result.credits_charged} credit ·{" "}
            {result.credits_remaining} left · source{" "}
            {String(result.graph.source ?? "unknown")}
          </p>
          <p className="answer">{result.answer}</p>
          <button
            type="button"
            className="ghost"
            onClick={() => setShowRaw((v) => !v)}
          >
            {showRaw ? "Hide" : "View"} Graph response
          </button>
          {showRaw && (
            <pre className="meta raw-json">
              {JSON.stringify(result.graph, null, 2)}
            </pre>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <p className="meta">Recent queries (this browser)</p>
          <ul className="history">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="history-item"
                  onClick={() => {
                    setQuestion(item.question);
                    setResult({
                      agent: AGENT_ENS,
                      question: item.question,
                      answer: item.answer,
                      graph: { source: item.source },
                      credits_charged: 1,
                      credits_remaining: credits ?? 0,
                    });
                  }}
                >
                  <span className="history-q">{item.question}</span>
                  <span className="history-meta">
                    {new Date(item.at).toLocaleTimeString()} · {item.source}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
