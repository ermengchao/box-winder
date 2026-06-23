"use client";

import { useCallback, useEffect, useState } from "react";
import { Clients } from "@/components/sections/Clients";
import { Hero } from "@/components/sections/Hero";
import { Price } from "@/components/sections/Price";
import { TechStackBadge } from "@/components/sections/TechStackBadge";

type AuthMode = "login" | "signup";

const AUTH_HASHES = new Set(["#login", "#sign-up"]);

function getAuthModeFromHash(): AuthMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.location.hash === "#login") {
    return "login";
  }

  if (window.location.hash === "#sign-up") {
    return "signup";
  }

  return null;
}

function setHash(hash: string) {
  window.location.hash = hash;
}

function clearHash() {
  const { pathname, search } = window.location;
  window.history.pushState(null, "", `${pathname}${search}`);
  window.dispatchEvent(new Event("hashchange"));
}

export function HomeScene() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);

  const closeAuth = useCallback(() => {
    if (AUTH_HASHES.has(window.location.hash)) {
      clearHash();
    }
  }, []);

  useEffect(() => {
    const syncAuthMode = () => {
      setAuthMode(getAuthModeFromHash());
    };

    syncAuthMode();
    window.addEventListener("hashchange", syncAuthMode);
    return () => window.removeEventListener("hashchange", syncAuthMode);
  }, []);

  return (
    <main className="overflow-x-hidden bg-background">
      <Hero
        authMode={authMode}
        onAuthClose={closeAuth}
        onAuthIntent={(mode) =>
          setHash(mode === "login" ? "#login" : "#sign-up")
        }
      />
      <Clients />
      <Price />
      <TechStackBadge />
    </main>
  );
}

export default HomeScene;
