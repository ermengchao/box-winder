"use client";

import { useEffect, useState } from "react";
import CircularGallery from "@/components/react-bits/CircularGallery";

const clientIcon = (group: "desktop" | "mobile", file: string) =>
  `/client-icons/${group}/${file}`;

const DESKTOP_CLIENT_ITEMS = [
  {
    image: clientIcon("desktop", "clash-verge-rev.png"),
    text: "Clash Verge Rev",
  },
  {
    image: clientIcon("desktop", "clash-verge.png"),
    text: "Clash Verge",
  },
  {
    image: clientIcon("desktop", "sing-box.png"),
    text: "sing-box",
  },
  {
    image: clientIcon("desktop", "surge.png"),
    text: "Surge",
  },
  {
    image: clientIcon("desktop", "stash.png"),
    text: "Stash",
  },
  {
    image: clientIcon("desktop", "v2rayn.png"),
    text: "v2rayN",
  },
] as const;

const MOBILE_CLIENT_ITEMS = [
  {
    image: clientIcon("mobile", "shadowrocket.png"),
    text: "Shadowrocket",
  },
  {
    image: clientIcon("mobile", "quantumult-x.png"),
    text: "Quantumult X",
  },
  {
    image: clientIcon("mobile", "loon.png"),
    text: "Loon",
  },
  {
    image: clientIcon("mobile", "surfboard.png"),
    text: "Surfboard",
  },
  {
    image: clientIcon("mobile", "v2box.png"),
    text: "V2Box",
  },
  {
    image: clientIcon("mobile", "v2rayn.png"),
    text: "v2rayN",
  },
  {
    image: clientIcon("mobile", "hiddify.png"),
    text: "Hiddify",
  },
  {
    image: clientIcon("mobile", "sing-box.png"),
    text: "sing-box",
  },
  {
    image: clientIcon("mobile", "surge.png"),
    text: "Surge",
  },
  {
    image: clientIcon("mobile", "stash.png"),
    text: "Stash",
  },
] as const;

type GalleryTuning = {
  desktopBend: number;
  desktopSpeed: number;
  mobileBend: number;
  mobileSpeed: number;
};

const getGalleryTuning = (): GalleryTuning => {
  if (typeof window === "undefined") {
    return {
      desktopBend: 32,
      desktopSpeed: -1.2,
      mobileBend: -8,
      mobileSpeed: 1.6,
    };
  }

  if (window.matchMedia("(min-width: 1536px)").matches) {
    return {
      desktopBend: 38,
      desktopSpeed: -1.35,
      mobileBend: -10,
      mobileSpeed: 1.85,
    };
  }

  if (window.matchMedia("(min-width: 1024px)").matches) {
    return {
      desktopBend: 32,
      desktopSpeed: -1.2,
      mobileBend: -8,
      mobileSpeed: 1.6,
    };
  }

  if (window.matchMedia("(min-width: 640px)").matches) {
    return {
      desktopBend: 22,
      desktopSpeed: -1,
      mobileBend: -6,
      mobileSpeed: 1.35,
    };
  }

  return {
    desktopBend: 12,
    desktopSpeed: -0.82,
    mobileBend: -3,
    mobileSpeed: 1.05,
  };
};

export function Clients() {
  const [isMounted, setIsMounted] = useState(false);
  const [showDesktopGallery, setShowDesktopGallery] = useState(false);
  const [galleryTuning, setGalleryTuning] =
    useState<GalleryTuning>(getGalleryTuning);
  const [galleryFont, setGalleryFont] = useState("bold 30px monospace");
  useEffect(() => {
    const sfMono = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-sf-mono")
      .trim();
    setGalleryFont(`bold 30px ${sfMono || "monospace"}`);
    setGalleryTuning(getGalleryTuning());
    setIsMounted(true);

    const handleResize = () => {
      setGalleryTuning(getGalleryTuning());
    };

    window.addEventListener("resize", handleResize);
    const desktopGalleryTimer = window.setTimeout(() => {
      setShowDesktopGallery(true);
    }, 180);
    return () => {
      window.clearTimeout(desktopGalleryTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  return (
    <section
      id="clients"
      className="relative isolate z-10 min-h-screen w-screen overflow-hidden bg-background px-6 py-24 text-foreground lg:px-8"
    >
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-7xl flex-col justify-center gap-8">
        <div className="relative h-[240px] w-full overflow-hidden sm:h-[260px] lg:h-[280px]">
          {isMounted ? (
            <CircularGallery
              bend={galleryTuning.mobileBend}
              borderRadius={0.14}
              font={galleryFont}
              fontUrl=""
              items={[...MOBILE_CLIENT_ITEMS]}
              scrollEase={0.06}
              scrollSpeed={galleryTuning.mobileSpeed}
              textColor="#ffffff"
            />
          ) : null}
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.28em] text-ctp-sky">
            Clients
          </p>

          <h2 className="mt-4 font-heading text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
            Connect with the proxy clients you already use.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-8 text-muted-foreground sm:text-lg">
            Import subscriptions into Clash Verge, sing-box, Surge,
            Shadowrocket, Quantumult X, and other everyday clients with
            consistent endpoints and predictable routing behavior.
          </p>
        </div>

        <div className="relative h-[240px] w-full overflow-hidden sm:h-[260px] lg:h-[280px]">
          {showDesktopGallery ? (
            <CircularGallery
              bend={galleryTuning.desktopBend}
              borderRadius={0.14}
              font={galleryFont}
              fontUrl=""
              items={[...DESKTOP_CLIENT_ITEMS]}
              scrollEase={0.06}
              scrollSpeed={galleryTuning.desktopSpeed}
              textColor="#ffffff"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default Clients;
