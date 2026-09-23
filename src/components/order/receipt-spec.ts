/**
 * The receipt's design constants, in their own module so the barcode — which is
 * a Client Component, because it animates — can read them without pulling the
 * whole receipt into the client bundle.
 */
export const RECEIPT = {
  /** Paper width in scene px — must match PRINT_WINDOW.width in order.tsx. */
  width: 328,
  paddingX: 22,
  paper: "#F2F0EA",
  ink: "#111111",
  inkMuted: "#5b5b58",
  rule: "rgba(17, 17, 17, 0.25)",
  /** Dotted rules: 5px dash, 5px gap, 1px tall. */
  dash: { on: 5, off: 5, height: 1 },
  cupWidth: 150,
  /** Vertical rhythm. Tuned so the finished paper fits PRINT_WINDOW.height
      (572px) — otherwise the torn bottom edge is clipped off at full feed. */
  /** Blank leader between the slot and the header, as the board shows it. */
  padTop: 32,
  padBottom: 10,
  gap: 10,
  barcode: { height: 42, gap: 1, thin: 1, thick: 2.5, seed: 20250521 },
  /** Torn bottom edge: teeth pointing down, 8px pitch, 9px deep. */
  teeth: { pitch: 8, depth: 9 },
} as const;
