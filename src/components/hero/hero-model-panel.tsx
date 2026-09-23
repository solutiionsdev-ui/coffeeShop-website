"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import { apiFetch } from "@/lib/api-client";
import type { HeroLayout, HeroSnapshot } from "@/lib/hero-layout";

/** Slider travel per control. The inputs beside them take any value. */
const RANGE = {
  position: { min: -1, max: 1, step: 0.001 },
  rotation: { min: -180, max: 180, step: 0.5 },
  scale: { min: 0.2, max: 3, step: 0.001 },
} as const;

const AXES = ["x", "y", "z"] as const;

const round = (value: number) => Math.round(value * 1000) / 1000;

interface NumberFieldProps {
  label: string;
  value: number;
  range: { min: number; max: number; step: number };
  onChange: (value: number) => void;
}

const NumberField = ({ label, value, range, onChange }: NumberFieldProps) => (
  <label className="grid grid-cols-[1.25rem_1fr_4.5rem] items-center gap-2">
    <span className="text-foreground/60">{label}</span>
    <input
      type="range"
      min={range.min}
      max={range.max}
      step={range.step}
      value={value}
      onChange={(event) => onChange(round(Number(event.target.value)))}
      className="w-full accent-foreground"
    />
    <input
      type="number"
      step={range.step}
      value={value}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next)) onChange(round(next));
      }}
      className="w-full rounded-sm border border-foreground/20 bg-transparent px-1 py-0.5 text-right"
    />
  </label>
);

export interface HeroModelPanelProps {
  snapshot: HeroSnapshot;
  /** Pushes a layout into the running scene. */
  onApply: (layout: HeroLayout) => void;
}

/**
 * Dev-only tuning panel for the hero model: one position, rotation and scale
 * for the whole product — bag and cup move together — laid over the automatic
 * fit and applied live. Position is in product heights (0.1 = a tenth of the
 * product's height), so a saved offset holds at every window size. "Save"
 * writes the layout to `src/data/hero-layout.json` through the dev route;
 * "Reset" returns to the fitted placement.
 *
 * Portalled to `<body>`: the model sits inside a figure whose entrance spring
 * transforms it, and a transformed ancestor would turn `fixed` into `absolute`.
 * `data-lenis-prevent` lets the panel scroll without scrolling the page.
 */
export const HeroModelPanel = ({ snapshot, onApply }: HeroModelPanelProps) => {
  const [layout, setLayout] = useState<HeroLayout>(snapshot.layout);
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState("");

  const update = (next: HeroLayout) => {
    setLayout(next);
    setStatus("");
    onApply(next);
  };

  const setAxis = (key: "position" | "rotation", axis: number, value: number) => {
    const next = [...layout[key]] as [number, number, number];
    next[axis] = value;
    update({ ...layout, [key]: next });
  };

  const save = async () => {
    setStatus("saving…");
    try {
      await apiFetch<{ saved: boolean }>("/api/dev/hero-layout", {
        method: "POST",
        body: JSON.stringify(layout),
      });
      setStatus("saved to src/data/hero-layout.json");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "save failed");
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(layout, null, 2));
    setStatus("copied");
  };

  return createPortal(
    <aside
      aria-label="Hero model settings"
      data-lenis-prevent
      className="fixed right-4 top-20 z-200 flex max-h-[80vh] w-80 flex-col gap-3 overflow-y-auto rounded-md border border-foreground/15 bg-background/90 p-3 font-mono text-fine text-foreground backdrop-blur-md"
    >
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        className="flex items-center justify-between uppercase tracking-label"
      >
        <span>Hero model</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <>
          <fieldset className="flex flex-col gap-1.5 border-t border-foreground/15 pt-2">
            <legend className="uppercase tracking-label">
              position{" "}
              <span className="normal-case text-foreground/50">
                product heights
              </span>
            </legend>
            {AXES.map((axis, index) => (
              <NumberField
                key={`p${axis}`}
                label={axis}
                value={layout.position[index]}
                range={RANGE.position}
                onChange={(value) => setAxis("position", index, value)}
              />
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-1.5 border-t border-foreground/15 pt-2">
            <legend className="uppercase tracking-label">rotation°</legend>
            {AXES.map((axis, index) => (
              <NumberField
                key={`r${axis}`}
                label={axis}
                value={layout.rotation[index]}
                range={RANGE.rotation}
                onChange={(value) => setAxis("rotation", index, value)}
              />
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-1.5 border-t border-foreground/15 pt-2">
            <legend className="uppercase tracking-label">scale</legend>
            <NumberField
              label="s"
              value={layout.scale}
              range={RANGE.scale}
              onChange={(scale) => update({ ...layout, scale })}
            />
          </fieldset>

          <div className="flex flex-wrap gap-2 border-t border-foreground/15 pt-2">
            <button
              type="button"
              onClick={save}
              className="rounded-sm bg-foreground px-2 py-1 uppercase text-background"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => update(snapshot.file)}
              className="rounded-sm border border-foreground/30 px-2 py-1 uppercase"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={copy}
              className="rounded-sm border border-foreground/30 px-2 py-1 uppercase"
            >
              Copy JSON
            </button>
          </div>
          {status && (
            <p role="status" className="text-foreground/60">
              {status}
            </p>
          )}
        </>
      )}
    </aside>,
    document.body,
  );
};
