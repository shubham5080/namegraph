import Link from "next/link";

const GITHUB_URL = "https://github.com/shubham5080/namegraph";

export default function Nav() {
  return (
    <header className="site-nav">
      <div className="site-nav-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">NG</span>
          <span className="brand-text">
            NameGraph
            <span className="brand-sub">ETHOnline 2026</span>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          <Link href="/#agent">Agent</Link>
          <Link href="/#ask">Ask</Link>
          <Link href="/#history">History</Link>
          <a href={`${GITHUB_URL}#readme`} target="_blank" rel="noreferrer">
            Docs
          </a>
        </nav>

        <div className="nav-actions">
          <span className="pill nav-pill">The Graph · ENS · Privy</span>
          <a
            className="nav-cta"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
