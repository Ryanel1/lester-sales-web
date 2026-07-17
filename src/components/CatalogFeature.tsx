import Image from "next/image";
import { ResourceLink } from "@/components/ResourceLink";
import type { CatalogEntry } from "@/data/portal";

export function CatalogFeature({ catalog, priority = false }: { catalog: CatalogEntry; priority?: boolean }) {
  const catalogsAndPrograms = catalog.resources.filter((resource) => resource.kind !== "pricing");
  const pricing = catalog.resources.filter((resource) => resource.kind === "pricing");
  const resourceGroups = [
    { label: "Catalogs & programs", resources: catalogsAndPrograms },
    { label: "Pricing", resources: pricing },
  ].filter((group) => group.resources.length > 0);

  return (
    <article className="catalogFeature">
      <div className="catalogCoverWell">
        <Image
          alt={catalog.imageAlt}
          className="catalogCover"
          height={792}
          priority={priority}
          sizes="(max-width: 760px) 80vw, 430px"
          src={catalog.image}
          unoptimized={catalog.image.startsWith("/api/media/") || catalog.image.startsWith("http")}
          width={612}
        />
      </div>
      <div className="catalogContent">
        <p className="catalogSeason">{catalog.season}</p>
        <h3>{catalog.title}</h3>
        <p className="catalogSummary">{catalog.summary}</p>
        <div className="resourceColumns" aria-label={`Resources for ${catalog.title}`}>
          {resourceGroups.map((group) => (
            <section className="resourceColumn" key={group.label}>
              <h4>{group.label}</h4>
              <div className="resourceColumnList">
                {group.resources.map((resource) => (
                  <ResourceLink key={resource.label} resource={resource} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
