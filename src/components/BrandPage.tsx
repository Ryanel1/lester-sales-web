import { CatalogFeature } from "@/components/CatalogFeature";
import { PrebookFeature } from "@/components/PrebookFeature";
import { ResourceLink } from "@/components/ResourceLink";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { Brand } from "@/data/portal";

function EmptySection({ children }: { children: React.ReactNode }) {
  return (
    <div className="emptySection">
      <span aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export function BrandPage({ brand }: { brand: Brand }) {
  return (
    <>
      <SiteHeader activeSlug={brand.slug} />
      <main id="main-content" style={{ "--brand-accent": brand.accent } as React.CSSProperties}>
        <section className="brandIntro">
          <div className="brandIntroInner">
            <p className="brandContext">Customer resource library</p>
            <h1>{brand.name}</h1>
            <p>{brand.shortDescription}</p>
          </div>
          <nav aria-label={`${brand.name} page sections`} className="sectionNav">
            <a href="#inline">Inline catalogs</a>
            <a href="#prebooks">Open prebooks</a>
            <a href="#art-library">Art library</a>
          </nav>
        </section>

        <section className="portalSection inlineSection" id="inline">
          <div className="sectionHeading">
            <div>
              <h2>Inline catalogs</h2>
              <p>Current in-stock collections and the files that support each assortment.</p>
            </div>
            <span>{brand.inlineCatalogs.length} published</span>
          </div>
          {brand.inlineCatalogs.length ? (
            <div className="catalogStack">
              {brand.inlineCatalogs.map((catalog, index) => (
                <CatalogFeature catalog={catalog} key={catalog.id} priority={index === 0} />
              ))}
            </div>
          ) : (
            <EmptySection>No current inline catalogs are published for this brand.</EmptySection>
          )}
        </section>

        <section className="portalSection prebookSection" id="prebooks">
          <div className="sectionHeading sectionHeadingDark">
            <div>
              <h2>Open prebooks</h2>
              <p>Limited-time programs with booking dates, ship timing, minimums, and order files.</p>
            </div>
            <span>{brand.prebooks.length} open</span>
          </div>
          {brand.prebooks.length ? (
            <div className="prebookStack">
              {brand.prebooks.map((prebook) => <PrebookFeature key={prebook.id} prebook={prebook} />)}
            </div>
          ) : (
            <div className="emptySection emptySectionDark">
              <span aria-hidden="true" />
              <p>No prebooks are open right now. New programs will appear here when they are published.</p>
            </div>
          )}
        </section>

        <section className="portalSection artSection" id="art-library">
          <div className="sectionHeading">
            <div>
              <h2>Art library</h2>
              <p>Reusable design collections organized around the way customers build assortments.</p>
            </div>
            <span>{brand.artGroups.length} groups</span>
          </div>
          {brand.artGroups.length ? (
            <div className="artGroups">
              {brand.artGroups.map((group) => (
                <div className="artGroup" key={group.title}>
                  <h3>{group.title}</h3>
                  <div className="artLinks">
                    {group.resources.map((resource) => (
                      <ResourceLink compact key={resource.label} resource={resource} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptySection>No art collections are published for this brand.</EmptySection>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
