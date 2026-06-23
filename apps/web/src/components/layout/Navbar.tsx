"use client";

import {
  BadgeDollarSign,
  LogIn,
  Menu,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export type NavbarItem = {
  label: string;
  href: string;
  match?: string;
  external?: boolean;
  icon: ReactNode;
  iconOnly?: boolean;
  onSelect?: MouseEventHandler<HTMLAnchorElement>;
  separatorBefore?: boolean;
};

export type NavbarProps = {
  scrollDistance?: number;
  brand?: ReactNode;
  brandHref?: string;
  brandOnClick?: MouseEventHandler<HTMLAnchorElement>;
  links?: NavbarItem[];
  actions?: NavbarItem[];
  mobilePinnedLabels?: string[];
  className?: string;
  innerClassName?: string;
};

const DEFAULT_LINKS: NavbarItem[] = [
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
];

const DEFAULT_ACTIONS: NavbarItem[] = [
  {
    label: "Log in",
    href: "#login",
    icon: <LogIn size={16} strokeWidth={2} />,
  },
  {
    label: "Sign up",
    href: "#sign-up",
    icon: <UserPlus size={16} strokeWidth={2} />,
  },
];

const THEME_TOGGLE_HREF = "#theme";
const THEME_CHANGE_EVENT = "awsing-theme-change";

function NavbarAnchor({
  item,
  className,
  active,
  pressed,
  showIcon,
  showLabel,
  onClick,
  onMouseEnter,
}: {
  item: NavbarItem;
  className?: string;
  active?: boolean;
  pressed?: boolean;
  showIcon?: boolean;
  showLabel?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  onMouseEnter?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const isButtonLike = item.href === THEME_TOGGLE_HREF;
  const contents = (
    <>
      {showIcon ? (
        <span aria-hidden="true" className="shrink-0">
          {item.icon}
        </span>
      ) : null}
      <span className={item.iconOnly && !showLabel ? "sr-only" : undefined}>
        {item.label}
      </span>
    </>
  );

  if (item.external) {
    return (
      <a
        aria-label={item.iconOnly && !showLabel ? item.label : undefined}
        className={className}
        data-navbar-active={active ? "true" : undefined}
        href={item.href}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        rel="noreferrer"
        target="_blank"
      >
        {contents}
      </a>
    );
  }

  return (
    <Link
      aria-label={item.iconOnly && !showLabel ? item.label : undefined}
      aria-pressed={isButtonLike ? pressed : undefined}
      className={className}
      data-navbar-active={active ? "true" : undefined}
      href={item.href}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      role={isButtonLike && onClick ? "button" : undefined}
    >
      {contents}
    </Link>
  );
}

export function Navbar({
  scrollDistance = 50,
  brand = "AWSing",
  brandHref = "/",
  brandOnClick,
  links = DEFAULT_LINKS,
  actions = DEFAULT_ACTIONS,
  mobilePinnedLabels = ["Feature", "Features", "Price"],
  className,
  innerClassName,
}: NavbarProps) {
  const pathname = usePathname();
  const menuId = useId();
  const [isCompact, setIsCompact] = useState(false);
  const [hasGlass, setHasGlass] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const navRef = useRef<HTMLElement | null>(null);
  const highlightRef = useRef<HTMLSpanElement | null>(null);
  const compactRef = useRef(false);
  const glassRef = useRef(false);
  const glassTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = root.classList.contains("light") ? "light" : "dark";

    root.classList.toggle("light", currentTheme === "light");
    root.classList.toggle("dark", currentTheme === "dark");
    setTheme(currentTheme);
  }, []);

  useEffect(() => {
    const updateGlassState = () => {
      const shouldCompact = window.scrollY > scrollDistance;

      if (shouldCompact === compactRef.current) {
        return;
      }

      compactRef.current = shouldCompact;
      setIsCompact(shouldCompact);

      if (glassTimerRef.current !== null) {
        window.clearTimeout(glassTimerRef.current);
        glassTimerRef.current = null;
      }

      if (!shouldCompact) {
        glassRef.current = false;
        setHasGlass(false);
        return;
      }

      glassTimerRef.current = window.setTimeout(() => {
        glassRef.current = true;
        setHasGlass(true);
        glassTimerRef.current = null;
      }, 420);
    };

    updateGlassState();
    window.addEventListener("scroll", updateGlassState, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateGlassState);

      if (glassTimerRef.current !== null) {
        window.clearTimeout(glassTimerRef.current);
      }
    };
  }, [scrollDistance]);

  useEffect(() => {
    if (!menuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (pathname) {
      setMenuOpen(false);
    }
  }, [pathname]);

  const isActive = useCallback(
    (item: NavbarItem) => {
      if (item.href.startsWith("#")) return false;
      const match = item.match ?? item.href;
      return pathname === match || pathname.startsWith(`${match}/`);
    },
    [pathname],
  );

  const positionHighlight = useCallback((element: HTMLElement | null) => {
    const nav = navRef.current;
    const highlight = highlightRef.current;
    if (!nav || !highlight || !element) return;

    const navRect = nav.getBoundingClientRect();
    const itemRect = element.getBoundingClientRect();
    highlight.style.opacity = "1";
    highlight.style.width = `${itemRect.width}px`;
    highlight.style.height = `${itemRect.height}px`;
    highlight.style.transform = `translateX(${itemRect.left - navRect.left}px)`;
  }, []);

  const restoreActiveHighlight = useCallback(() => {
    const activeItem = navRef.current?.querySelector<HTMLElement>(
      "[data-navbar-active='true']",
    );

    if (activeItem) {
      positionHighlight(activeItem);
      return;
    }

    if (highlightRef.current) {
      highlightRef.current.style.opacity = "0";
    }
  }, [positionHighlight]);

  useEffect(() => {
    window.requestAnimationFrame(restoreActiveHighlight);
  }, [restoreActiveHighlight]);

  const handleItemClick = useCallback(
    (item: NavbarItem) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (item.href !== THEME_TOGGLE_HREF) {
        item.onSelect?.(event);
        setMenuOpen(false);
        return;
      }

      event.preventDefault();

      setTheme((currentTheme) => {
        const nextTheme = currentTheme === "light" ? "dark" : "light";
        const root = document.documentElement;

        root.classList.toggle("light", nextTheme === "light");
        root.classList.toggle("dark", nextTheme === "dark");
        queueMicrotask(() => {
          window.dispatchEvent(
            new CustomEvent(THEME_CHANGE_EVENT, {
              detail: { theme: nextTheme },
            }),
          );
        });

        return nextTheme;
      });
      setMenuOpen(false);
    },
    [],
  );

  const mobilePinnedLabelSet = new Set(
    mobilePinnedLabels.map((label) => label.toLowerCase()),
  );
  const allItems = [...links, ...actions];
  const mobilePinnedItems = allItems.filter((item) =>
    mobilePinnedLabelSet.has(item.label.toLowerCase()),
  );
  const mobileMenuItems = allItems.filter(
    (item) => !mobilePinnedLabelSet.has(item.label.toLowerCase()),
  );

  return (
    <header
      className={cn(
        "pointer-events-none fixed left-0 right-0 top-5 z-50 flex justify-center px-4 font-mono transition-[top] duration-500 sm:px-6",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto relative flex h-14 w-full max-w-[1680px] items-center justify-between rounded-2xl border border-transparent px-3 transition-[background,border-color,box-shadow,max-width] duration-500 ease-out sm:px-5 md:px-8",
          isCompact && "max-w-7xl md:px-5",
          hasGlass &&
            "border-white/15 bg-background/70 shadow-[0_18px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/55",
          innerClassName,
        )}
      >
        <div className="flex min-w-0 items-center gap-4">
          <Link
            className="flex shrink-0 items-center gap-2 rounded-xl px-2 py-1 font-mono text-sm font-semibold text-foreground outline-none transition-colors hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring"
            href={brandHref}
            onClick={brandOnClick}
          >
            <span className="grid size-7 place-items-center rounded-lg bg-foreground text-[11px] text-background">
              A
            </span>
            <span className="truncate">{brand}</span>
          </Link>

          <span className="hidden h-5 w-px bg-border md:block" />

          <nav
            ref={navRef}
            className="relative hidden items-center gap-1 md:flex"
            onMouseLeave={restoreActiveHighlight}
          >
            <span
              ref={highlightRef}
              className="pointer-events-none absolute left-0 top-0 rounded-xl border border-border/70 bg-muted/70 opacity-0 shadow-sm transition-[opacity,transform,width,height] duration-300"
            />
            {links.map((item) => (
              <NavbarAnchor
                key={`${item.href}-${item.label}`}
                active={isActive(item)}
                className={cn(
                  "relative z-10 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                  "inline-flex items-center gap-2",
                  isActive(item) && "text-foreground",
                )}
                item={item}
                onClick={handleItemClick(item)}
                onMouseEnter={(event) => positionHighlight(event.currentTarget)}
                showIcon={false}
              />
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {actions.map((item, index) => (
            <div
              className="flex items-center gap-2"
              key={`${item.href}-${item.label}`}
            >
              {item.separatorBefore ? (
                <span className="h-5 w-px bg-border" />
              ) : null}
              <NavbarAnchor
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-xl border border-border bg-background/60 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                  "gap-2",
                  item.iconOnly ? "w-9 px-0" : "px-4",
                  index === actions.length - 1 &&
                    "border-foreground bg-foreground text-background hover:bg-foreground/90",
                )}
                item={item}
                onClick={handleItemClick(item)}
                pressed={item.href === THEME_TOGGLE_HREF && theme === "light"}
                showIcon={item.iconOnly}
              />
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5 md:hidden">
          {mobilePinnedItems.map((item) => (
            <NavbarAnchor
              key={`${item.href}-${item.label}-mobile-pinned`}
              active={isActive(item)}
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                "gap-1.5",
                item.label.toLowerCase() === "price" &&
                  "border border-border bg-background/70 text-foreground",
                isActive(item) && "bg-muted text-foreground",
              )}
              item={item}
              onClick={handleItemClick(item)}
              pressed={item.href === THEME_TOGGLE_HREF && theme === "light"}
              showIcon={false}
              showLabel
            />
          ))}
        </div>

        <button
          aria-controls={menuId}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="grid size-10 place-items-center rounded-xl border border-border bg-background/70 text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {menuOpen && (
          <div
            className="absolute left-3 right-3 top-[calc(100%+0.5rem)] rounded-2xl border border-border bg-background/90 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.2)] backdrop-blur-2xl md:hidden"
            id={menuId}
          >
            <div className="flex flex-col gap-1">
              {mobileMenuItems.map((item) => (
                <NavbarAnchor
                  key={`${item.href}-${item.label}`}
                  active={isActive(item)}
                  className={cn(
                    "flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                    isActive(item) && "bg-muted text-foreground",
                  )}
                  item={item}
                  onClick={handleItemClick(item)}
                  pressed={item.href === THEME_TOGGLE_HREF && theme === "light"}
                  showIcon
                  showLabel
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
