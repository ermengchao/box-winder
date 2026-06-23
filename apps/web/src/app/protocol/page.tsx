import FlowingMenu from "@/components/FlowingMenu";

const tcpProtocols = [
  "Shadowsocks",
  "VMess",
  "Trojan",
  "Naive",
  "ShadowTLS",
  "VLESS",
  "AnyTLS",
  "Snell",
];

const udpProtocols = ["Hysteria", "TUIC", "Hysteria2", "Snell"];

const protocolImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 160'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2389dceb'/%3E%3Cstop offset='.5' stop-color='%23a6e3a1'/%3E%3Cstop offset='1' stop-color='%23f9e2af'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='420' height='160' rx='80' fill='%2311111b'/%3E%3Cpath d='M40 82c58-62 100 62 158 0s100 62 182 0' fill='none' stroke='url(%23g)' stroke-width='18' stroke-linecap='round'/%3E%3Ccircle cx='78' cy='80' r='20' fill='%23cba6f7'/%3E%3Ccircle cx='210' cy='80' r='20' fill='%2389b4fa'/%3E%3Ccircle cx='342' cy='80' r='20' fill='%23f38ba8'/%3E%3C/svg%3E";

function toMenuItems(protocols: string[]) {
  return protocols.map((protocol) => ({
    link: "#",
    text: protocol,
    image: protocolImage,
  }));
}

export default function ProtocolPage() {
  return (
    <main className="grid h-dvh w-dvw grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-background text-foreground lg:grid-cols-2 lg:grid-rows-none">
      <section className="grid min-h-0 grid-cols-1 gap-4 p-4 md:grid-cols-2">
        <article className="min-h-0 overflow-hidden rounded-lg border border-border bg-card">
          <FlowingMenu
            items={toMenuItems(tcpProtocols)}
            speed={13}
            bgColor="var(--ctp-mantle)"
            textColor="var(--ctp-text)"
            borderColor="color-mix(in oklab, var(--ctp-text) 14%, transparent)"
            marqueeBgColor="var(--ctp-sky)"
            marqueeTextColor="var(--ctp-crust)"
          />
        </article>
        <article className="min-h-0 overflow-hidden rounded-lg border border-border bg-card">
          <FlowingMenu
            items={toMenuItems(udpProtocols)}
            speed={-13}
            bgColor="var(--ctp-crust)"
            textColor="var(--ctp-text)"
            borderColor="color-mix(in oklab, var(--ctp-text) 14%, transparent)"
            marqueeBgColor="var(--ctp-green)"
            marqueeTextColor="var(--ctp-crust)"
          />
        </article>
      </section>

      <section className="flex h-full flex-col justify-center border-t border-border px-[7vw] py-8 lg:border-l lg:border-t-0 lg:py-12">
        <p className="font-mono text-sm uppercase tracking-[0.28em] text-ctp-sky">
          TCP / UDP
        </p>
        <h1 className="mt-5 max-w-[12ch] font-heading text-7xl leading-none text-balance">
          Protocol
        </h1>
        <p className="mt-8 max-w-xl text-xl leading-8 text-muted-foreground">
          A focused split view for proxy protocol families. TCP transports sit
          above, UDP-first options below, with Snell included for quick
          comparison across both lanes.
        </p>
      </section>
    </main>
  );
}
