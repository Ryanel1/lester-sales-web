import Image from "next/image";
import { ResourceLink } from "@/components/ResourceLink";
import type { CatalogEntry } from "@/data/portal";

export function CatalogFeature({ catalog, priority = false }: { catalog: CatalogEntry; priority?: boolean }) {
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
          width={612}
        />
      </div>
      <div className="catalogContent">
        <p className="catalogSeason">{catalog.season}</p>
        <h3>{catalog.title}</h3>
        <p className="catalogSummary">{catalog.summary}</p>
        <div className="resourceList" aria-label={`Resources for ${catalog.title}`}>
          {catalog.resources.map((resource) => (
            <ResourceLink key={resource.label} resource={resource} />
          ))}
        </div>
      </div>
    </article>
  );
}
