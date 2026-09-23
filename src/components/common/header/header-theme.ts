/**
 * Shared contract between `<SiteHeader>` and the sections it passes over.
 *
 * Deliberately a plain module, not part of `site-header.tsx`: that file is
 * `"use client"`, and every export of a client module imported into a Server
 * Component arrives as a client reference rather than its value — so the
 * constant below would have become a proxy object and the attribute would never
 * have been written to the DOM.
 */

/** Surface the header is currently sitting over. */
export type HeaderTheme = "dark" | "light";

/** Sections opt in by setting this to their own surface. */
export const HEADER_THEME_ATTRIBUTE = "data-header-theme";
