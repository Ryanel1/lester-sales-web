import Link from "next/link";

export function SiteFooter({ variant = "default" }: { variant?: "default" | "portfolio" }) {
  return (
    <footer className={`siteFooter${variant === "portfolio" ? " siteFooterPortfolio" : ""}`}>
      <div>
        <Link className="footerWordmark" href="/">Lester Sales</Link>
        <p>Current catalogs, programs, pricing, and art resources—organized to support your work.</p>
      </div>
      <div className="footerLinks">
        <a
          href="/documents/account/account-application-2025.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Account Application
        </a>
        <a href="mailto:info@lestersales.net">Contact</a>
        <form action="/api/logout" method="post">
          <button type="submit">Sign out</button>
        </form>
        <span>Here to help you succeed</span>
      </div>
    </footer>
  );
}
