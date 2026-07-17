import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/Icons";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { brands, publishedResourceCount } from "@/data/portal";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="homeHero">
          <div className="homeHeroCopy">
            <h1>The right sales tools, right when you need them.</h1>
            <p>
              Browse current inline catalogs, open prebooks, pricing sheets, and art collections by brand.
            </p>
            <Link className="heroAction" href="/brands/champion">
              Browse Champion <ArrowRightIcon className="heroActionIcon" />
            </Link>
          </div>
          <div className="heroCovers" aria-label="Current catalog covers">
            <div className="heroCover heroCoverChampion">
              <Image
                alt="Champion Collegiate 2026 catalog cover"
                fill
                priority
                sizes="(max-width: 760px) 60vw, 340px"
                src="/catalogs/champion-collegiate-2026.jpg"
              />
            </div>
            <div className="heroCover heroCoverGear">
              <Image
                alt="Gear for Sports Collegiate 2026 catalog cover"
                fill
                priority
                sizes="(max-width: 760px) 48vw, 280px"
                src="/catalogs/gear-collegiate-2026.jpg"
              />
            </div>
          </div>
        </section>

        <section className="brandDirectory" aria-labelledby="brands-heading">
          <div className="directoryIntro">
            <h2 id="brands-heading">Browse by brand</h2>
            <p>Every brand page follows the same order: inline catalogs, art library, then open prebooks.</p>
          </div>
          <div className="brandRows">
            {brands.map((brand, index) => {
              const count = publishedResourceCount(brand);
              return (
                <Link className="brandRow" href={`/brands/${brand.slug}`} key={brand.slug}>
                  <span className="brandRowIndex">{String(index + 1).padStart(2, "0")}</span>
                  <span className="brandRowName">{brand.name}</span>
                  <span className="brandRowStatus">{count ? `${count} active resource groups` : "Ready for new materials"}</span>
                  <ArrowRightIcon className="brandRowArrow" />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="homeNote">
          <p>Need help finding the right program?</p>
          <a href="mailto:info@lestersales.net">Contact Lester Sales</a>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
