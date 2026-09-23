"use client";

// 📖 Design source: Figma 1276:566 (node 1312:276) and 2149:5 (node 2149:11)

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Inview } from "@/components/animation/springs/in-view";
import { UnderlineLink } from "@/components/ui/underline-link";
import { useLoop } from "@/hooks/animation/use-render-loop";
import { useScroll } from "@/hooks/smooth-scroll/use-scroll";
import { usePageReady } from "@/hooks/use-page-ready";

import { HEADER_THEME_ATTRIBUTE, type HeaderTheme } from "./header-theme";
import { PulseDot } from "./pulse-dot";

/** Vertical centre of the header row (24px top + half of the 22px row). */
const PROBE_OFFSET = 35;
/** Eyebrow over the folded-out panel, in the same voice as every section's. */
const PANEL_EYEBROW = "NAVIGATION";
/** Kept out of JSX children — a bare `//` there reads as a comment. */
const PANEL_SLASH = "//";
/** ms between theme probes — the row only changes at section boundaries. */
const PROBE_FRAMERATE = 100;

/**
 * The bar slides down as one, then the type prints across it left to right —
 * the same clip the wordmark and the hero's script accent use, so the whole row
 * arrives in one gesture instead of the labels simply being there.
 *
 * It is one clip over the whole nav rather than one per label, and deliberately
 * so: a per-label stagger under ~900ms collapses into lockstep here, because the
 * bar re-renders once shortly after mount and every spring whose delay has
 * already elapsed by then starts together. One sweep across the row is both
 * immune to that and a better read — a print head crossing the bar.
 */
const PrintIn = ({
  delayIn,
  enabled,
  children,
}: {
  delayIn: number;
  enabled: boolean;
  children: ReactNode;
}) => (
  <Inview
    tag="span"
    mode="once"
    enabled={enabled}
    from={{ clipPath: "inset(0 100% 0 0)" }}
    to={{ clipPath: "inset(0 0 0 0)" }}
    config={{ tension: 46, friction: 26 }}
    delayIn={delayIn}
    className="block"
  >
    {children}
  </Inview>
);

export interface HeaderLink {
  label: string;
  href: string;
}

export interface SiteHeaderProps {
  links: HeaderLink[];
  order: HeaderLink;
  /** Alpha mask of the wordmark; painted with the active theme's foreground. */
  logoMask: string;
  brand: string;
}

/**
 * The site header — one fixed row for the whole page.
 *
 * Both boards draw the same bar, so it is not part of any section. It recolours
 * itself from whichever `[data-header-theme]` section its centre line is over,
 * measured on the shared ticker rather than with an IntersectionObserver: the
 * observer would need a zero-height root band, which `rootMargin` cannot express
 * without knowing the viewport height up front.
 *
 * Below the tablet grid the four nav links do not fit beside the wordmark and
 * the order link, so they move into a panel behind a toggle. The order link
 * stays on the bar at every width — it is the page's one standing action, and
 * burying the thing people came to do behind a second tap is the wrong trade.
 */
