"use client";

// 📖 Design source: Figma "Concept 6" 2173:655 — the site footer, 1440×385

import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { Inview } from "@/components/animation/springs/in-view";
import { PulseDot } from "@/components/common/header";
import { HEADER_THEME_ATTRIBUTE } from "@/components/common/header/header-theme";
import { DigitRoll } from "@/components/ui/digit-roll";
import { RuleDraw } from "@/components/ui/rule-draw";
import { UnderlineLink } from "@/components/ui/underline-link";
import type { Tags } from "@/types/springs";

export interface FooterLink {
  label: string;
  href: string;
}

export interface LegalGroup {
  /** Printed between the links; not part of either of them. */
  separator: string;
  links: FooterLink[];
}

export interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

export interface SiteFooterProps {
  /** Alpha mask of the wordmark; painted with the foreground. */
  logoMask: string;
  /** Alpha mask for the brand swirl behind the footer. */
  swirlMask: string;
  brand: string;
  tagline: string;
  columns: FooterColumn[];
  contact: { heading: string; items: FooterLink[] };
  locations: { label: string; addresses: string[][]; hours: string[] };
  /** Each group is a row of independent links joined by a plain separator. */
  legal: {
    copyright: string;
    social: LegalGroup;
    terms: LegalGroup;
  };
}

/**
 * One line rising out of its own mask.
 *
 * The mask is the outer element and the travel is on the inner one — that split
 * is what `Inview`'s `innerTag` exists for. The clip runs a few pixels past the
 * bottom edge so the hover rule, which sits one pixel under the text, is not
 * shaved off once the line has landed.
 *
 * It is deliberately one of these per *line*, not per column: a whole column
 * rising as one block is the version this replaced.
 */
const Rise = ({
  tag,
  delayIn,
  className,
  innerClassName = "block",
  children,
}: {
  tag: Tags;
  delayIn: number;
  className?: string;
  /** The travelling layer. Anything laying out its children needs it here —
      the outer element only holds the mask. */
  innerClassName?: string;
  children: ReactNode;
}) => (
  <Inview
    tag={tag}
    mode="once"
    innerTag="span"
    innerClassName={innerClassName}
    from={{ y: "150%" }}
    to={{ y: "0%" }}
    config={{ tension: 80, friction: 26 }}
    delayIn={delayIn}
    className={`[clip-path:inset(0_0_-4px_0)] ${className ?? ""}`}
  >
    {children}
  </Inview>
);

/**
 * The legal row: each label is its own link, and the character between them is
 * plain text. They read as one line but they are two destinations, so one
 * underline must not run across both.
 */
const LegalRow = ({ group }: { group: LegalGroup }) => (
  <>
    {group.links.map((link, index) => (
      <Fragment key={link.label}>
        {index > 0 && (
          <span
            aria-hidden="true"
            className="whitespace-pre text-foreground/50"
          >
            {group.separator}
          </span>
        )}
        <UnderlineLink
          href={link.href}
          className="text-foreground/50 transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-foreground"
        >
          {link.label}
        </UnderlineLink>
      </Fragment>
    ))}
  </>
);

/** A hairline rule at 10% white, as the board draws it. Drawn left to right. */
const Rule = ({ top, delayIn }: { top: string; delayIn: number }) => (
  <RuleDraw
    axis="x"
    delayIn={delayIn}
    className="block h-px w-full bg-foreground/10 lg:absolute lg:inset-x-10 lg:w-auto"
    /* Ignored while the rule is static; it only bites once lg: makes it absolute. */
    style={{ top }}
  />
);

/** The 38px vertical hairline between addresses. Drawn top to bottom. */
const Divider = ({ left, delayIn }: { left: string; delayIn: number }) => (
  <RuleDraw
    axis="y"
    delayIn={delayIn}
    className="hidden h-(--size-hero-rule) w-px bg-foreground/35 lg:absolute lg:top-(--size-footer-row-y) lg:block"
    style={{ left }}
  />
);

