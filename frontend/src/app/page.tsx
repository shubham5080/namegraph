"use client";

import { FormEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AGENT_ENS = process.env.NEXT_PUBLIC_AGENT_ENS || "namegraph.eth";

type AskResponse = {
  agent: string;
  question: string;
  answer: string;
  graph: Record<string, unknown>;
  credits_charged: number;
};

export default function HomePage() {
  const [question, setQuestion] = useState(
    "How many Uniswap V3 pools does the factory report?",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);

  async function onAsk(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as AskResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <p className="pill">ETHOnline 2026</p>
      <p className="pill">The Graph · ENS · Privy</p>
      <h1>NameGraph</h1>
      <p className="tag">
        Agent <strong>{AGENT_ENS}</strong> — ENS-named agents that pay to query
        The Graph.
      </p>

      <div className="card">
        <p className="meta">
          Privy login wires in next — ask the agent against the backend now.
        </p>
        <form onSubmit={onAsk}>
          <label htmlFor="q">Ask NameGraph</label>
          <textarea
            id="q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button type="submit" disabled={loading || !question.trim()}>
            {loading ? "Querying…" : "Ask (1 credit)"}
          </button>
        </form>
      </div>

      {error && (
        <div className="card">
          <p className="answer">Error: {error}</p>
          <p className="meta">Is the backend running on {API_URL}?</p>
        </div>
      )}

      {result && (
        <div className="card">
          <p className="meta">
            {result.agent} · charged {result.credits_charged} credit
          </p>
          <p className="answer">{result.answer}</p>
          <pre className="meta" style={{ overflow: "auto" }}>
            {JSON.stringify(result.graph, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
