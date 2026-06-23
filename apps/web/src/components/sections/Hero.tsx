"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  GitFork,
  KeyRound,
  Languages,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Network,
  Sparkles,
  SunMoon,
  User,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navbar, type NavbarItem } from "@/components/layout/Navbar";
import SplitText from "@/components/react-bits/SplitText";
import { CobeEarthHorizon } from "@/components/visuals/CobeEarthHorizon";
import ThemedAurora from "@/components/visuals/ThemedAurora";
import {
  LOGIN_MUTATION,
  REGISTER_MUTATION,
  requestGraphql,
} from "@/lib/graphql";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

type HeroProps = {
  scrollDistance?: number;
  slogan?: string;
  intro?: string;
  navbarLinks?: NavbarItem[];
  navbarActions?: NavbarItem[];
  authMode?: AuthMode | null;
  onAuthIntent?: (mode: AuthMode) => void;
  onAuthClose?: () => void;
  className?: string;
};

const HERO_NAV_LINKS: NavbarItem[] = [
  {
    label: "Features",
    href: "#features",
    icon: <Sparkles size={16} strokeWidth={2} />,
  },
  {
    label: "Price",
    href: "#pricing",
    icon: <BadgeDollarSign size={16} strokeWidth={2} />,
  },
  {
    label: "Protocol",
    href: "/protocol",
    icon: <Network size={16} strokeWidth={2} />,
  },
];

const HERO_NAV_ACTIONS: NavbarItem[] = [
  {
    label: "GitHub",
    href: "https://github.com",
    external: true,
    icon: <GitFork size={17} strokeWidth={2} />,
    iconOnly: true,
  },
  {
    label: "Language",
    href: "#language",
    icon: <Languages size={17} strokeWidth={2} />,
    iconOnly: true,
    separatorBefore: true,
  },
  {
    label: "Theme",
    href: "#theme",
    icon: <SunMoon size={17} strokeWidth={2} />,
    iconOnly: true,
  },
  {
    label: "Log in",
    href: "#login",
    icon: <LogIn size={17} strokeWidth={2} />,
    separatorBefore: true,
  },
  {
    label: "Sign up",
    href: "#sign-up",
    icon: <UserPlus size={17} strokeWidth={2} />,
  },
];

const HERO_ANIMATION_SPEED = 1;

const HERO_METRICS = [
  { label: "Active users", value: "2.4M" },
  { label: "Median latency", value: "38ms" },
  { label: "Regions online", value: "18" },
  { label: "Requests routed", value: "8.7B" },
  { label: "Continuous runtime", value: "742d" },
  { label: "Uptime target", value: "99.99%" },
];

gsap.registerPlugin(useGSAP);

type LoginData = {
  login: {
    accessToken: string;
    user: {
      uuid: string;
      name: string;
      email: string;
      tokenPrefix: string;
    };
  };
};

type RegisterData = {
  register: {
    accessToken: string;
    user: {
      uuid: string;
      name: string;
      email: string;
      tokenPrefix: string;
    };
  };
};

