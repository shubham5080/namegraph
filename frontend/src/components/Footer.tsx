const LINKS = {
  graph: "https://thegraph.com",
  ens: "https://ens.domains",
  privy: "https://privy.io",
  github: "https://github.com/shubham5080/namegraph",
};

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <p className="footer-title">NameGraph</p>
          <p className="footer-tagline">
            Query live onchain data through an ENS-named agent.
          </p>
        </div>

        <div className="footer-col">
          <p className="footer-label">Product</p>
          <a href="/#query">Query</a>
          <a href="/#agent">Agent</a>
        </div>

        <div className="footer-col">
          <p className="footer-label">Network</p>
          <a href={LINKS.graph} target="_blank" rel="noreferrer">
            The Graph
          </a>
          <a href={LINKS.ens} target="_blank" rel="noreferrer">
            ENS
          </a>
          <a href={LINKS.privy} target="_blank" rel="noreferrer">
            Privy
          </a>
        </div>

        <div className="footer-col">
          <p className="footer-label">Developers</p>
          <a href={LINKS.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="https://thegraph.com/docs/" target="_blank" rel="noreferrer">
            Graph Docs
          </a>
        </div>
      </div>

      <div className="site-footer-bottom">
        <p>© {new Date().getFullYear()} NameGraph</p>
        <p>
          <strong>namegraph.eth</strong>
        </p>
      </div>
    </footer>
  );
}
