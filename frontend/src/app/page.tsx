"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import WalletButton, {
  hasPrivyConfig,
  useConnectedWalletAddress,
} from "@/components/WalletButton";

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

function HomeWorkspace({ wallet }: { wallet: string | null }) {
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
        body: JSON.stringify({
          question: trimmed,
          wallet: wallet || undefined,
        }),
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

  const payerHint = wallet
    ? `Paying as ${wallet.slice(0, 6)}…${wallet.slice(-4)} · 1 credit / Graph query`
    : hasPrivyConfig()
      ? "Connect wallet so receipts show your address · 1 credit / Graph query"
      : "Set NEXT_PUBLIC_PRIVY_APP_ID to enable Privy · 1 credit / Graph query";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Logo size={36} />
          <div>
            <strong>NameGraph</strong>
            <span>Onchain research agent</span>
          </div>
        </div>

        <div className="side-card agent-card">
          <div className="agent-row">
            <Logo size={40} className="agent-avatar" />
            <div>
              <h2>{identity?.display_name || AGENT_ENS}</h2>
              <p>
                {identity?.resolved
                  ? `Resolved · ${shortAddr}`
                  : "Resolving ENS…"}
              </p>
            </div>
          </div>
          <div className={`status-dot ${online ? "live" : ""}`}>
            <i />
            {online ? "Service live" : "Service offline"}
          </div>
        </div>

        <div className="side-card">
          <p style={{ margin: "0 0 0.35rem", fontSize: "0.72rem" }}>Credits</p>
          <div className="balance-row">
            <strong>{credits ?? "—"}</strong>
            <button type="button" onClick={onTopUp}>
              Add +5
            </button>
          </div>
        </div>

        <nav className="side-nav" aria-label="Product">
          <a href="https://thegraph.com/docs/" target="_blank" rel="noreferrer">
            The Graph docs
          </a>
          <a
            href="https://github.com/shubham5080/namegraph"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>

        <div className="sidebar-foot">
          <WalletButton />
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.72rem" }}>
            {payerHint}
          </p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <h1>Conversation</h1>
            <p>Ask Uniswap or ENS questions · get a receipt</p>
          </div>
          <div className="topbar-actions">
            {messages.length > 0 && (
              <button
                type="button"
                className="side-btn"
                onClick={() => {
                  persist([]);
                  setOpenReceipt(null);
                }}
              >
                New chat
              </button>
            )}
          </div>
        </header>

        <section className="chat">
          <div className="thread" aria-live="polite">
            {messages.length === 0 && (
              <div className="empty">
                <h2>What do you want to know?</h2>
                <p>
                  {AGENT_ENS} routes your question to The Graph and returns
                  indexed onchain answers.
                </p>
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
                <div className="msg-av" aria-hidden>
                  {m.role === "user" ? "YOU" : <Logo size={30} alt="" />}
                </div>
                <div className="bubble">
                  <p className="bubble-meta">
                    {m.role === "user" ? "You" : AGENT_ENS}
                    {m.subgraph ? ` · ${m.subgraph}` : ""}
                  </p>
                  <p className="bubble-text">{m.text}</p>
                  {m.receipt && m.receipt.credits > 0 && (
                    <>
                      <button
                        type="button"
                        className="receipt-btn"
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
                        <div className="receipt">
                          <div>
                            <span>Paid by</span>
                            <strong>{m.receipt.paid_by}</strong>
                          </div>
                          <div>
                            <span>Proof</span>
                            <strong>{m.receipt.proof}</strong>
                          </div>
                          <div>
                            <span>Subgraph</span>
                            <strong>{m.receipt.subgraph}</strong>
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
                    </>
                  )}
                </div>
              </article>
            ))}

            {loading && (
              <article className="msg agent">
                <div className="msg-av" aria-hidden>
                  <Logo size={30} alt="" />
                </div>
                <div className="bubble">
                  <p className="bubble-meta">{AGENT_ENS}</p>
                  <p className="bubble-text typing">Querying The Graph…</p>
                </div>
              </article>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="composer-wrap">
            <form className="composer" onSubmit={onAsk}>
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
              <button type="submit" className="send" disabled={!canSend}>
                {loading ? "…" : "Send"}
              </button>
            </form>
            <p className="hint">Enter to send · Shift+Enter for newline</p>
            {error && <p className="error">{error}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function HomeWithPrivy() {
  const wallet = useConnectedWalletAddress();
  return <HomeWorkspace wallet={wallet} />;
}

export default function HomePage() {
  if (hasPrivyConfig()) {
    return <HomeWithPrivy />;
  }
  return <HomeWorkspace wallet={null} />;
}
