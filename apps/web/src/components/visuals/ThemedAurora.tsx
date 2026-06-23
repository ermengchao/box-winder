"use client";

import { useEffect, useState } from "react";
import Aurora from "@/components/react-bits/Aurora";

type ThemedAuroraProps = {
  amplitude?: number;
  blend?: number;
  speed?: number;
};

const THEME_CHANGE_EVENT = "awsing-theme-change";

const AURORA_COLOR_STOPS = {
  dark: ["#cba6f7", "#89dceb", "#b4befe"],
  light: ["#8839ef", "#04a5e5", "#7287fd"],
} as const;

function getCurrentTheme() {
  if (typeof document === "undefined") return "dark";

  return document.documentElement.classList.contains("light")
    ? "light"
    : "dark";
}

export function ThemedAurora(props: ThemedAuroraProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(getCurrentTheme());

    const handleThemeChange = () => {
      window.requestAnimationFrame(() => {
        setTheme(getCurrentTheme());
      });
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    return () =>
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  }, []);

  return <Aurora {...props} colorStops={[...AURORA_COLOR_STOPS[theme]]} />;
}

export default ThemedAurora;
