import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export function PortalUnavailable({ slug }: { slug: string }) {
  return (
    <>
      <SiteHeader activeSlug={slug} />
      <main id="main-content">
        <section className="brandIntro">
          <div className="brandIntroInner">
            <h1>Resources are temporarily unavailable</h1>
            <p>We couldn’t load the current catalog library. Your access is still working, and no action is needed on your side.</p>
          </div>
        </section>
        <section className="portalSection">
          <div className="emptySection" role="status">
            <span aria-hidden="true" />
            <p>
              Please <Link href={`/brands/${slug}`}>try again</Link> in a moment. If you need a file right away, <a href="mailto:info@lestersales.net">contact Lester Sales</a> and we’ll help you find it.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