export const SiteHeader = ({
  links,
  order,
  logoMask,
  brand,
}: SiteHeaderProps) => {
  const ready = usePageReady((state) => state.ready);
  const [theme, setTheme] = useState<HeaderTheme>("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const [overFooter, setOverFooter] = useState(false);
  const footerSeen = useRef(false);
  const current = useRef<HeaderTheme>("dark");
  const toggleRef = useRef<HTMLButtonElement>(null);
  const startScroll = useScroll((state) => state.start);
  const stopScroll = useScroll((state) => state.stop);

  useLoop(
    () => {
      const sections = document.querySelectorAll<HTMLElement>(
        `[${HEADER_THEME_ATTRIBUTE}]`,
      );

      const footer = document.querySelector("footer");
      const onFooter = footer
        ? footer.getBoundingClientRect().top <= PROBE_OFFSET
        : false;
      if (onFooter !== footerSeen.current) {
        footerSeen.current = onFooter;
        setOverFooter(onFooter);
      }

      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top > PROBE_OFFSET || rect.bottom <= PROBE_OFFSET) continue;

        const next = section.dataset.headerTheme as HeaderTheme;
        if (next && next !== current.current) {
          current.current = next;
          setTheme(next);
        }
        return;
      }
    },
    { framerate: PROBE_FRAMERATE },
  );

  /* Visibility, not opacity: the bar's entrance spring writes opacity inline
     and an inline value beats any class. */
  // The panel covers the page, so the page underneath must not move behind it.
  useEffect(() => {
    if (menuOpen) stopScroll();
    else startScroll();
  }, [menuOpen, startScroll, stopScroll]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const tone =
    theme === "light" ? "text-foreground-inverse" : "text-foreground";
  const mark = theme === "light" ? "bg-foreground-inverse" : "bg-foreground";

  return (
    <>
      <Inview
        tag="header"
        mode="once"
        enabled={ready}
        from={{ opacity: 0, y: -12 }}
        to={{ opacity: 1, y: 0 }}
        config={{ tension: 90, friction: 26 }}
        delayIn={120}
        className={`fixed inset-x-5 top-4 z-50 flex h-(--size-logo-height) items-center justify-between font-mono text-fine leading-copy tracking-tight transition-colors duration-[var(--duration-normal)] ease-entrance sm:inset-x-10 sm:top-6 sm:max-lg:text-base lg:text-base ${menuOpen ? "text-foreground" : tone} ${overFooter && !menuOpen ? "max-sm:pointer-events-none max-sm:invisible" : ""}`}
      >
        {/* Two lines that become a cross — no icon font, no asset. */}
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((was) => !was)}
          className="relative -m-2 flex size-9 items-center justify-center p-2 max-lg:order-last sm:max-lg:size-11 lg:hidden"
        >
          <span
            aria-hidden="true"
            className={`absolute right-2 h-px bg-current sm:max-lg:h-0.5 transition-all duration-[var(--duration-normal)] ease-entrance ${menuOpen ? "w-6 rotate-45 sm:max-lg:w-8" : "w-6 -translate-y-1 sm:max-lg:w-8 sm:max-lg:-translate-y-1.5"}`}
          />
          <span
            aria-hidden="true"
            className={`absolute right-2 h-px bg-current sm:max-lg:h-0.5 transition-all duration-[var(--duration-normal)] ease-entrance ${menuOpen ? "w-6 -rotate-45 sm:max-lg:w-8" : "w-4 translate-y-1 sm:max-lg:w-6 sm:max-lg:translate-y-1.5"}`}
          />
        </button>

        <nav aria-label="Primary" className="hidden lg:block">
          <PrintIn delayIn={220} enabled={ready}>
            <ul className="flex items-center gap-6 uppercase lg:gap-12">
              {links.map((link) => (
                <li key={link.label}>
                  <UnderlineLink href={link.href} rule={false}>
                    {link.label}
                  </UnderlineLink>
                </li>
              ))}
            </ul>
          </PrintIn>
        </nav>

        {/* Wordmark — the mask URL is data, hence the inline style. The clip is
            on the wrapper so the mark's own -translate-x-1/2 keeps the transform
            property to itself, and the name prints on rather than fading in. */}
        <Inview
          tag="span"
          mode="once"
          enabled={ready}
          from={{ clipPath: "inset(0 100% 0 0)" }}
          to={{ clipPath: "inset(0 0 0 0)" }}
          config={{ tension: 42, friction: 26 }}
          delayIn={260}
          className="absolute left-1/2 h-full w-(--size-logo-width) -translate-x-1/2 max-sm:static max-sm:order-first max-sm:translate-x-0 sm:w-(--size-logo-width)"
        >
          <Link
            href="/"
            aria-label={brand}
            className={`block size-full transition-colors duration-[var(--duration-normal)] ease-entrance [mask-position:center] [mask-repeat:no-repeat] [mask-size:100%_100%] ${menuOpen ? "bg-foreground" : mark}`}
            style={{ maskImage: `url(${logoMask})` }}
          />
        </Inview>

        <Link
          href={order.href}
          className="flex items-center gap-1.5 whitespace-nowrap transition-opacity duration-[var(--duration-fast)] ease-entrance hover:opacity-60 max-sm:hidden max-lg:order-first"
        >
          <PrintIn delayIn={480} enabled={ready}>
            {order.label}
          </PrintIn>
          {/* Below the 1024 grid the link sits on the left of the bar, so the dot
              leads it rather than trailing off toward the wordmark. */}
          <PulseDot className="size-(--size-dot) shrink-0 rounded-full bg-accent max-lg:order-first sm:max-lg:size-2" />
        </Link>
      </Inview>

      {/* The panel is a sibling of the bar, not a child: the bar is the row the
          links fold out of, and nesting the overlay inside it would put a
          full-screen box inside a 22px-tall flex row. */}
      <div
        id="site-menu"
        hidden={!menuOpen}
        className="fixed inset-0 z-40 flex flex-col bg-background px-5 pb-10 pt-24 text-foreground sm:px-10 sm:pb-14 sm:pt-32 lg:hidden"
      >
        <p className="font-mono text-fine leading-copy tracking-label uppercase text-foreground/45 sm:text-label">
          <span className="tracking-slash">{PANEL_SLASH}</span>
          <span className="tracking-slash-space"> </span>
          {PANEL_EYEBROW}
        </p>

        {/* Numbered and ruled, the way the menu cards are indexed — the panel is
            the same catalogue the page is, not a stack of bare links. */}
        <nav
          aria-label="Primary"
          className="mt-7 flex flex-col border-t border-foreground/15 sm:mt-9"
        >
          {links.map((link, index) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="group flex items-baseline gap-4 border-b border-foreground/15 py-3.5 font-display font-bold text-headline-phone leading-headline tracking-tight uppercase transition-opacity duration-[var(--duration-fast)] ease-entrance active:opacity-60 sm:gap-6 sm:py-5 sm:text-headline-tablet"
            >
              <span className="font-mono text-fine leading-flush tracking-label text-foreground/35 sm:text-label">
                {String(index + 1).padStart(2, "0")}
              </span>
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href={order.href}
          onClick={() => setMenuOpen(false)}
          className="mt-auto flex items-center gap-1.5 pt-10 font-mono text-fine leading-copy tracking-tight uppercase transition-opacity duration-[var(--duration-fast)] ease-entrance active:opacity-60 sm:text-base"
        >
          {order.label}
          <PulseDot className="size-(--size-dot) shrink-0 rounded-full bg-accent" />
        </Link>
      </div>
    </>
  );
};