function AuthPanel({
  mode,
  onClose,
  onModeChange,
}: {
  mode: AuthMode | null;
  onClose?: () => void;
  onModeChange?: (mode: AuthMode) => void;
}) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      if (isSignup) {
        const data = await requestGraphql<
          RegisterData,
          {
            input: {
              name: string;
              email: string;
              password: string;
              inviteCode: string;
            };
          }
        >(REGISTER_MUTATION, {
          input: {
            name: name.trim(),
            email: email.trim(),
            password,
            inviteCode: inviteCode.trim(),
          },
        });

        localStorage.setItem("awsing.token", data.register.accessToken);
        localStorage.setItem("awsing.uuid", data.register.user.uuid);
        localStorage.setItem("awsing.email", data.register.user.email);
        localStorage.setItem("awsing.name", data.register.user.name);
        setSuccess("Account created. Your token has been saved locally.");
        router.push("/dashboard");
        return;
      }

      const data = await requestGraphql<
        LoginData,
        {
          input: {
            email: string;
            password: string;
          };
        }
      >(LOGIN_MUTATION, {
        input: {
          email: email.trim(),
          password,
        },
      });

      localStorage.setItem("awsing.token", data.login.accessToken);
      localStorage.setItem("awsing.uuid", data.login.user.uuid);
      localStorage.setItem("awsing.email", data.login.user.email);
      localStorage.setItem("awsing.name", data.login.user.name);
      setSuccess(
        `Welcome back, ${data.login.user.name}. Your token has been saved.`,
      );
      router.push("/dashboard");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : isSignup
            ? "Registration failed. Please try again."
            : "Login failed. Please check your email and password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <aside
      aria-hidden={!mode}
      className={cn(
        "pointer-events-none fixed inset-y-0 right-0 z-50 flex w-full items-center justify-end px-5 py-24 opacity-0 md:px-10 lg:w-[48vw] lg:px-16",
        !mode && "pointer-events-none",
      )}
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-border/80 bg-background/92 p-5 text-foreground shadow-[0_32px_120px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div data-auth-item>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.28em] text-ctp-sky">
              {isSignup ? "Create account" : "Welcome back"}
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              {isSignup ? "Sign up for AWSing" : "Log in to AWSing"}
            </h2>
          </div>
          <button
            aria-label="Close auth panel"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          {isSignup ? (
            <label className="block" data-auth-item>
              <span className="mb-2 block text-sm font-medium text-muted-foreground">
                Name
              </span>
              <span className="flex h-12 items-center gap-3 rounded-xl border border-border bg-background/70 px-4 transition-colors focus-within:border-ctp-sky">
                <User
                  aria-hidden="true"
                  className="text-muted-foreground"
                  size={17}
                />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  autoComplete="name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Chao"
                  required
                  type="text"
                  value={name}
                />
              </span>
            </label>
          ) : null}

          <label className="block" data-auth-item>
            <span className="mb-2 block text-sm font-medium text-muted-foreground">
              Email
            </span>
            <span className="flex h-12 items-center gap-3 rounded-xl border border-border bg-background/70 px-4 transition-colors focus-within:border-ctp-sky">
              <Mail
                aria-hidden="true"
                className="text-muted-foreground"
                size={17}
              />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </span>
          </label>

          <label className="block" data-auth-item>
            <span className="mb-2 block text-sm font-medium text-muted-foreground">
              Password
            </span>
            <span className="flex h-12 items-center gap-3 rounded-xl border border-border bg-background/70 px-4 transition-colors focus-within:border-ctp-sky">
              <Lock
                aria-hidden="true"
                className="text-muted-foreground"
                size={17}
              />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                autoComplete={isSignup ? "new-password" : "current-password"}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                required
                type="password"
                value={password}
              />
            </span>
          </label>

          {isSignup ? (
            <label className="block" data-auth-item>
              <span className="mb-2 block text-sm font-medium text-muted-foreground">
                Invite code
              </span>
              <span className="flex h-12 items-center gap-3 rounded-xl border border-border bg-background/70 px-4 transition-colors focus-within:border-ctp-sky">
                <KeyRound
                  aria-hidden="true"
                  className="text-muted-foreground"
                  size={17}
                />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  autoComplete="off"
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder="aB3dE5gH"
                  required
                  type="text"
                  value={inviteCode}
                />
              </span>
            </label>
          ) : null}

          {error ? (
            <p
              className="rounded-xl border border-ctp-red/40 bg-ctp-red/10 px-4 py-3 text-sm leading-5 text-ctp-red"
              data-auth-item
            >
              {error}
            </p>
          ) : null}

          {success ? (
            <div
              className="flex items-start gap-3 rounded-xl border border-ctp-green/40 bg-ctp-green/10 px-4 py-3 text-sm leading-5 text-ctp-green"
              data-auth-item
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{success}</p>
            </div>
          ) : null}

          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
            data-auth-item
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={17} />
            ) : null}
            {isSignup ? "Sign up" : "Log in"}
            {!isSubmitting ? <ArrowRight aria-hidden="true" size={17} /> : null}
          </button>
        </form>

        <p
          className="mt-6 text-center text-sm text-muted-foreground"
          data-auth-item
        >
          {isSignup ? "Already have an account?" : "New to AWSing?"}{" "}
          <button
            className="font-semibold text-foreground underline-offset-4 transition-colors hover:text-ctp-sky hover:underline"
            onClick={() => onModeChange?.(isSignup ? "login" : "signup")}
            type="button"
          >
            {isSignup ? "Log in" : "Sign up"}
          </button>
        </p>
      </div>
    </aside>
  );
}

