import { CatalogFeature } from "@/components/CatalogFeature";
import { PrebookFeature } from "@/components/PrebookFeature";
import { ResourceLink } from "@/components/ResourceLink";
import { SectionNav } from "@/components/SectionNav";
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
            <h1>{brand.name}</h1>
            <p>{brand.shortDescription}</p>
          </div>
          <SectionNav brandName={brand.name} />
        </section>

        <section className="portalSection inlineSection" id="inline">
          <div className="sectionHeading">
            <div>
              <h2>Inline catalogs</h2>
              <p>Current in-stock collections with the catalogs, pricing, and programs you need in one place.</p>
            </div>
          </div>
          {brand.inlineCatalogs.length ? (
            <div className="catalogStack">
              {brand.inlineCatalogs.map((catalog, index) => (
                <CatalogFeature catalog={catalog} key={catalog.id} priority={index === 0} />
              ))}
            </div>
          ) : (
            <EmptySection>No catalogs are available here right now. New materials will appear as soon as they are ready.</EmptySection>
          )}
        </section>

        <section className="portalSection artSection" id="art-library">
          <div className="sectionHeading">
            <div>
              <h2>Art library</h2>
              <p>Reusable design collections organized to help you build assortments more easily.</p>
            </div>
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
            <EmptySection>No art collections are available here right now. New collections will appear as soon as they are ready.</EmptySection>
          )}
        </section>

        <section className="portalSection prebookSection" id="prebooks">
          <div className="sectionHeading">
            <div>
              <h2>Open prebooks</h2>
              <p>Limited-time programs with booking dates, ship timing, minimums, and order files together in one place.</p>
            </div>
            <span>{brand.prebooks.length} open</span>
          </div>
          {brand.prebooks.length ? (
            <div className="prebookStack">
              {brand.prebooks.map((prebook) => <PrebookFeature key={prebook.id} prebook={prebook} />)}
            </div>
          ) : (
            <EmptySection>No prebooks are open right now. When a new program opens, you’ll find it here.</EmptySection>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
