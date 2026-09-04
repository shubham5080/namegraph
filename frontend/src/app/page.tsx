"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AGENT_ENS = process.env.NEXT_PUBLIC_AGENT_ENS || "namegraph.eth";

const SUGGESTIONS = [
  "How many Uniswap V3 pools exist?",
  "Show latest Uniswap V3 swaps",
  "Look up vitalik.eth",
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
  const [sessionId, setSessionId] = useState("local");
  const [online, setOnline] = useState(false);
  const [identity, setIdentity] = useState<AgentIdentity | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [openReceipt, setOpenReceipt] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const apiHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      "X-Session-Id": sessionId,
    }),
    [sessionId],
  );

  const refreshStatus = useCallback(async () => {
    try {
      const [healthRes, identityRes, creditsRes] = await Promise.all([
        fetch(`${API_URL}/health`),
        fetch(`${API_URL}/agent/identity`),
        fetch(`${API_URL}/credits`, { headers: apiHeaders() }),
      ]);
      if (!healthRes.ok) throw new Error("offline");
      setOnline(true);
      if (identityRes.ok) setIdentity((await identityRes.json()) as AgentIdentity);
      if (creditsRes.ok) {
        const data = await creditsRes.json();
        setCredits(data.balance as number);
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
    const timer = setInterval(refreshStatus, 12000);
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
    if (!trimmed || loading || !online) return;
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
        throw new Error("Insufficient credits. Top up to continue.");
      }
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as AskResponse;
      setCredits(data.credits_remaining);
      const agentMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        text: data.answer,
        at: new Date().toISOString(),
        receipt: data.receipt,
        subgraph: String(data.graph.subgraph ?? data.receipt.subgraph),
      };
      persist([...messages, userMsg, agentMsg]);
      setOpenReceipt(data.receipt.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function onAsk(e?: FormEvent) {
    e?.preventDefault();
    await ask(question);
  }

  const shortAddr = identity?.address
    ? `${identity.address.slice(0, 6)}…${identity.address.slice(-4)}`
    : null;

  const canSend =
    !loading && online && question.trim().length > 0 && credits !== 0;

  return (
    <main>
      <section className="hero">
        <h1>Onchain answers, by name</h1>
        <p className="tag">
          Ask <strong>{AGENT_ENS}</strong>. It routes to The Graph, settles a
          credit, and returns a verifiable receipt.
        </p>
      </section>

      <section className="card agent-card" id="agent" aria-label="Agent">
        <div className="agent-row">
          <div className="avatar placeholder" aria-hidden>
            NG
          </div>
          <div>
            <p className="agent-name">{identity?.display_name || AGENT_ENS}</p>
            <p className="meta">
              {identity?.resolved
                ? `Resolved · ${shortAddr}`
                : "Resolving ENS…"}
            </p>
          </div>
          <div className="credits-box">
            <p className="credits-label">Balance</p>
            <p className="credits-value">{credits ?? "—"}</p>
            <button type="button" className="ghost small" onClick={onTopUp}>
              Add credits
            </button>
          </div>
        </div>
      </section>

      <section className="card chat-card" id="query" aria-label="Query">
        <div className="chat-header">
          <div>
            <p className="agent-name">Conversation</p>
            <p className="meta">
              {online ? "Connected" : "Service unavailable"}
              {credits != null ? ` · ${credits} credits` : ""}
            </p>
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
              New chat
            </button>
          )}
        </div>

        <div className="chat-thread" aria-live="polite">
          {messages.length === 0 && (
            <div className="chat-empty">
              <p>Ask about Uniswap markets or any ENS name.</p>
              <div className="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="suggestion"
                    disabled={loading || !online}
                    onClick={() => ask(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <article key={m.id} className={`bubble ${m.role}`}>
              <header className="bubble-meta">
                {m.role === "user" ? "You" : AGENT_ENS}
                {m.subgraph ? ` · ${m.subgraph}` : ""}
              </header>
              <p className="bubble-text">{m.text}</p>
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
                    {openReceipt === m.receipt.id ? "Hide receipt" : "Receipt"}
                  </button>
                  {openReceipt === m.receipt.id && (
                    <dl className="receipt">
                      <div>
                        <dt>Proof</dt>
                        <dd>{m.receipt.proof}</dd>
                      </div>
                      <div>
                        <dt>Paid by</dt>
                        <dd>{m.receipt.paid_by}</dd>
                      </div>
                      <div>
                        <dt>Subgraph</dt>
                        <dd>
                          {m.receipt.subgraph} ·{" "}
                          {m.receipt.subgraph_id.slice(0, 10)}…
                        </dd>
                      </div>
                      <div>
                        <dt>Intent</dt>
                        <dd>{m.receipt.intent}</dd>
                      </div>
                      <div>
                        <dt>Credits</dt>
                        <dd>{m.receipt.credits}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              )}
            </article>
          ))}

          {loading && (
            <article className="bubble agent">
              <header className="bubble-meta">{AGENT_ENS}</header>
              <p className="bubble-text typing">Querying The Graph…</p>
            </article>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onAsk} className="ask-form">
          <div className={`ask-composer ${!online ? "disabled" : ""}`}>
            <textarea
              ref={inputRef}
              id="q"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Message ${AGENT_ENS}`}
              rows={1}
              disabled={!online || loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(question);
                }
              }}
            />
            <button type="submit" className="send-btn" disabled={!canSend}>
              {loading ? "…" : "Send"}
            </button>
          </div>
          <p className="composer-hint">
            Enter to send · Shift+Enter for newline · 1 credit / query
          </p>
        </form>

        {error && <p className="chat-error">{error}</p>}
      </section>
    </main>
  );
}
