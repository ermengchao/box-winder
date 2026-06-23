"use client";

import {
  Check,
  Clipboard,
  Gauge,
  Home,
  LayoutDashboard,
  LogOut,
  Network,
  RefreshCw,
  Server,
  ShieldCheck,
  Signal,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ThemedAurora from "@/components/visuals/ThemedAurora";
import { cn } from "@/lib/utils";

const subscriptionClients = [
  { name: "Clash Verge", format: "clash", hint: "Desktop rule sets" },
  { name: "Sing Box", format: "sing-box", hint: "Modern core profile" },
  { name: "Shadowrocket", format: "shadowrocket", hint: "Mobile subscription" },
] as const;

const regions = [
  { title: "Hong Kong", flag: "HK", label: "HongKong" },
  { title: "Japan", flag: "JP", label: "Japan" },
  { title: "United States", flag: "US", label: "United States" },
] as const;

const stats = [
  { label: "Plan", value: "Starter", icon: ShieldCheck },
  { label: "Latency", value: "38ms", icon: Signal },
  { label: "Regions", value: "3", icon: Network },
] as const;

type Section = "console" | "nodes";

type NodeItem = {
  id: string;
  name: string;
  value: number;
  refreshing: boolean;
};

type Session = {
  token: string;
  name: string;
  email: string;
  uuid: string;
};

function randomValue() {
  return Math.floor(Math.random() * 60) + 40;
}

function createNodes() {
  return regions.flatMap((region) =>
    Array.from({ length: 6 }, (_, index) => ({
      id: `${region.label}-${index + 1}`,
      name: `${region.flag}-${String(index + 1).padStart(2, "0")}`,
      value: randomValue(),
      refreshing: false,
    })),
  );
}

function readSession(): Session {
  return {
    token: localStorage.getItem("awsing.token") ?? "",
    name: localStorage.getItem("awsing.name") ?? "User",
    email: localStorage.getItem("awsing.email") ?? "",
    uuid: localStorage.getItem("awsing.uuid") ?? "",
  };
}

export function DashboardShell() {
  const [section, setSection] = useState<Section>("console");
  const [session, setSession] = useState<Session>({
    token: "",
    name: "User",
    email: "",
    uuid: "",
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [nodes, setNodes] = useState<NodeItem[]>(() => createNodes());

  useEffect(() => {
    setSession(readSession());
  }, []);

  const subscriptionLinks = useMemo(
    () =>
      subscriptionClients.map((client) => ({
        ...client,
        url: `https://proxy.er-meng.com/subscription/${client.format}?token=${encodeURIComponent(session.token)}`,
      })),
    [session.token],
  );

  async function copySubscription(format: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(format);
    window.setTimeout(() => setCopied(null), 1600);
  }

  function refreshNodes() {
    setNodes((items) => items.map((item) => ({ ...item, refreshing: true })));

    nodes.forEach((node) => {
      const delay = Math.random() * 1500 + 500;
      window.setTimeout(() => {
        setNodes((items) =>
          items.map((item) =>
            item.id === node.id
              ? { ...item, value: randomValue(), refreshing: false }
              : item,
          ),
        );
      }, delay);
    });
  }

  function logOut() {
    localStorage.removeItem("awsing.token");
    localStorage.removeItem("awsing.uuid");
    localStorage.removeItem("awsing.email");
    localStorage.removeItem("awsing.name");
    setSession({ token: "", name: "User", email: "", uuid: "" });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 z-0 [background-image:var(--hero-background)]" />
      <div className="absolute inset-0 z-0 opacity-55">
        <ThemedAurora amplitude={0.85} blend={0.62} speed={0.7} />
      </div>
      <div className="absolute inset-0 z-0 bg-background/52 backdrop-blur-[1px]" />

      <div className="relative z-10 flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border/70 bg-background/58 px-4 py-5 shadow-[18px_0_80px_rgba(0,0,0,0.12)] backdrop-blur-2xl md:block">
          <Link
            className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold outline-none transition-colors hover:text-ctp-sky focus-visible:ring-2 focus-visible:ring-ring"
            href="/"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-foreground text-[12px] text-background">
              A
            </span>
            AWSing
          </Link>

          <nav className="mt-8 space-y-1">
            <SidebarButton
              active={section === "console"}
              icon={LayoutDashboard}
              label="Console"
              onClick={() => setSection("console")}
            />
            <SidebarButton
              active={section === "nodes"}
              icon={Network}
              label="Nodes"
              onClick={() => setSection("nodes")}
            />
          </nav>

          <div className="absolute bottom-5 left-4 right-4 rounded-xl border border-border/70 bg-background/52 p-4 backdrop-blur">
            <p className="font-mono text-[11px] font-medium uppercase text-muted-foreground">
              Signed in as
            </p>
            <p className="mt-2 truncate text-sm font-semibold">
              {session.name}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {session.email || "No email stored"}
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 md:pl-72">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/58 px-5 py-4 backdrop-blur-2xl md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-ctp-sky">
                  Dashboard
                </p>
                <h1 className="mt-1 font-heading text-2xl font-semibold tracking-normal">
                  {section === "console" ? "Console" : "Nodes"}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  aria-label="Home"
                  className="grid size-10 place-items-center rounded-xl border border-border bg-background/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href="/"
                >
                  <Home size={17} />
                </Link>
                {section === "nodes" ? (
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background/60 px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={refreshNodes}
                    type="button"
                  >
                    <RefreshCw size={16} />
                    Refresh
                  </button>
                ) : null}
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-foreground px-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={logOut}
                  type="button"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 md:hidden">
              <SidebarButton
                active={section === "console"}
                icon={LayoutDashboard}
                label="Console"
                onClick={() => setSection("console")}
              />
              <SidebarButton
                active={section === "nodes"}
                icon={Network}
                label="Nodes"
                onClick={() => setSection("nodes")}
              />
            </div>
          </header>

          <div className="px-5 py-6 md:px-8 md:py-8">
            {section === "console" ? (
              <ConsoleSection
                copied={copied}
                links={subscriptionLinks}
                onCopy={copySubscription}
                session={session}
              />
            ) : (
              <NodesSection nodes={nodes} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SidebarButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ConsoleSection({
  copied,
  links,
  onCopy,
  session,
}: {
  copied: string | null;
  links: Array<(typeof subscriptionClients)[number] & { url: string }>;
  onCopy: (format: string, url: string) => Promise<void>;
  session: Session;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {stats.map((item) => (
          <StatusPanel key={item.label} {...item} />
        ))}
      </div>

      {!session.token ? (
        <div className="rounded-xl border border-ctp-peach/40 bg-ctp-peach/10 p-4 text-sm leading-6 text-ctp-peach">
          No token found. Log in or sign up from the home page to generate
          subscription links.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-border/70 bg-background/58 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-semibold tracking-normal">
                Subscription links
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Copy the profile that matches your client. Each link is built
                locally from the account token stored after login.
              </p>
            </div>
            <Server className="mt-1 h-5 w-5 text-ctp-sky" />
          </div>

          <div className="mt-5 grid gap-3">
            {links.map((item) => (
              <div
                className="grid gap-3 rounded-xl border border-border/70 bg-background/52 p-4 md:grid-cols-[1fr_auto] md:items-center"
                key={item.format}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">{item.name}</h3>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {item.hint}
                    </span>
                  </div>
                  <p className="mt-2 truncate font-mono text-xs text-muted-foreground">
                    {item.url}
                  </p>
                </div>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={!session.token}
                  onClick={() => onCopy(item.format, item.url)}
                  type="button"
                >
                  {copied === item.format ? (
                    <Check size={16} />
                  ) : (
                    <Clipboard size={16} />
                  )}
                  {copied === item.format ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border/70 bg-foreground p-5 text-background shadow-[0_24px_90px_rgba(0,0,0,0.22)]">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-background/60">
            Account token
          </p>
          <p className="mt-5 break-all font-mono text-sm leading-6">
            {session.token || "No token found. Please log in again."}
          </p>
          <div className="mt-6 border-t border-background/15 pt-5 text-xs leading-5 text-background/60">
            UUID: {session.uuid || "Unavailable"}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusPanel({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-background/58 p-4 shadow-sm backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 font-mono text-xl font-semibold">{value}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-muted text-ctp-sky">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </section>
  );
}

function NodesSection({ nodes }: { nodes: NodeItem[] }) {
  return (
    <div className="space-y-8">
      {regions.map((region) => {
        const regionNodes = nodes.filter((node) =>
          node.id.startsWith(region.label),
        );

        return (
          <section key={region.label}>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-semibold tracking-normal">
                  {region.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Six available edge nodes for this region.
                </p>
              </div>
              <span className="rounded-full border border-border bg-background/58 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                {regionNodes.length} nodes
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {regionNodes.map((node) => (
                <article
                  className="rounded-xl border border-border/70 bg-background/58 p-5 shadow-sm backdrop-blur-2xl"
                  key={node.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-mono text-sm font-semibold">
                        {node.name}
                      </h3>
                      <p className="mt-3 flex items-center gap-2 text-xs font-medium text-ctp-green">
                        <span className="h-2 w-2 rounded-full bg-ctp-green shadow-[0_0_14px_color-mix(in_oklab,var(--ctp-green)_72%,transparent)]" />
                        Online
                      </p>
                    </div>
                    <span className="flex min-w-12 items-center justify-center rounded-xl bg-muted px-2 py-1 font-mono text-xs font-semibold text-foreground">
                      {node.refreshing ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        node.value
                      )}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
