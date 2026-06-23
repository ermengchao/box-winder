"use client";

import SpotlightCard from "@/components/react-bits/SpotlightCard";

const PRICING_PLANS = [
  {
    name: "Starter",
    price: "2.99$",
    description: "For small launches and early experiments.",
    features: ["Single region", "Basic metrics", "Community support"],
    spotlightColor: "rgba(137, 220, 235, 0.28)",
  },
  {
    name: "Growth",
    price: "4.99$",
    description: "For teams shipping production workloads.",
    features: [
      "Multi-region routing",
      "Live observability",
      "Priority support",
    ],
    spotlightColor: "rgba(203, 166, 247, 0.32)",
  },
  {
    name: "Scale",
    price: "9.99$",
    description: "For resilient systems with global traffic.",
    features: ["Global failover", "Advanced controls", "Dedicated support"],
    spotlightColor: "rgba(166, 227, 161, 0.28)",
  },
] as const;

export function Price() {
  return (
    <section
      id="pricing"
      className="relative isolate z-10 flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-transparent px-6 py-16 text-foreground lg:px-8"
    >
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.28em] text-ctp-sky">
          Pricing
        </p>
        <h2 className="mt-4 max-w-3xl text-center font-heading text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
          Choose the right cloud lane
        </h2>

        <div className="mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-3 lg:gap-6">
          {PRICING_PLANS.map((plan) => (
            <SpotlightCard
              className="flex min-h-[480px] flex-col justify-between border-border/70 bg-card/80 text-card-foreground shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur"
              key={plan.name}
              spotlightColor={plan.spotlightColor}
            >
              <div className="relative z-10">
                <h3 className="text-xl font-semibold text-foreground">
                  {plan.name}
                </h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {plan.description}
                </p>
                <p className="mt-8 font-heading text-5xl font-semibold tracking-normal text-foreground">
                  {plan.price}
                </p>
              </div>

              <ul className="relative z-10 mt-10 space-y-3 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li className="flex items-center gap-3" key={feature}>
                    <span className="h-1.5 w-1.5 rounded-full bg-ctp-sky" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Price;