export function Hero({
  scrollDistance = 72,
  slogan = "Cloud infrastructure, closer to every user.",
  intro = "Deploy resilient workloads across global regions with a calm control plane, predictable pricing, and real-time visibility from edge to core.",
  navbarLinks = HERO_NAV_LINKS,
  navbarActions = HERO_NAV_ACTIONS,
  authMode = null,
  onAuthIntent,
  onAuthClose,
  className,
}: HeroProps) {
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const earthRef = useRef<HTMLElement | null>(null);
  const foregroundRef = useRef<HTMLDivElement | null>(null);
  const authPanelRef = useRef<HTMLDivElement | null>(null);
  const ctaAnimationRef = useRef<gsap.core.Tween | null>(null);
  const ctaAnimationPlayedRef = useRef(false);
  const hasEnteredAuthRef = useRef(false);

  const playCtaAnimation = useCallback(() => {
    if (ctaAnimationPlayedRef.current) {
      return;
    }

    ctaAnimationPlayedRef.current = true;
    ctaAnimationRef.current?.play();
  }, []);

  const handleAuthIntent = useCallback(
    (mode: "login" | "signup") => {
      onAuthIntent?.(mode);
    },
    [onAuthIntent],
  );

  const resolvedNavbarActions = useMemo(() => {
    if (!onAuthIntent) {
      return navbarActions;
    }

    return navbarActions.map((item) => {
      if (item.href === "#login") {
        return {
          ...item,
          onSelect: (event) => {
            event.preventDefault();
            handleAuthIntent("login");
            item.onSelect?.(event);
          },
        } satisfies NavbarItem;
      }

      if (item.href === "#sign-up") {
        return {
          ...item,
          onSelect: (event) => {
            event.preventDefault();
            handleAuthIntent("signup");
            item.onSelect?.(event);
          },
        } satisfies NavbarItem;
      }

      return item;
    });
  }, [handleAuthIntent, navbarActions, onAuthIntent]);

  useEffect(() => {
    if (!authMode) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onAuthClose?.();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [authMode, onAuthClose]);

  useGSAP(
    () => {
      const element = ctaRef.current;

      if (!element) {
        return;
      }

      ctaAnimationRef.current = gsap.fromTo(
        element.children,
        { opacity: 0, scale: 1, y: 100 },
        {
          delay: 0,
          duration: 0.8,
          ease: "power3.out",
          opacity: 1,
          scale: 1,
          paused: true,
          stagger: 0.12,
          y: 0,
        },
      );

      window.addEventListener("scroll", playCtaAnimation, { passive: true });
      window.addEventListener("wheel", playCtaAnimation, { passive: true });
      window.addEventListener("touchmove", playCtaAnimation, { passive: true });

      return () => {
        window.removeEventListener("scroll", playCtaAnimation);
        window.removeEventListener("wheel", playCtaAnimation);
        window.removeEventListener("touchmove", playCtaAnimation);
      };
    },
    { dependencies: [playCtaAnimation], scope: ctaRef },
  );

  useGSAP(
    () => {
      const earth = earthRef.current;
      const foreground = foregroundRef.current;
      const authPanel = authPanelRef.current?.firstElementChild;

      if (!earth || !foreground || !authPanel) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const authItems = authPanel.querySelectorAll("[data-auth-item]");
      gsap.killTweensOf([foreground, earth, authPanel, ...authItems]);

      if (!authMode && !hasEnteredAuthRef.current) {
        gsap.set(foreground, { clearProps: "opacity,transform,visibility" });
        gsap.set(earth, { clearProps: "transform" });
        gsap.set(authPanel, { autoAlpha: 0, xPercent: 24 });
        gsap.set(authItems, { autoAlpha: 0, y: 10 });
        return;
      }

      if (reduceMotion) {
        gsap.set(foreground, {
          autoAlpha: authMode ? 0.32 : 1,
          xPercent: authMode ? 24 : 0,
          ...(authMode ? {} : { clearProps: "opacity,transform,visibility" }),
        });
        gsap.set(earth, {
          xPercent: authMode ? -100 : 0,
          ...(authMode ? {} : { clearProps: "transform" }),
        });
        gsap.set(authPanel, {
          autoAlpha: authMode ? 1 : 0,
          xPercent: authMode ? 0 : 24,
        });
        gsap.set(authItems, { autoAlpha: authMode ? 1 : 0, y: 0 });
        return;
      }

      const timeline = gsap.timeline({
        defaults: { duration: 1.05, ease: "power3.inOut" },
      });

      if (authMode) {
        hasEnteredAuthRef.current = true;
        timeline
          .to(foreground, { autoAlpha: 0.32, xPercent: 24 }, 0)
          .to(earth, { xPercent: -100 }, 0)
          .fromTo(
            authPanel,
            { autoAlpha: 0, xPercent: 24 },
            { autoAlpha: 1, xPercent: 0 },
            0.15,
          )
          .fromTo(
            authItems,
            { autoAlpha: 0, y: 18 },
            {
              autoAlpha: 1,
              duration: 0.54,
              ease: "power3.out",
              stagger: 0.05,
              y: 0,
            },
            0.34,
          );
        return;
      }

      timeline
        .to(authItems, {
          autoAlpha: 0,
          duration: 0.28,
          ease: "power2.out",
          stagger: 0.02,
          y: 10,
        })
        .to(authPanel, { autoAlpha: 0, duration: 0.55, xPercent: 24 }, 0)
        .to(foreground, { autoAlpha: 1, xPercent: 0 }, 0)
        .to(earth, { xPercent: 0 }, 0)
        .set(foreground, { clearProps: "opacity,transform,visibility" })
        .set(earth, { clearProps: "transform" }, "<");
    },
    { dependencies: [authMode, onAuthClose], scope: foregroundRef },
  );

  return (
    <section
      className={cn(
        "relative min-h-[200vh] overflow-hidden bg-background text-foreground",
        className,
      )}
    >
      <Navbar
        actions={resolvedNavbarActions}
        brand="AWSing"
        brandOnClick={onAuthClose}
        links={navbarLinks}
        scrollDistance={scrollDistance}
      />

      <div className="absolute inset-0 z-0 [background-image:var(--hero-background)]" />
      <div className="absolute inset-0 z-0 opacity-70">
        <ThemedAurora amplitude={1} blend={0.5} speed={HERO_ANIMATION_SPEED} />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-20 h-full w-screen overflow-hidden"
      >
        <CobeEarthHorizon
          className="absolute left-[50vw] top-[25vh] bg-transparent mix-blend-screen opacity-90 [filter:contrast(1.08)_saturate(1.12)] portrait:left-[25vw] portrait:top-[50vh]"
          canvasClassName="[-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_32px),linear-gradient(to_top,transparent_0,black_32px),linear-gradient(to_right,transparent_0,black_32px),linear-gradient(to_left,transparent_0,black_32px)] [-webkit-mask-composite:source-in,source-in,source-in] [mask-composite:intersect] [mask-image:linear-gradient(to_bottom,transparent_0,black_32px),linear-gradient(to_top,transparent_0,black_32px),linear-gradient(to_right,transparent_0,black_32px),linear-gradient(to_left,transparent_0,black_32px)]"
          ref={earthRef}
          rotationSpeed={HERO_ANIMATION_SPEED}
        />
      </div>

      <div
        className="relative z-10 mx-auto min-h-[200vh] w-full max-w-7xl px-6 lg:px-8"
        ref={foregroundRef}
      >
        <div className="flex min-h-screen max-w-2xl flex-col items-start justify-center pb-16 pt-32 md:pr-12 md:pt-24">
          <p className="mb-5 rounded-full border border-border bg-background/70 px-3 py-1.5 font-mono text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            Global cloud fabric
          </p>
          <SplitText
            className="max-w-3xl text-balance text-5xl font-semibold leading-[1.02] text-foreground sm:text-6xl lg:text-7xl"
            delay={50}
            duration={0.5}
            ease="power3.out"
            from={{ opacity: 0, y: 40 }}
            rootMargin="-100px"
            splitType="chars"
            tag="h1"
            text={slogan}
            textAlign="left"
            threshold={0.1}
            to={{ opacity: 1, y: 0 }}
            onLetterAnimationComplete={playCtaAnimation}
          />
          <p className="mt-6 max-w-xl text-pretty text-base leading-8 text-muted-foreground sm:text-lg">
            {intro}
          </p>
          <div
            className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
            ref={ctaRef}
          >
            <Link
              className="inline-flex h-12 items-center justify-center rounded-xl bg-foreground px-6 text-sm font-semibold text-background shadow-[0_16px_50px_rgba(15,23,42,0.18)] transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="#login"
              onClick={(event) => {
                if (!onAuthIntent) {
                  return;
                }

                event.preventDefault();
                handleAuthIntent("login");
              }}
            >
              Log in
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-background/70 px-6 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="#sign-up"
              onClick={(event) => {
                if (!onAuthIntent) {
                  return;
                }

                event.preventDefault();
                handleAuthIntent("signup");
              }}
            >
              Sign up
            </Link>
          </div>
        </div>

        <div className="absolute bottom-[clamp(6rem,14vh,12rem)] left-6 w-[calc(100%-3rem)] max-w-xl space-y-5 lg:left-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border/80 bg-background/55 px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground shadow-sm backdrop-blur">
            <span className="flex items-center gap-2 text-ctp-sky">
              <span className="size-1.5 rounded-full bg-ctp-sky shadow-[0_0_14px_color-mix(in_oklab,var(--ctp-sky)_72%,transparent)]" />
              Global edge active
            </span>
            <span
              aria-hidden="true"
              className="hidden h-3 w-px bg-border sm:block"
            />
            <span>Routing users by latency and health</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {HERO_METRICS.map((metric) => (
              <div
                className="rounded-xl border border-border/70 bg-background/45 px-3 py-3 shadow-sm backdrop-blur"
                key={metric.label}
              >
                <p className="font-mono text-lg font-semibold leading-none text-foreground sm:text-xl">
                  {metric.value}
                </p>
                <p className="mt-2 text-[11px] font-medium leading-tight text-muted-foreground">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute right-6 top-0 hidden h-screen w-1/2 overflow-visible md:block lg:right-8">
          <div className="absolute bottom-12 left-1/2 z-10 h-px w-[72%] -translate-x-1/2 bg-gradient-to-r from-transparent via-ctp-mauve/50 to-transparent md:bottom-24" />
        </div>
      </div>

      <div ref={authPanelRef}>
        <AuthPanel
          key={authMode ?? "closed"}
          mode={authMode}
          onClose={onAuthClose}
          onModeChange={onAuthIntent}
        />
      </div>
    </section>
  );
}

export default Hero;
