"use client";

import { useEffect, useState } from "react";
import LogoLoop, { type LogoItem } from "@/components/react-bits/LogoLoop";

const TECH_STACK = [
  {
    name: "Next.js",
    logo: "/tech-icons/nextjs.svg",
  },
  {
    name: "React",
    logo: "/tech-icons/react.svg",
  },
  {
    name: "TypeScript",
    logo: "/tech-icons/typescript.svg",
  },
  {
    name: "Tailwind CSS",
    logo: "/tech-icons/tailwind.svg",
  },
  {
    name: "GSAP",
    logo: "/tech-icons/gsap.svg",
  },
  {
    name: "shadcn/ui",
    logo: "/tech-icons/shadcn-ui.svg",
  },
  {
    name: "cobe",
    logo: "/tech-icons/cobe.svg",
  },
  {
    name: "Bun",
    logo: "/tech-icons/bun.svg",
  },
  {
    name: "PostgreSQL",
    logo: "/tech-icons/postgresql.svg",
  },
  {
    name: "GraphQL",
    logo: "/tech-icons/graphql.svg",
  },
  {
    name: "Apollo Client",
    logo: "/tech-icons/apollo-client.svg",
  },
  {
    name: "Rust",
    logo: "/tech-icons/rust.svg",
  },
] as const;

const TECH_LOGOS: LogoItem[] = TECH_STACK.map((tech) => ({
  title: tech.name,
  ariaLabel: tech.name,
  node: (
    <span className="inline-flex h-16 w-16 items-center justify-center text-foreground/90 transition-opacity duration-300 group-hover/item:opacity-100 sm:h-20 sm:w-20">
      <span
        aria-hidden="true"
        className="h-11 w-11 shrink-0 bg-[var(--ctp-text)] opacity-90 drop-shadow-[0_20px_34px_rgba(255,255,255,0.08)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] sm:h-14 sm:w-14"
        style={{
          maskImage: `url(${tech.logo})`,
          WebkitMaskImage: `url(${tech.logo})`,
        }}
      />
    </span>
  ),
}));

const getResponsiveGap = () => {
  return Math.round(Math.min(172, Math.max(42, window.innerWidth * 0.085)));
};

export function TechStackBadge() {
  const [gap, setGap] = useState(72);

  useEffect(() => {
    const updateGap = () => setGap(getResponsiveGap());

    updateGap();
    window.addEventListener("resize", updateGap);

    return () => window.removeEventListener("resize", updateGap);
  }, []);

  return (
    <section
      aria-label="Technology stack"
      className="relative isolate z-10 overflow-hidden bg-background px-4 py-6 text-foreground sm:px-6 sm:py-8 lg:px-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_50%,color-mix(in_oklab,var(--ctp-mauve)_10%,transparent),transparent_28%),radial-gradient(circle_at_80%_50%,color-mix(in_oklab,var(--ctp-sky)_10%,transparent),transparent_28%)]"
      />
      <div className="relative z-10 mx-auto flex min-h-[160px] w-full max-w-[1680px] items-center overflow-hidden rounded-[28px] border border-border/80 bg-[#0f0d15]/80 px-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_28px_90px_rgba(0,0,0,0.28)] sm:min-h-[200px] lg:min-h-[240px]">
        <LogoLoop
          ariaLabel="Technology stack logos"
          className="w-full"
          fadeOut
          fadeOutColor="#0f0d15"
          gap={gap}
          logoHeight={80}
          logos={TECH_LOGOS}
          pauseOnHover
          scaleOnHover
          speed={54}
        />
      </div>
    </section>
  );
}

export default TechStackBadge;
