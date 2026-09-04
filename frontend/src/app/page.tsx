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
  display_name: string;
  resolved: boolean;
  address: string | null;
};

type Receipt = {
  id: string;
  paid_by: string;
  intent: string;
  subgraph: string;
  subgraph_id: string;
  credits: number;
  proof: string;
};

type AskResponse = {
  answer: string;
  graph: Record<string, unknown>;
  credits_remaining: number;
  receipt: Receipt;
};

type ChatMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
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
    };
    persist([...messages, userMsg]);

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ question: trimmed }),
      });
      if (res.status === 402) throw new Error("Insufficient credits.");
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as AskResponse;
      setCredits(data.credits_remaining);
      const agentMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        text: data.answer,
        receipt: data.receipt,
        subgraph: String(data.graph.subgraph ?? data.receipt.subgraph),
      };
      persist([...messages, userMsg, agentMsg]);
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
        <p className="hero-kicker">ENS-named agents for live Graph data</p>
        <h1>Fast, easy access to onchain answers</h1>
        <p className="hero-sub">
          Ask {AGENT_ENS}. Get indexed truth from The Graph — with a receipt.
        </p>
        <div className="hero-actions">
          <a className="btn-primary" href="#query">
            Start querying
          </a>
          <a className="btn-secondary" href="#agent">
            Meet the agent
          </a>
        </div>
      </section>

      <div className="agent-bar" id="agent">
        <div className="avatar" aria-hidden>
          NG
        </div>
        <div className="agent-bar-copy">
          <strong>{identity?.display_name || AGENT_ENS}</strong>
          <span>
            {identity?.resolved ? `Resolved · ${shortAddr}` : "Resolving ENS…"}
          </span>
        </div>
        <div className="agent-bar-credits">
          <em>Balance</em>
          <strong>{credits ?? "—"}</strong>
          <button type="button" className="link-btn" onClick={onTopUp}>
            Add credits
          </button>
        </div>
      </div>

      <section className="query-shell" id="query">
        <div className="query-top">
          <h2>Conversation</h2>
          <div className="meta">
            {online ? "Connected" : "Offline"}
            {credits != null ? ` · ${credits} credits` : ""}
            {messages.length > 0 && (
              <>
                {" · "}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    persist([]);
                    setOpenReceipt(null);
                  }}
                >
                  New chat
                </button>
              </>
            )}
          </div>
        </div>

        <div className="chat-thread" aria-live="polite">
          {messages.length === 0 && (
            <div className="chat-empty">
              Ask about markets or any ENS name.
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
            <article key={m.id} className={`msg ${m.role}`}>
              <p className="msg-label">
                {m.role === "user" ? "You" : AGENT_ENS}
                {m.subgraph ? ` · ${m.subgraph}` : ""}
              </p>
              <p className="msg-body">{m.text}</p>
              {m.receipt && (
                <>
                  <button
                    type="button"
                    className="receipt-toggle"
                    onClick={() =>
                      setOpenReceipt((id) =>
                        id === m.receipt!.id ? null : m.receipt!.id,
                      )
                    }
                  >
                    {openReceipt === m.receipt.id
                      ? "Hide receipt"
                      : "View receipt"}
                  </button>
                  {openReceipt === m.receipt.id && (
                    <div className="receipt-row">
                      <span>
                        Proof <strong>{m.receipt.proof}</strong>
                      </span>
                      <span>
                        Subgraph <strong>{m.receipt.subgraph}</strong>
                      </span>
                      <span>
                        Intent <strong>{m.receipt.intent}</strong>
                      </span>
                      <span>
                        Credits <strong>{m.receipt.credits}</strong>
                      </span>
                    </div>
                  )}
                </>
              )}
            </article>
          ))}

          {loading && (
            <article className="msg agent">
              <p className="msg-label">{AGENT_ENS}</p>
              <p className="msg-body typing">Querying The Graph…</p>
            </article>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onAsk} className="ask-form">
          <div className="ask-composer">
            <textarea
              ref={inputRef}
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
          <p className="composer-hint">Enter to send · 1 credit / query</p>
        </form>

        {error && <p className="chat-error">{error}</p>}
      </section>
    </main>
  );
}
