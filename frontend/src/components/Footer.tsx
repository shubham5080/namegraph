const GITHUB_URL = "https://github.com/shubham5080/namegraph";

const PARTNERS = [
  { name: "The Graph", href: "https://thegraph.com" },
  { name: "ENS", href: "https://ens.domains" },
  { name: "Privy", href: "https://privy.io" },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <p className="footer-title">NameGraph</p>
          <p className="footer-tagline">
            ENS-named agents that pay to query The Graph for live onchain answers.
          </p>
        </div>

        <div className="footer-col">
          <p className="footer-label">Product</p>
          <a href="/#agent">Agent identity</a>
          <a href="/#ask">Ask the agent</a>
          <a href="/#history">Query history</a>
        </div>

        <div className="footer-col">
          <p className="footer-label">Partners</p>
          {PARTNERS.map((p) => (
            <a key={p.name} href={p.href} target="_blank" rel="noreferrer">
              {p.name}
            </a>
          ))}
        </div>

        <div className="footer-col">
          <p className="footer-label">Project</p>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
          <a href={`${GITHUB_URL}/blob/main/PLAN.md`} target="_blank" rel="noreferrer">
            Build plan
          </a>
          <a href={`${GITHUB_URL}/blob/main/AI_USAGE.md`} target="_blank" rel="noreferrer">
            AI disclosure
          </a>
        </div>
      </div>

      <div className="site-footer-bottom">
        <p>Built for ETHOnline 2026 · Classic / From Scratch</p>
        <p>
          Agent <strong>namegraph.eth</strong> · MIT License
        </p>
      </div>
    </footer>
  );
}
