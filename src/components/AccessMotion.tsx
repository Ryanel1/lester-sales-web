"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

export function AccessMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const wordmark = root.current.querySelector(".accessWordmark");
    const tagline = root.current.querySelector(".accessTagline");
    const panel = root.current.querySelector(".accessPanel");
    const panelContent = root.current.querySelectorAll(".accessFormWrap > *");

    const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
    entrance
      .from(wordmark, { duration: 0.62, y: 10 })
      .from(tagline, { duration: 0.55, y: 8 }, "-=0.4")
      .from(panel, { duration: 0.72, y: 18 }, "-=0.34")
      .from(panelContent, { duration: 0.42, stagger: 0.045, y: 7 }, "-=0.46");
  }, { scope: root });

  return <div className="accessShell" ref={root}>{children}</div>;
}
