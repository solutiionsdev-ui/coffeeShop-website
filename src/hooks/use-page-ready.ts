import { create } from "zustand";

export interface UsePageReady {
  /** True once the preloader has left and the first screen is actually visible. */
  ready: boolean;
  /**
   * True from the moment the preloader starts to pour away — before `ready`.
   * The first screen is already showing through as the panel drains, so
   * anything that should be *arriving* while it drains (rather than after)
   * keys off this instead of waiting for `ready`.
   */
  revealing: boolean;
  setReady: (ready: boolean) => void;
  setRevealing: (revealing: boolean) => void;
}

/**
 * Whether the page is on screen yet.
 *
 * Everything above the fold intersects its observer the moment it mounts, which
 * is while the preloader still covers the screen — so the hero's entrance ran
 * behind a panel and the page arrived already assembled. The pieces that open
 * the page take `enabled` from here and hold their `from` state until the
 * preloader is gone.
 */
export const usePageReady = create<UsePageReady>((set) => ({
  ready: false,
  revealing: false,
  // Ready implies revealing: a page that skipped the preloader (reduced
  // motion) is both at once.
  setReady: (ready) =>
    set(ready ? { ready, revealing: true } : { ready }),
  setRevealing: (revealing) => set({ revealing }),
}));
