import { writeFile } from "node:fs/promises";

import { z } from "zod";

import { ApiError, handle } from "@/lib/api";
import { HERO_LAYOUT_FILE } from "@/lib/hero-layout";

/**
 * Dev-only: saves the hero model panel's layout into the project, so tuning in
 * the browser ends as a committed file rather than numbers copied by hand.
 *
 * It writes to the source tree, so it answers 404 anywhere but `next dev` —
 * a deployed site has no business rewriting its own files. `NODE_ENV` is the
 * framework's build mode, not configuration, which is why it is read directly
 * rather than through `src/env.ts`.
 */

const vector = z.tuple([z.number(), z.number(), z.number()]);

const layoutSchema = z.object({
  position: vector,
  rotation: z.tuple([
    z.number().min(-360).max(360),
    z.number().min(-360).max(360),
    z.number().min(-360).max(360),
  ]),
  scale: z.number().positive().max(100),
});

export const POST = handle(async (req) => {
  if (process.env.NODE_ENV !== "development") {
    throw new ApiError(404, "not_found", "Not found.");
  }

  const layout = layoutSchema.parse(await req.json());
  // A constant relative path, resolved against `next dev`'s working directory
  // (the project root). Building it from `process.cwd()` instead makes the
  // bundler trace the entire project into the server output.
  await writeFile(HERO_LAYOUT_FILE, `${JSON.stringify(layout, null, 2)}\n`);

  return { saved: true };
});
