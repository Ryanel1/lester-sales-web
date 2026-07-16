import { ArrowUpRightIcon, FileIcon } from "@/components/Icons";
import type { PortalResource } from "@/data/portal";

export function ResourceLink({ resource, compact = false }: { resource: PortalResource; compact?: boolean }) {
  const className = compact ? "resourceLink resourceLinkCompact" : "resourceLink";

  if (!resource.href) {
    return (
      <span aria-label={`${resource.label} is not yet published`} className={`${className} resourceLinkUnavailable`}>
        <FileIcon className="resourceIcon" />
        <span>{resource.label}</span>
        <span className="resourceState">Awaiting file</span>
      </span>
    );
  }

  return (
    <a className={className} href={resource.href} rel="noreferrer" target="_blank">
      <FileIcon className="resourceIcon" />
      <span>{resource.label}</span>
      <ArrowUpRightIcon className="resourceArrow" />
    </a>
  );
}