/**
 * Site footer — one per page, mounted in the root layout beside `<SiteHeader>`.
 *
 * Fixed 385px tall rather than a viewport section: the board draws it as a band
 * under the last block, not as a screen of its own.
 */
export const SiteFooter = ({
  logoMask,
  swirlMask,
  brand,
  tagline,
  columns,
  contact,
  locations,
  legal,
}: SiteFooterProps) => {
  return (
    <footer
      className="relative flex w-full flex-col gap-8 overflow-hidden bg-background px-5 py-12 max-sm:pb-8 font-mono text-label leading-copy tracking-tight uppercase text-foreground sm:gap-10 sm:px-10 sm:text-base lg:block lg:h-(--size-footer-height) lg:p-0"
      {...{ [HEADER_THEME_ATTRIBUTE]: "dark" }}
    >
      {/* Decorative texture — the mask URL is data, hence the inline style. */}
      <Inview
        tag="span"
        mode="once"
        aria-hidden="true"
        from={{ opacity: 0, scale: 1.05 }}
        to={{ opacity: 1, scale: 1 }}
        config={{ tension: 40, friction: 26 }}
        className="pointer-events-none absolute left-(--size-swirl-x) top-(--size-swirl-y) block h-(--size-swirl-height) w-(--size-swirl-width) bg-backdrop-soft [mask-position:center] [mask-repeat:no-repeat] [mask-size:100%_100%]"
        style={{ maskImage: `url(${swirlMask})` }}
      />

      <Inview
        tag="span"
        mode="once"
        from={{ clipPath: "inset(0 100% 0 0)" }}
        to={{ clipPath: "inset(0 0 0 0)" }}
        config={{ tension: 42, friction: 26 }}
        delayIn={180}
        className="block h-(--size-logo-height) w-(--size-logo-width) lg:absolute lg:left-10 lg:top-10"
      >
        <Link
          href="/"
          aria-label={brand}
          className="block size-full bg-foreground [mask-position:center] [mask-repeat:no-repeat] [mask-size:100%_100%]"
          style={{ maskImage: `url(${logoMask})` }}
        />
      </Inview>

      <Rise
        tag="p"
        delayIn={260}
        className="-mt-4 w-(--size-footer-tagline) text-fine text-foreground/50 max-lg:hidden lg:absolute lg:left-10 lg:top-(--size-footer-tagline-y) lg:mt-0"
      >
        {tagline}
      </Rise>

      {/* Four groups in one grid on a phone, so nothing is left orphaned in a
          row of its own; on the board the grid becomes the nav row and the
          contact block steps out to its own column. */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 sm:gap-x-10 lg:contents">
        {/* `contents` on both wrappers is what lets one grid hold all four groups
            on a phone while, on the board, the nav row and the contact column are
            placed independently — the contact column has to hang off the right
            edge like the hours and the legal row, not off the nav row's x. */}
        <div className="contents lg:absolute lg:left-(--size-footer-nav-x) lg:top-10 lg:flex lg:gap-12">
          {columns.map((column, index) => (
            <div
              key={column.heading}
              /* The board sizes each column to its own longest link and keeps a
               fixed gutter between them, so the columns are not equidistant —
               MENU and ABOUT US are wider than SHOP and push the next one along.
               The token stays as the floor the first column sits on. */
              className="flex flex-col gap-3 lg:min-w-(--size-footer-col)"
            >
              <Rise tag="p" delayIn={160 + index * 130}>
                {column.heading}
              </Rise>
              <ul className="flex flex-col gap-1.5 text-foreground/50">
                {column.links.map((link, row) => (
                  <Rise
                    key={link.label}
                    tag="li"
                    delayIn={160 + index * 130 + (row + 1) * 70}
                  >
                    <UnderlineLink
                      href={link.href}
                      className="[overflow-wrap:anywhere] transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-foreground lg:whitespace-nowrap"
                    >
                      {link.label}
                    </UnderlineLink>
                  </Rise>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <span
          aria-hidden="true"
          className="hidden h-px bg-foreground/10 max-sm:col-span-2 max-sm:block sm:max-lg:col-span-3 sm:max-lg:block"
        />

        <div className="flex flex-col gap-3 max-sm:col-span-2 lg:absolute lg:left-(--size-footer-contact-x) lg:top-10">
          <Rise tag="p" delayIn={550}>
            {contact.heading}
          </Rise>
          <ul className="flex flex-col gap-1.5 text-foreground/50">
            {contact.items.map((item, row) => (
              <Rise key={item.label} tag="li" delayIn={550 + (row + 1) * 70}>
                <UnderlineLink
                  href={item.href}
                  className="[overflow-wrap:anywhere] transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-foreground lg:whitespace-nowrap"
                >
                  {item.label}
                </UnderlineLink>
              </Rise>
            ))}
          </ul>
        </div>
      </div>

      <Rule top="var(--size-footer-rule-top)" delayIn={120} />

      <Rise
        tag="p"
        delayIn={300}
        className="text-fine text-foreground/50 lg:absolute lg:left-10 lg:top-(--size-footer-row-y)"
        innerClassName="flex items-center gap-1.5"
      >
        <PulseDot className="size-(--size-footer-dot) shrink-0 rounded-full bg-accent" />
        {locations.label}
      </Rise>

      <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 sm:gap-x-10 lg:contents">
        <address className="not-italic lg:absolute lg:left-(--size-footer-nav-x) lg:top-(--size-footer-row-y) lg:w-(--size-footer-address)">
          {locations.addresses[0].map((line, row) => (
            <Rise
              key={line}
              tag="span"
              delayIn={340 + row * 70}
              className="block"
            >
              {line}
            </Rise>
          ))}
        </address>
        <Divider left="var(--size-footer-divider-a)" delayIn={300} />
        <address className="not-italic lg:whitespace-nowrap lg:absolute lg:left-(--size-footer-address-b) lg:top-(--size-footer-row-y)">
          {locations.addresses[1].map((line, row) => (
            <Rise
              key={line}
              tag="span"
              delayIn={400 + row * 70}
              className="block"
            >
              {line}
            </Rise>
          ))}
        </address>
        <Divider left="var(--size-footer-divider-b)" delayIn={360} />
        <address className="not-italic lg:whitespace-nowrap lg:absolute lg:left-(--size-footer-address-c) lg:top-(--size-footer-row-y)">
          {locations.addresses[2].map((line, row) => (
            <Rise
              key={line}
              tag="span"
              delayIn={460 + row * 70}
              className="block"
            >
              {line}
            </Rise>
          ))}
        </address>

        <p className="max-sm:mt-4 max-sm:border-t max-sm:border-foreground/10 max-sm:pt-6 lg:whitespace-nowrap lg:absolute lg:left-(--size-footer-contact-x) lg:top-(--size-footer-row-y)">
          {locations.hours.map((line, row) => (
            <Rise
              key={line}
              tag="span"
              delayIn={500 + row * 70}
              className="block"
            >
              <DigitRoll value={line} delayIn={560 + row * 70} />
            </Rise>
          ))}
        </p>
      </div>

      <Rule top="var(--size-footer-rule-bottom)" delayIn={220} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between lg:contents">
        <Rise
          tag="p"
          delayIn={560}
          className="whitespace-nowrap text-fine text-foreground/50 max-sm:order-last max-sm:mt-3 max-sm:border-t max-sm:border-foreground/10 max-sm:pt-6 lg:absolute lg:left-10 lg:top-(--size-footer-legal-y)"
        >
          {legal.copyright}
        </Rise>
        <Rise
          tag="span"
          delayIn={600}
          className="block whitespace-nowrap text-fine lg:absolute lg:left-(--size-footer-nav-x) lg:top-(--size-footer-legal-y)"
        >
          <LegalRow group={legal.social} />
        </Rise>
        <Rise
          tag="span"
          delayIn={640}
          className="block whitespace-nowrap text-fine lg:absolute lg:left-(--size-footer-contact-x) lg:top-(--size-footer-legal-y)"
        >
          <LegalRow group={legal.terms} />
        </Rise>
      </div>
    </footer>
  );
};
