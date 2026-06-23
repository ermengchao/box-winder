"use client";

import createGlobe from "cobe";
import type { CSSProperties } from "react";
import { forwardRef, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type CobeEarthHorizonProps = {
  className?: string;
  canvasClassName?: string;
  rotationSpeed?: number;
};

type CobeInstance = ReturnType<typeof createGlobe>;

type AnchorLabelStyle = CSSProperties & {
  positionAnchor: string;
};

type RgbUnit = [number, number, number];

const MARKER_SIZE = 0.02;
const FALLBACK_MAUVE = "#cba6f7";
const FALLBACK_PINK = "#f5c2e7";
const FALLBACK_SKY = "#89dceb";
const THEME_CHANGE_EVENT = "awsing-theme-change";

const MARKERS = [
  {
    id: "sanjose",
    location: [37.37, -121.92] as [number, number],
    label: "us-west-1",
  },
  {
    id: "ashburn",
    location: [39.04, -77.49] as [number, number],
    label: "us-east-1",
  },
  {
    id: "dublin",
    location: [53.35, -6.26] as [number, number],
    label: "eu-west-1",
  },
  {
    id: "frankfurt",
    location: [50.11, 8.68] as [number, number],
    label: "eu-central-1",
  },
  {
    id: "singapore",
    location: [1.35, 103.82] as [number, number],
    label: "ap-southeast-1",
  },
  {
    id: "tokyo",
    location: [35.68, 139.65] as [number, number],
    label: "ap-northeast-1",
  },
  {
    id: "sydney",
    location: [-33.87, 151.21] as [number, number],
    label: "ap-southeast-2",
  },
  {
    id: "saopaulo",
    location: [-23.55, -46.63] as [number, number],
    label: "sa-east-1",
  },
].map((marker) => ({
  ...marker,
  size: MARKER_SIZE,
}));

const ARCS = MARKERS.slice(0, -1).map((marker, i) => ({
  from: marker.location,
  to: MARKERS[i + 1].location,
}));

function hexToRgbUnit(hex: string): RgbUnit {
  const value = hex.trim().replace("#", "");
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : value;

  const number = Number.parseInt(normalized, 16);

  return [
    ((number >> 16) & 255) / 255,
    ((number >> 8) & 255) / 255,
    (number & 255) / 255,
  ];
}

function getThemeColor(variableName: string, fallback: string): RgbUnit {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();

  return hexToRgbUnit(value || fallback);
}

export const CobeEarthHorizon = forwardRef<HTMLElement, CobeEarthHorizonProps>(
  function CobeEarthHorizon(
    { className, canvasClassName, rotationSpeed = 1 },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const globeRef = useRef<CobeInstance | null>(null);
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      let width = 0;
      let height = 0;
      let phi = 1;

      const refreshTheme = () => {
        width = 0;
        height = 0;
        globeRef.current?.destroy();
        globeRef.current = null;
      };

      window.addEventListener(THEME_CHANGE_EVENT, refreshTheme);

      const render = () => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const size = Math.max(viewportWidth, viewportHeight);
        const nextWidth = Math.round(size);
        const nextHeight = Math.round(size);

        if (!globeRef.current || width !== nextWidth || height !== nextHeight) {
          const mauveColor = getThemeColor("--ctp-mauve", FALLBACK_MAUVE);
          const pinkColor = getThemeColor("--ctp-pink", FALLBACK_PINK);
          const skyColor = getThemeColor("--ctp-sky", FALLBACK_SKY);

          width = nextWidth;
          height = nextHeight;

          globeRef.current?.destroy();
          globeRef.current = createGlobe(canvas, {
            devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
            width,
            height,
            phi,
            theta: 0.2,
            dark: 0,
            diffuse: 0,
            mapSamples: 10000,
            mapBrightness: 2,
            mapBaseBrightness: 0,
            scale: 1.25,
            offset: [0, 0],
            baseColor: skyColor,
            markerColor: pinkColor,
            arcColor: pinkColor,
            glowColor: mauveColor,
            markers: MARKERS,
            arcs: ARCS,
            arcHeight: 0,
            arcWidth: 0.5,
            markerElevation: 0.02,
          });
        }

        globeRef.current?.update({ phi, theta: 0.2 });
        phi += 0.0016 * rotationSpeed;
        frameRef.current = window.requestAnimationFrame(render);
      };

      render();

      return () => {
        window.removeEventListener(THEME_CHANGE_EVENT, refreshTheme);
        if (frameRef.current !== null)
          window.cancelAnimationFrame(frameRef.current);
        globeRef.current?.destroy();
        globeRef.current = null;
      };
    }, [rotationSpeed]);

    return (
      <main
        ref={ref}
        className={cn(
          "relative h-[max(100vw,100vh)] w-[max(100vw,100vh)]",
          className,
        )}
      >
        <canvas
          ref={canvasRef}
          className={cn("h-full w-full", canvasClassName)}
        />
        {MARKERS.map((marker) => (
          <div
            key={marker.id}
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-ctp-mauve/25 bg-background/80 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-ctp-mauve shadow-[0_0_18px_color-mix(in_oklab,var(--ctp-mauve)_24%,transparent)] backdrop-blur transition-[opacity,filter] duration-300"
            style={
              {
                positionAnchor: `--cobe-${marker.id}`,
                bottom: "anchor(top)",
                left: "anchor(center)",
                marginBottom: "8px",
                opacity: `var(--cobe-visible-${marker.id}, 0)`,
                filter: `blur(calc((1 - var(--cobe-visible-${marker.id}, 0)) * 8px))`,
              } as AnchorLabelStyle
            }
          >
            {marker.label}
          </div>
        ))}
      </main>
    );
  },
);
