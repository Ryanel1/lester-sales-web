import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="siteFooter">
      <div>
        <Link className="footerWordmark" href="/">Lester Sales</Link>
        <p>Current catalogs, programs, pricing, and art resources for Lester Sales customers.</p>
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
        <span>Customer resources</span>
      </div>
    </footer>
  );
}
