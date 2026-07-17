import Image from "next/image";
import { ResourceLink } from "@/components/ResourceLink";
import type { PrebookEntry } from "@/data/portal";

export function PrebookFeature({ prebook }: { prebook: PrebookEntry }) {
  const deadline = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" }).format(new Date(prebook.deadline));
  return (
    <article className="prebookFeature">
      <div className="prebookMedia">
        <Image alt={prebook.imageAlt} fill sizes="(max-width: 760px) 100vw, 48vw" src={prebook.image} unoptimized={prebook.image.startsWith("/api/media/") || prebook.image.startsWith("http")} />
      </div>
      <div className="prebookContent">
        <div className="prebookTitleRow">
          <div>
            <p>{prebook.season}</p>
            <h3>{prebook.title}</h3>
          </div>
          <span className={`statusPill status-${prebook.status}`}>
            {prebook.status === "closing-soon" ? "Closing soon" : "Open"}
          </span>
        </div>
        <dl className="prebookFacts">
          <div><dt>Book by</dt><dd>{deadline}</dd></div>
          <div><dt>Expected ship</dt><dd>{prebook.shipDate}</dd></div>
          <div><dt>Minimums</dt><dd>{prebook.minimums}</dd></div>
        </dl>
        <ul className="prebookDetails">
          {prebook.details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
        <div className="resourceList">
          {prebook.resources.map((resource) => <ResourceLink key={resource.label} resource={resource} />)}
        </div>
      </div>
    </article>
  );
}
