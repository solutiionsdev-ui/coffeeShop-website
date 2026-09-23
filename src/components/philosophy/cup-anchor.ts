/**
 * Marks the element the philosophy scene draws its cup over. Shared by the
 * server-rendered layout and the client scene, so it lives in neither: a value
 * imported from a `"use client"` module into a Server Component arrives as a
 * client reference, not as the string.
 */
export const CUP_ANCHOR = "data-philosophy-cup";
