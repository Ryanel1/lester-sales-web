"use client";

import { useEffect, useState } from "react";

const sections = [
  { id: "inline", label: "Inline catalogs" },
  { id: "art-library", label: "Art library" },
  { id: "prebooks", label: "Open prebooks" },
] as const;

type SectionId = (typeof sections)[number]["id"];

function isSectionId(value: string): value is SectionId {
  return sections.some((section) => section.id === value);
}

export function SectionNav({ brandName }: { brandName: string }) {
  const [activeSection, setActiveSection] = useState<SectionId>("inline");

  useEffect(() => {
    const readHash = () => {
      const hash = window.location.hash.slice(1);
      if (isSectionId(hash)) setActiveSection(hash);
    };

    readHash();
    window.addEventListener("hashchange", readHash);

    const visibleSections = new Map<SectionId, IntersectionObserverEntry>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (!isSectionId(id)) continue;
          if (entry.isIntersecting) visibleSections.set(id, entry);
          else visibleSections.delete(id);
        }

        const next = [...visibleSections.entries()].sort(
          ([, first], [, second]) => first.boundingClientRect.top - second.boundingClientRect.top,
        )[0]?.[0];

        if (next) setActiveSection(next);
      },
      { rootMargin: "-22% 0px -62% 0px", threshold: [0, 0.15, 0.5, 1] },
    );

    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", readHash);
    };
  }, []);

  return (
    <nav aria-label={`${brandName} page sections`} className="sectionNav">
      {sections.map((section) => (
        <a
          aria-current={activeSection === section.id ? "location" : undefined}
          href={`#${section.id}`}
          key={section.id}
          onClick={() => setActiveSection(section.id)}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
