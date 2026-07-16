import Link from "next/link";
import { brands } from "@/data/portal";

export function SiteHeader({ activeSlug }: { activeSlug?: string }) {
  return (
    <header className="siteHeader">
      <div className="siteHeaderInner">
        <Link className="wordmark" href="/" aria-label="Lester Sales home">
          <span>Lester</span> Sales
        </Link>
        <nav aria-label="Brand navigation" className="brandNav">
          {brands.map((brand) => (
            <Link
              aria-current={activeSlug === brand.slug ? "page" : undefined}
              className="brandNavLink"
              href={`/brands/${brand.slug}`}
              key={brand.slug}
            >
              {brand.navLabel}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
