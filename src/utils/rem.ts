/**
 * Design px → rem at the 1440 grid base (16px root font-size).
 *
 * For values that come from content data rather than the token system — image
 * crops that change with the photograph, for instance. Anything that is a
 * design *decision* belongs in `globals.css` as a token instead.
 */
export const rem = (px: number) => `${px / 16}rem`;
