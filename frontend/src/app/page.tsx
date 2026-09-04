"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AGENT_ENS = process.env.NEXT_PUBLIC_AGENT_ENS || "namegraph.eth";

const FALLBACK_DEMO_QUESTIONS = [
  "How many Uniswap V3 pools does the factory report?",
  "What is the total trading volume on Uniswap V3?",
  "Show the latest Uniswap V3 swaps",
  "What are the top Uniswap V3 pools by TVL?",
  "Look up vitalik.eth on the ENS subgraph",
  "Who is namegraph.eth?",
];

type AgentIdentity = {
  ens: string;
  display_name: string;
  resolved: boolean;
  address: string | null;
  avatar: string | null;
  tagline: string;
};

type Receipt = {
  id: string;
  paid_by: string;
  agent: string;
  intent: string;
  subgraph: string;
  subgraph_id: string;
  credits: number;
  ts: number;
  proof: string;
};

type AskResponse = {
  agent: string;
  question: string;
  answer: string;
  graph: Record<string, unknown>;
  credits_charged: number;
  credits_remaining: number;
  receipt: Receipt;
};

type ChatMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  at: string;
  receipt?: Receipt;
  source?: string;
  subgraph?: string;
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
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [openReceipt, setOpenReceipt] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

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
    } catch {
      setOnline(false);
    }
  }, [apiHeaders]);

  useEffect(() => {
    setSessionId(getSessionId());
    const saved = localStorage.getItem("namegraph_chat");
    if (saved) {
      try {
        setMessages(JSON.parse(saved) as ChatMessage[]);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const timer = setInterval(refreshStatus, 10000);
    return () => clearInterval(timer);
  }, [refreshStatus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function persist(next: ChatMessage[]) {
    setMessages(next);
    localStorage.setItem("namegraph_chat", JSON.stringify(next.slice(-40)));
  }

  async function onTopUp() {
    const res = await fetch(`${API_URL}/credits/topup`, {
      method: "POST",
      headers: apiHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    setCredits(data.balance as number);
  }

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setQuestion("");

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
      at: new Date().toISOString(),
    };
    persist([...messages, userMsg]);

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ question: trimmed }),
      });
      if (res.status === 402) {
        throw new Error("Out of credits — top up to keep querying.");
      }
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as AskResponse;
      setCredits(data.credits_remaining);
      const agentMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        text: data.answer,
        at: new Date().toISOString(),
        receipt: data.receipt,
        source: String(data.graph.source ?? "thegraph"),
        subgraph: String(data.graph.subgraph ?? data.receipt.subgraph),
      };
      persist([...messages, userMsg, agentMsg]);
      setOpenReceipt(data.receipt.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function onAsk(e?: FormEvent) {
    e?.preventDefault();
    await ask(question);
  }

  const shortAddr = identity?.address
    ? `${identity.address.slice(0, 6)}…${identity.address.slice(-4)}`
    : null;

  return (
    <main>
      <section className="hero">
        <p className="hero-eyebrow">ENS agent · The Graph data · Privy payments</p>
        <div className="status-row">
          <span className={`status-dot ${online ? "online" : "offline"}`}>
            {online ? "Backend online" : "Backend offline"}
          </span>
        </div>
        <h1>Talk to onchain data by name</h1>
        <p className="tag">
          <strong>{AGENT_ENS}</strong> is an ENS-named agent that routes your
          question to The Graph, charges a credit, and returns a receipt.
        </p>
      </section>

      <div className="card agent-card" id="agent">
        <div className="agent-row">
          <div className="avatar-tile">
            <div className="avatar placeholder">NG</div>
          </div>
          <div>
            <p className="agent-name">{identity?.display_name || AGENT_ENS}</p>
            <p className="meta">
              {identity?.resolved
                ? `ENS resolved · ${shortAddr}`
                : "Resolving ENS…"}
            </p>
            <p className="meta">
              Routes Uniswap V3 + ENS subgraphs · pay per query
            </p>
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

      <div className="card chat-card" id="ask">
        <div className="chat-header">
          <div>
            <p className="agent-name">Agent chat</p>
            <p className="meta">Try a demo question or type your own</p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              className="ghost small"
              onClick={() => {
                persist([]);
                setOpenReceipt(null);
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="chips">
          {demoQuestions.map((demo) => (
            <button
              key={demo}
              type="button"
              className="chip"
              disabled={loading || !online}
              onClick={() => ask(demo)}
            >
              {demo}
            </button>
          ))}
        </div>

        <div className="chat-thread" aria-live="polite">
          {messages.length === 0 && (
            <div className="chat-empty">
              Ask about Uniswap pools, volume, swaps — or look up any{" "}
              <code>.eth</code> name on the ENS subgraph.
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`bubble ${m.role}`}>
              <div className="bubble-meta">
                {m.role === "user" ? "You" : AGENT_ENS}
                {m.subgraph ? ` · ${m.subgraph}` : ""}
              </div>
              <div className="bubble-text">{m.text}</div>
              {m.receipt && (
                <div className="receipt-wrap">
                  <button
                    type="button"
                    className="ghost small"
                    onClick={() =>
                      setOpenReceipt((id) =>
                        id === m.receipt!.id ? null : m.receipt!.id,
                      )
                    }
                  >
                    {openReceipt === m.receipt.id ? "Hide" : "View"} receipt
                  </button>
                  {openReceipt === m.receipt.id && (
                    <div className="receipt">
                      <div>
                        <span>Proof</span>
                        <strong>{m.receipt.proof}</strong>
                      </div>
                      <div>
                        <span>Paid by</span>
                        <strong>{m.receipt.paid_by}</strong>
                      </div>
                      <div>
                        <span>Subgraph</span>
                        <strong>
                          {m.receipt.subgraph} ·{" "}
                          {m.receipt.subgraph_id.slice(0, 8)}…
                        </strong>
                      </div>
                      <div>
                        <span>Intent</span>
                        <strong>{m.receipt.intent}</strong>
                      </div>
                      <div>
                        <span>Credits</span>
                        <strong>{m.receipt.credits}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="bubble agent">
              <div className="bubble-meta">{AGENT_ENS}</div>
              <div className="bubble-text typing">Querying The Graph…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onAsk} className="ask-form">
          <div className="ask-composer">
            <span className="ask-icon" aria-hidden>
              ⌕
            </span>
            <textarea
              id="q"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask namegraph.eth anything onchain…"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(question);
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !question.trim() || !online || credits === 0}
          >
            {loading ? "Querying…" : "Ask (1 credit)"}
          </button>
        </form>

        {error && <p className="chat-error">Error: {error}</p>}
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
    </main>
  );
}
