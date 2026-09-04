import Link from "next/link";

export default function Nav() {
  return (
    <header className="site-nav">
      <div className="site-nav-inner">
        <Link href="/" className="brand">
          <img className="brand-mark" src="/logo.svg" alt="NameGraph" />
          <span className="brand-name">NameGraph</span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          <Link href="/#query">Query</Link>
          <Link href="/#agent">Agent</Link>
          <a href="https://thegraph.com/docs/" target="_blank" rel="noreferrer">
            Docs
          </a>
        </nav>

        <div className="nav-actions">
          <button
            type="button"
            className="nav-cta"
            disabled
            title="Wallet connect coming next"
          >
            Connect
          </button>
        </div>
      </div>
    </header>
  );
}
