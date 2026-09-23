"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Box3,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  type MeshStandardMaterial,
  NeutralToneMapping,
  type Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { useLoop } from "@/hooks/animation/use-render-loop";
import { usePageReady } from "@/hooks/use-page-ready";
import {
  DEFAULT_HERO_LAYOUT,
  HERO_PANEL,
  savedHeroLayout,
  type HeroLayout,
  type HeroModelControls,
  type HeroSnapshot,
} from "@/lib/hero-layout";

import { HeroModelPanel } from "./hero-model-panel";

/**
 * Where the product sat inside the photograph this replaces, as fractions of
 * the frame. Measured off that asset's own alpha — the bag and cup ran 26.9% to
 * 84.7% across and 4.9% to 77% down, and the rest of the file was empty ground.
 * The model is fitted to the same rectangle, so nothing on the page moves.
 */
const FRAME = { left: 0.2697, right: 0.8439, top: 0.0502, bottom: 0.7695 };

/** The photograph's own box, which those fractions are measured against. */
const ASSET = { width: 1153, height: 976 };

/**
 * The photograph was laid into its frame two ways, and both are reproduced
 * here: on the desktop board it covered the box and was centred, and below the
 * board it was contained and sat on the bottom of it. Fitting the model to flat
 * fractions of the frame would have matched the board and quietly moved the
 * product on tablet and phone, where the frame is a different shape.
 *
 * This is the viewport width the switch happened at — Tailwind's `lg`, which is
 * what the photograph's own `lg:object-cover` was keyed to. Not the frame's
 * width: below the board the frame is wider than the screen on purpose.
 */
const COVER_FROM = 1024;

/**
 * Corrections to where the product stands, per grid.
 *
 * The photograph's own rectangle is the starting point everywhere, but it was
 * cut for the desktop board and the frames below it are shaped differently:
 * on the two middle grids the product ends up hard against the copy with its
 * cup already on the screen's edge, and on the phone the plinth lands whole
 * inside the frame instead of running off it.
 *
 * `scale` sizes the product about its own foot, so the plinth line stays put
 * while it shrinks or grows. `x` and `y` then move it, in fractions of the
 * frame. Both are measured, not guessed — see the numbers in each entry.
 */
const PLACEMENT = [
  /* 1024-1279: back 7% and right 9px. The cup was standing on the screen's
     right edge, so the air the headline needed had to come out of the size —
     a plain shift would have pushed the cup off. */
  { from: 1024, to: 1280, scale: 0.928, x: 0.01, y: 0 },
  /* 768-1023: right off the copy, a little larger, and set down a touch. The
     growth eats into the gap by the button, so the shift right pays it back —
     what it costs is the cup's outer edge, which runs off the screen by about
     twenty pixels and reads as a bleed rather than a cut. */
  { from: 768, to: 1024, scale: 1.02, x: 0.0454, y: 0.05 },
  /* Phone: sized to the gap between the button and the info bar rather than to
     taste. The packaging's foot is white and the bar's type is white, so
     anywhere the two overlap the address is unreadable — the product is held
     small enough that its foot lands above the bar and the plinth, which is
     nearly black, is what the type sits on. */
  { from: 0, to: 640, scale: 0.95, x: -0.045, y: 0.0163 },
] as const;

/**
 * Where the product sits inside the model's own bounding box, as fractions of
 * it. The file composes the bag and the cup and nothing else — no plinth — so
 * the product is the whole box.
 */
const PRODUCT = { left: 0, right: 1, top: 0, bottom: 1 };

/**
 * The depth the fit is solved on, 0 at the far face of the bounding box and 1
 * at the near one. The cup is round, so its silhouette is widest through the
 * middle — which is where the fit measures it.
 */
const PRODUCT_DEPTH = 0.5;

/**
 * A last vertical nudge, as a fraction of the product's height. The plane above
 * is a flat rectangle and the product is not: its silhouette sits slightly
 * higher in frame than the rectangle's centre does, and this is the measured
 * difference — with it the bag's top and the plinth line land where the
 * photograph's did.
 */
const FIT_NUDGE_Y = 0;

/** Breathing room kept between the product and the edge of the screen, in px. */
const FRAME_MARGIN = 10;

/**
 * The lift on hover. Only the piece under the pointer lifts: `by` is how high,
 * in fractions of the product's height, and `turn` / `roll` the small twist it
 * picks up on the way (radians, about its own vertical and its own depth axis)
 * — a thing picked up is never lifted dead straight.
 *
 * The lift runs on a damped spring (velocity carried frame to frame) rather
 * than a plain chase: it eases *in* as well as out, so the piece floats up
 * instead of jumping at the first frame. `stiffness` / `damping` are per frame
 * and sit just past critical — no overshoot, about a third of a second to
 * settle.
 */
const LIFT = {
  bag: { by: 0.05, turn: -0.14, roll: 0.05 },
  cup: { by: 0.1, turn: 0.24, roll: -0.08 },
  stiffness: 0.004,
  damping: 0.88,
  /** Below this the lift has arrived and the loop can settle (0-1 scale). */
  rest: 0.0005,
} as const;

/**
 * How far the product sinks as the hero scrolls away, in product heights over
 * the hero's own height, and how quickly it follows the scroll. It lags the
 * page a little — the product drifting down out of a frame that is leaving.
 */
const SCROLL_DROP = 0.22;
const SCROLL_EASE = 0.14;

/**
 * Extra canvas around the frame, as a fraction of it on every side. The frame
 * is the photograph's box, and the panel's offset and scale can carry the
 * product past it — without the margin the canvas edge cut straight through
 * the bag. The fit still solves against the frame, not the larger canvas.
 */
const BLEED = 0.22;

/**
 * The entrance once the preloader has gone: the product rises straight up
 * from below, turning a little into its pose about its own centre as it
 * comes. `rise` is in product heights, `turn` / `roll` in radians about the
 * vertical and the depth axis, `duration` and `delay` in ms. Eased out
 * (cubic), so it arrives rather than stops.
 */
const INTRO = { rise: 0.35, turn: 0.25, roll: -0.05, duration: 1400, delay: 0 };

/**
 * The lean toward the cursor, per piece: `by` scales the product's lean
 * (`POINTER.lean`), `ease` is how quickly the piece chases it. Different on
 * purpose — the cup turns further and sooner, the bag follows late — so the two
 * turn toward the cursor out of step instead of as one block.
 */
const LEAN = {
  bag: { by: 0.8, ease: 0.06 },
  cup: { by: 1.35, ease: 0.15 },
} as const;

/**
 * Degrees to radians. The panel's whole-product transform
 * (`src/data/hero-layout.json`) speaks degrees; three speaks radians.
 */
const DEG = Math.PI / 180;

/**
 * A long lens: enough convergence to read as a solid object rather than a flat
 * card, little enough that the silhouette still lands on the photograph's
 * rectangle. Product photography is shot this way for the same reason.
 */
const FIELD_OF_VIEW = 8;

/**
 * How the product answers the pointer.
 *
 * `lean` is the idle state — it turns a few degrees toward the cursor as it
 * crosses the section, which is the gesture the philosophy cup answers further
 * down the page. `drag` is the real one: grab the product and it turns under
 * your hand, a degree per two pixels, and keeps spinning briefly when you let
 * go.
 *
 * Both axes are clamped, and the yaw limit is a framing decision rather than a
 * taste one: the bag and cup stand side by side, so turning the pair swings the
 * near one outward, and past about forty degrees it reaches the edge of the
 * frame and is cut. Pitch is held tighter still — there is no underside to this
 * model worth showing and the plinth reads as a bare slab from below.
 */
const POINTER = {
  lean: { yaw: 0.2, pitch: 0.11 },
  dragPerPixel: 0.009,
  yawLimit: 0.6,
  pitchLimit: 0.3,
  /** Per-frame decay of the spin left over from a flick. */
  friction: 0.94,
  /** Below this the spin is spent and the loop can settle. */
  restSpin: 0.0004,
  /** How fast the shown angle chases the target. */
  ease: 0.16,
  /** Below this the chase is over. */
  restAngle: 0.0002,
} as const;

/**
 * The studio the product is lit in, matched to the reference render.
 *
 * The packaging is a 0.44-rough dielectric, so anything bright placed between
 * the camera and the bag's flat front lands its own reflection back down the
 * lens and lays a sheen over the panel — which is what lifted the printed black
 * to grey. Both keys are therefore held about sixty degrees off the view axis,
 * far enough out of that specular lobe to leave the type alone while their
 * diffuse still adds up to a fully lit face. It is the same reason a copy stand
 * puts its lamps out at the sides.
 *
 * Directions only: these are directional lights, so the distances mean nothing.
 */
const KEYS = [
  /* Left key. Still the main light, but brought down from 5.8: with the
     product nearer the lens it burnt the bag's face out to flat white and
     took the print's greys with it. */
  { position: [-4.2, 3, 1.4], intensity: 4 },
  /* Right key, lifted to a quarter of the left: the contrast comes from the
     pair now rather than from a blown face against a dead side. */
  { position: [3.9, 2.5, 1.3], intensity: 1 },
  /* Rim, behind and above: the bag's shoulder and the gloss along the lid. */
  { position: [0.6, 3, -3.2], intensity: 0.6 },
] as const;

/**
 * The room those keys stand in: softboxes on a black ground, baked to an
 * environment map. It carries the soft reflections in the lid and the printed
 * panel, and nothing else — a lit room would put ambient on every surface and
 * grey the type again, which is what the black ground is for. `emit` is a
 * radiance, so it runs past 1.
 */
const STUDIO = [
  { size: [7, 7], position: [-2.6, 2.4, 2.6], emit: 11 },
  { size: [5, 5], position: [3.4, 0.5, 2.2], emit: 2.4 },
  { size: [6, 3], position: [0.6, 3, -3], emit: 3.2 },
  { size: [6, 6], position: [0, -3, 1.6], emit: 0.5 },
] as const;

/**
 * The keys' colour. Neutral white came out a touch warm in red and a touch cold
 * in blue against the reference — this is the correction, measured off the same
 * patch of the bag's front. It is a two per cent move and reads as white.
 */
const LIGHT_COLOUR = 0xfcfff9;

/** How much of that room reaches the product — a soft fill under the keys,
    so the shadow side holds detail without the keys having to shout. */
const ENVIRONMENT = 0.045;

/** The mesh ships Draco-compressed, so the decoder has to be on hand to read
    it. Served from /public rather than a CDN — the page must not depend on a
    third party to draw its own product. */
const DRACO_PATH = "/draco/";

/**
 * Floor under the pixel ratio, so the render is supersampled even where the
 * screen is not. The product is a single object on a dark ground and its edge
 * is the whole silhouette; multisampling alone left it stepped on a 1x display.
 */
const MIN_PIXEL_RATIO = 1.5;

/**
 * Strength every normal map is drawn at. The exporter writes the bag's at 3.3,
 * which turns each fold of the paper into a stripe running to black; at 1 the
 * map reads as the paper it was baked from.
 */
const NORMAL_STRENGTH = 1;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const clamp = (value: number, limit: number) =>
  Math.max(-limit, Math.min(limit, value));

export interface HeroModelProps {
  /** Path to the .glb, served from /public. */
  src: string;
  /** Describes the product for anyone who cannot see the canvas. */
  alt: string;
  /**
   * The product's own rectangle in the layout — what the pointer grabs. The
   * frame around it overhangs the copy column, so the whole canvas cannot be
   * the handle; this element is the part of it the product actually occupies.
   */
  surface: RefObject<HTMLElement | null>;
  /** Told which piece the pointer is on — or none — whenever that changes. */
  onPiece?: (piece: HeroPiece | null) => void;
}

/** The pieces the product is composed of. */
export type HeroPiece = "bag" | "cup";

/**
 * The hero's product, as geometry you can turn.
 *
 * Plain three rather than a React renderer: the scene is one mesh and one light
 * rig, so a reconciler would buy nothing, and the React renderer's global JSX
 * augmentation collides with the vendored spring components, which are not ours
 * to change.
 *
 * The camera is fitted once, at the rest pose, and then left alone. Turning the
 * product moves the model inside a fixed frame rather than re-solving the frame
 * for each new silhouette — which is what keeps the bag exactly the size and in
 * exactly the place the photograph's was, however far it has been spun.
 *
 * Drawing is on demand. The component subscribes to the app's one shared ticker
 * and returns immediately on any frame where no angle has changed, so a product
 * standing still costs a function call rather than a redraw, and a product
 * scrolled off the screen costs nothing at all.
 */
export const HeroModel = ({ src, alt, surface, onPiece }: HeroModelProps) => {
  const host = useRef<HTMLDivElement>(null);
  /* Read live from the scene's listeners, which are set up once. */
  const onPieceRef = useRef(onPiece);
  useEffect(() => {
    onPieceRef.current = onPiece;
  });
  const frame = useRef<(() => void) | null>(null);
  /** The scene's side of the dev panel, and what the panel starts from. */
  const controls = useRef<HeroModelControls | null>(null);
  const [snapshot, setSnapshot] = useState<HeroSnapshot | null>(null);

  useLoop(() => frame.current?.(), { framerate: 0 });

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    const hero = mount.closest("section");

    // The canvas overhangs the frame by BLEED on every side; `mount` stays the
    // frame, and everything the fit measures is measured on it.
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.left = `${-BLEED * 100}%`;
    canvas.style.top = `${-BLEED * 100}%`;
    canvas.style.width = `${(1 + 2 * BLEED) * 100}%`;
    canvas.style.height = `${(1 + 2 * BLEED) * 100}%`;
    canvas.style.display = "block";
    mount.appendChild(canvas);

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        // The scene is drawn on demand, so frames are minutes apart. Without
        // this the drawing buffer is free to be thrown away after it has been
        // composited, and the next repaint that is not ours — a tab coming
        // back to the front, a style change above it — shows an empty canvas
        // with no redraw to fix it.
        preserveDrawingBuffer: true,
      });
    } catch {
      // No WebGL: leave the frame empty rather than throwing on the hero.
      canvas.remove();
      return;
    }

    renderer.setClearAlpha(0);
    renderer.outputColorSpace = SRGBColorSpace;
    // Khronos' PBR-neutral curve rather than ACES: it is built for product
    // shots and leaves albedo where the texture put it, where ACES pulls the
    // whole image toward grey — the paper went dull and the printed black with
    // it, which is the one thing the reference render does not do.
    renderer.toneMapping = NeutralToneMapping;
    // Down from 1.49: that figure was measured on the old bag's paper, and on
    // this model it clipped the lit face to white. Here the face stays just
    // under white and the printed type keeps its weight.
    renderer.toneMappingExposure = 1.15;

    const scene = new Scene();
    const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 100);

    const studio = new Scene();
    studio.background = new Color(0x000000);
    for (const { size, position, emit } of STUDIO) {
      const panel = new Mesh(
        new PlaneGeometry(size[0], size[1]),
        new MeshBasicMaterial({ color: new Color(emit, emit, emit) }),
      );
      panel.position.set(position[0], position[1], position[2]);
      panel.lookAt(0, 0, 0);
      studio.add(panel);
    }

    const pmrem = new PMREMGenerator(renderer);
    const environment = pmrem.fromScene(studio, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = ENVIRONMENT;

    // The panels only existed to be baked into that map.
    studio.traverse((node) => {
      const panel = node as Partial<Mesh>;
      panel.geometry?.dispose();
      (panel.material as MeshBasicMaterial | undefined)?.dispose();
    });

    for (const { position, intensity } of KEYS) {
      const light = new DirectionalLight(LIGHT_COLOUR, intensity);
      light.position.set(position[0], position[1], position[2]);
      scene.add(light);
    }

    /**
     * The panel's whole-product transform. It sits above everything the fit
     * measures — the fit projects through the pivot's own matrix, not the
     * stage's — so moving, turning or scaling the product here lays it over
     * the fitted placement instead of being re-fitted away.
     */
    const stage = new Group();
    /** The scroll drift, above the panel's transform and just as unseen by
        the fit. */
    const drift = new Group();
    scene.add(drift);
    drift.add(stage);
    /**
     * The entrance after the preloader. It sits *under* the stage, directly
     * over the pivot, so its turn is about the product's own centre. Above the
     * stage it turned about the scene's origin instead, and the panel's offset
     * (a product height toward the lens) swung the product sideways across
     * the frame as it rose.
     */
    const intro = new Group();
    stage.add(intro);

    // The product turns about its own centre, so the mesh is hung off a pivot
    // that sits there rather than wherever the exporter left the origin.
    const pivot = new Group();
    intro.add(pivot);

    let disposed = false;
    let model: Group | null = null;
    /**
     * The pieces the file composes the product from — each top-level node of
     * its scene — with where each rests, how far it has lifted and how far it
     * has leaned toward the cursor.
     */
    type Piece = {
      node: Object3D;
      role: "bag" | "cup";
      base: number;
      by: number;
      turn: number;
      /** The lift spring's velocity, per frame. */
      speed: number;
      roll: number;
      /** 0 at rest, 1 fully lifted. */
      lift: number;
      leanBy: number;
      leanEase: number;
      lean: { yaw: number; pitch: number };
    };
    let pieces: Piece[] = [];
    /** The piece under the pointer, which is the only one that lifts. */
    let hovered: Piece | null = null;
    let layout: HeroLayout = savedHeroLayout;
    /**
     * Two boxes, both the packaging's and both in world units at the rest pose.
     * `plane` is flat, on the depth the bag stands at, and sizes the product —
     * a box as deep as the plinth projects near corners the eye never sees.
     * `solid` has the packaging's own depth and is what keeps it on screen once
     * it turns: a flat plane goes edge-on as it rotates and stops describing
     * where the product actually is.
     */
    let plane: Box3 | null = null;
    let solid: Box3 | null = null;

    /* Angles, all in radians and all measured from the rest pose. `drag` is
       what the hand has put in, `lean` what the pointer is asking for, `shown`
       what is actually on screen and chasing the sum of the two. */
    const drag = { yaw: 0, pitch: 0 };
    const lean = { yaw: 0, pitch: 0 };
    const shown = { yaw: 0, pitch: 0 };
    let spin = 0;
    let productHeight = 0;
    let dirty = true;
    let onScreen = true;
    let reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;

    /* The entrance: starts the moment the preloader begins to pour away —
       the hero is already showing through as it drains, so waiting for the
       pour to finish read as a pause. It may already be under way if this
       mounts late; it is skipped under reduced motion. */
    let introStart: number | null = null;
    let introDone = reduced;
    const startIntro = () => {
      if (introStart !== null) return;
      introStart = performance.now() + INTRO.delay;
      dirty = true;
    };
    if (usePageReady.getState().revealing) startIntro();
    const unsubscribeReady = usePageReady.subscribe((state) => {
      if (state.revealing) startIntro();
    });

    /**
     * Where the packaging lands on screen, in pixels, for the camera as it
     * currently stands. Eight corners rather than one number, because under a
     * perspective lens the near corner of a box projects larger than the far
     * one and the world height alone under-sizes the fit.
     */
    const project = (box: Box3, width: number, height: number) => {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      const corner = new Vector3();
      pivot.updateMatrix();
      for (let i = 0; i < 8; i++) {
        corner
          .set(
            i & 1 ? box.max.x : box.min.x,
            i & 2 ? box.max.y : box.min.y,
            i & 4 ? box.max.z : box.min.z,
          )
          // The box is the pivot's, so it turns with it — through the pivot's
          // own matrix, not its world one: the stage above it is the panel's
          // offset, and the fit must not see it.
          .applyMatrix4(pivot.matrix)
          .project(camera);
        x0 = Math.min(x0, ((corner.x + 1) / 2) * width);
        x1 = Math.max(x1, ((corner.x + 1) / 2) * width);
        y0 = Math.min(y0, ((1 - corner.y) / 2) * height);
        y1 = Math.max(y1, ((1 - corner.y) / 2) * height);
      }
      return { x0, y0, x1, y1 };
    };

    /** Where the product has to sit, in pixels, from the last fit. */
    let target: {
      x: number;
      y: number;
      width: number;
      height: number;
      /** The screen's own edges, in the canvas's pixel coordinates. */
      left: number;
      right: number;
    } | null = null;

    /**
     * Re-centres the frame on the product for the pose it is in now.
     *
     * The pair stands side by side, so turning it swings the near one outward
     * and, held to a fixed frame, straight off the edge of the screen. Running
     * the shift every frame keeps the product framed at any angle while the
     * camera's distance — and so the product's size — stays exactly where the
     * fit put it. At rest the shift resolves to the photograph's own placement,
     * which is the number that had to be preserved.
     */
    const reframe = () => {
      if (!target || !plane || !solid) return;
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
      const shot = project(plane, target.width, target.height);
      const reach = project(solid, target.width, target.height);

      /* The offset that puts the product's centre on the mark, then held to
         whatever range still keeps the whole of it on screen. Raising the
         offset moves the product left, so the far edge sets the floor and the
         near edge the ceiling; if it is too wide for both, it is centred. */
      const edges = target;
      const hold = (want: number, low: number, high: number) => {
        const floor = high - edges.right;
        const ceiling = low - edges.left;
        return floor > ceiling
          ? (floor + ceiling) / 2
          : Math.min(Math.max(want, floor), ceiling);
      };

      camera.setViewOffset(
        target.width,
        target.height,
        hold((shot.x0 + shot.x1) / 2 - target.x, reach.x0, reach.x1),
        // Vertically the mark stands: the plinth is meant to run off the
        // bottom edge, exactly as it did in the photograph, and pitch is
        // clamped tightly enough that nothing else reaches the top.
        (shot.y0 + shot.y1) / 2 - target.y,
        target.width,
        target.height,
      );
      camera.updateProjectionMatrix();
    };

    /** Puts the product where the photograph's was, at this frame's size. */
    const fit = () => {
      // The frame's size; the canvas is this plus BLEED on every side.
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height || !model || !plane) return;
      const padX = width * BLEED;
      const padY = height * BLEED;
      const canvasWidth = width + 2 * padX;
      const canvasHeight = height + 2 * padY;

      // Read once here rather than every frame: the frame only moves when the
      // window does, and this is the one place that runs on a resize.
      const onPage = mount.getBoundingClientRect();
      const canvasLeft = onPage.left - padX;

      // Where the photograph put its product inside this frame, as fractions of
      // it — the asset's own `object-fit` maths, run again for these pixels.
      const cover = window.innerWidth >= COVER_FROM;
      const lay = cover
        ? Math.max(width / ASSET.width, height / ASSET.height)
        : Math.min(width / ASSET.width, height / ASSET.height);
      const laidW = ASSET.width * lay;
      const laidH = ASSET.height * lay;
      const offsetX = (width - laidW) / 2;
      const offsetY = cover ? (height - laidH) / 2 : height - laidH;
      const rect: { left: number; right: number; top: number; bottom: number } =
        {
          left: (offsetX + FRAME.left * laidW) / width,
          right: (offsetX + FRAME.right * laidW) / width,
          top: (offsetY + FRAME.top * laidH) / height,
          bottom: (offsetY + FRAME.bottom * laidH) / height,
        };

      // On the squarer frames between tablet and board, the foot of the
      // product is let out to the bottom of the screen instead of stopping
      // where the photograph's did.
      // The grid's own correction, applied to that rectangle.
      const place = PLACEMENT.find(
        (band) => window.innerWidth >= band.from && window.innerWidth < band.to,
      );
      if (place) {
        const tall = rect.bottom - rect.top;
        const half = (rect.right - rect.left) / 2;
        const middle = (rect.left + rect.right) / 2 + place.x;
        rect.top = rect.bottom - tall * place.scale + place.y;
        rect.bottom += place.y;
        rect.left = middle - half;
        rect.right = middle + half;
      }

      camera.aspect = canvasWidth / canvasHeight;

      // The frame's rectangle, carried into the canvas's pixels.
      const targetTop = padY + height * rect.top;
      const targetHeight = height * (rect.bottom - rect.top);

      // The fit is solved at the rest pose whatever the product has been turned
      // to, so a window resize mid-spin cannot resize the product with it.
      const turned = pivot.rotation.clone();
      pivot.rotation.set(0, 0, 0);

      // Stand back until the packaging measures the rectangle's height. Four
      // passes rather than one formula: distance and projected size feed each
      // other, and the ratio converges on the first two.
      let distance =
        plane.getSize(new Vector3()).y /
        (rect.bottom - rect.top) /
        2 /
        Math.tan((FIELD_OF_VIEW * Math.PI) / 360);
      for (let pass = 0; pass < 4; pass++) {
        // The lens is long, so the camera stands a long way back — further
        // than any fixed far plane reaches once the product is large in world
        // units. The clip range rides the distance instead.
        camera.near = distance / 20;
        camera.far = distance * 4;
        camera.position.set(0, 0, distance);
        camera.lookAt(0, 0, 0);
        camera.clearViewOffset();
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        const shot = project(plane, canvasWidth, canvasHeight);
        distance *= (shot.y1 - shot.y0) / targetHeight;
      }

      // Where that product has to land: a shift of the frustum, not a turn of
      // the camera. Turning it would keystone the bag; a shifted frustum is a
      // shift lens and leaves the product square to the viewer.
      target = {
        x: padX + width * ((rect.left + rect.right) / 2),
        y: targetTop + targetHeight * (0.5 + FIT_NUDGE_Y),
        width: canvasWidth,
        height: canvasHeight,
        left: FRAME_MARGIN - canvasLeft,
        right: window.innerWidth - canvasLeft - FRAME_MARGIN,
      };

      pivot.rotation.copy(turned);
      reframe();

      renderer.setPixelRatio(
        Math.min(Math.max(window.devicePixelRatio, MIN_PIXEL_RATIO), 2),
      );
      renderer.setSize(canvasWidth, canvasHeight, false);
      dirty = true;
    };

    /* One frame. Cheap when nothing is moving, which is most of the time. */
    frame.current = () => {
      if (!model || !onScreen || document.hidden) return;

      // Sink with the scroll: 0 at the top of the page, SCROLL_DROP product
      // heights once the hero has scrolled its own height away.
      if (hero && !reduced && productHeight) {
        const box = hero.getBoundingClientRect();
        const away = Math.min(1, Math.max(0, -box.top / box.height));
        const gap = -away * SCROLL_DROP * productHeight - drift.position.y;
        if (Math.abs(gap) > productHeight * 1e-4) {
          drift.position.y += gap * SCROLL_EASE;
          dirty = true;
        }
      }

      // The entrance: below and turned until the page is ready, then up into
      // place on an ease-out cubic.
      if (!introDone && productHeight) {
        const t =
          introStart === null
            ? 0
            : Math.min(
                1,
                Math.max(0, (performance.now() - introStart) / INTRO.duration),
              );
        const left = Math.pow(1 - t, 3);
        intro.position.y = -left * INTRO.rise * productHeight;
        intro.rotation.set(0, left * INTRO.turn, left * INTRO.roll);
        introDone = t >= 1;
        dirty = true;
      }

      if (spin) {
        drag.yaw = clamp(drag.yaw + spin, POINTER.yawLimit);
        spin = Math.abs(spin) > POINTER.restSpin ? spin * POINTER.friction : 0;
        dirty = true;
      }

      // Each piece on its own, about its own centre: the lift (only the one
      // under the pointer) with its twist, and the lean toward the cursor at
      // the piece's own rate, so the two never move as one block.
      for (const piece of pieces) {
        const liftGap = (hovered === piece ? 1 : 0) - piece.lift;
        const yawGap = lean.yaw * piece.leanBy - piece.lean.yaw;
        const pitchGap = lean.pitch * piece.leanBy - piece.lean.pitch;
        if (
          Math.abs(liftGap) < LIFT.rest &&
          Math.abs(piece.speed) < LIFT.rest &&
          Math.abs(yawGap) < POINTER.restAngle &&
          Math.abs(pitchGap) < POINTER.restAngle
        )
          continue;
        piece.speed = (piece.speed + liftGap * LIFT.stiffness) * LIFT.damping;
        piece.lift += piece.speed;
        piece.lean.yaw += yawGap * piece.leanEase;
        piece.lean.pitch += pitchGap * piece.leanEase;
        piece.node.position.y =
          piece.base + piece.lift * piece.by * productHeight;
        piece.node.rotation.set(
          piece.lean.pitch,
          piece.lean.yaw + piece.lift * piece.turn,
          piece.lift * piece.roll,
        );
        dirty = true;
      }

      // The whole product answers only the hand; the cursor's lean is per
      // piece, above.
      const yaw = clamp(drag.yaw, POINTER.yawLimit);
      const pitch = clamp(drag.pitch, POINTER.pitchLimit);
      const dYaw = yaw - shown.yaw;
      const dPitch = pitch - shown.pitch;

      if (
        Math.abs(dYaw) > POINTER.restAngle ||
        Math.abs(dPitch) > POINTER.restAngle
      ) {
        shown.yaw += dYaw * POINTER.ease;
        shown.pitch += dPitch * POINTER.ease;
        dirty = true;
      }

      if (!dirty) return;
      pivot.rotation.set(shown.pitch, shown.yaw, 0);
      reframe();
      renderer.render(scene, camera);
      dirty = false;
    };

    /**
     * Measures the product as the file composes it and fits the camera to it.
     * Runs once, at load, while the stage is still at rest — the panel's
     * transform is laid on afterwards by `applyStage` and never re-measured.
     */
    const measure = () => {
      if (!model) return;
      // Measured on its own, at rest — off the pivot, which the pointer turns.
      model.removeFromParent();
      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);
      model.updateWorldMatrix(true, true);
      const box = new Box3().setFromObject(model);
      const span = box.getSize(new Vector3());
      const centre = box.getCenter(new Vector3());

      // Tell the bag from the cup by height — the bag is the taller — so each
      // lifts on its own rate. The turn above is about the vertical, so a
      // piece's own `y` is still straight up.
      const sized = model.children.map((node) => ({
        node,
        height: new Box3().setFromObject(node).getSize(new Vector3()).y,
      }));
      const tallest = Math.max(...sized.map((piece) => piece.height));
      pieces = sized.map(({ node, height }): Piece => {
        const role = height === tallest ? "bag" : "cup";
        return {
          node,
          role,
          base: node.position.y,
          ...LIFT[role],
          lift: 0,
          speed: 0,
          leanBy: LEAN[role].by,
          leanEase: LEAN[role].ease,
          lean: { yaw: 0, pitch: 0 },
        };
      });
      hovered = null;

      // Local position is applied after local rotation, so this lands the
      // product's own centre — not the exporter's origin — on the pivot,
      // which is the point everything turns about.
      model.position.set(
        -(box.min.x + span.x * ((PRODUCT.left + PRODUCT.right) / 2)),
        -(box.max.y - span.y * ((PRODUCT.top + PRODUCT.bottom) / 2)),
        -centre.z,
      );
      pivot.add(model);
      pivot.updateWorldMatrix(true, true);

      // The product's own box, in world units, now that the mesh is placed.
      const world = new Box3().setFromObject(pivot);
      const reach = world.getSize(new Vector3());
      const back = world.min.z;
      const front = world.min.z + reach.z * PRODUCT_DEPTH;
      const left = world.min.x + reach.x * PRODUCT.left;
      const right = world.min.x + reach.x * PRODUCT.right;
      const bottom = world.max.y - reach.y * PRODUCT.bottom;
      const top = world.max.y - reach.y * PRODUCT.top;

      plane = new Box3(
        new Vector3(left, bottom, front),
        new Vector3(right, top, front),
      );
      productHeight = top - bottom;
      // Full depth, not the fit plane's: the cup stands forward of the bag,
      // so a box that stopped at the bag's own depth did not contain it and
      // let it swing off the screen when the product turned.
      solid = new Box3(
        new Vector3(left, bottom, back),
        new Vector3(right, top, world.max.z),
      );

      fit();
    };

    /**
     * Lays the panel's transform over the fitted product. Position is in
     * product heights, so it means the same at every window size; rotation
     * and scale are about the product's own centre, where the pivot sits.
     */
    const applyStage = () => {
      const [x, y, z] = layout.position;
      const [rx, ry, rz] = layout.rotation;
      stage.position.set(x * productHeight, y * productHeight, z * productHeight);
      stage.rotation.set(rx * DEG, ry * DEG, rz * DEG);
      stage.scale.setScalar(layout.scale);
      dirty = true;
    };

    controls.current = {
      apply: (next) => {
        layout = next;
        applyStage();
      },
    };

    /* Which piece the pointer is over, by a ray through the canvas — the
       handle is one rectangle for the whole product, so it cannot say. */
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const pick = (event: MouseEvent) => {
      if (!model) return;
      const box = canvas.getBoundingClientRect();
      ndc.set(
        ((event.clientX - box.left) / box.width) * 2 - 1,
        -((event.clientY - box.top) / box.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      let node: Object3D | null =
        raycaster.intersectObject(model, true)[0]?.object ?? null;
      while (node && node.parent !== model) node = node.parent;
      const next = pieces.find((piece) => piece.node === node) ?? null;
      if (next !== hovered) {
        hovered = next;
        dirty = true;
        onPieceRef.current?.(next?.role ?? null);
      }
    };

    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    const loader = new GLTFLoader().setDRACOLoader(draco);

    loader.load(
      src,
      (gltf) => {
        if (disposed) return;
        // The file's default scene is an empty one exported ahead of the scene
        // the cup is actually in, so the scene is picked by what it holds
        // rather than by the file's own default.
        const holdsMesh = (root: Group) => {
          let found = false;
          root.traverse((node) => {
            if ((node as Mesh).isMesh) found = true;
          });
          return found;
        };
        model = gltf.scenes.find(holdsMesh) ?? gltf.scene;

        // Normal maps at their true strength. The loader stores glTF's green
        // channel flipped (a negative y), so each sign is kept.
        model.traverse((node) => {
          const mesh = node as Mesh;
          if (!mesh.isMesh) return;
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          for (const material of materials) {
            const { normalScale } = material as MeshStandardMaterial;
            normalScale?.set(
              Math.sign(normalScale.x) * NORMAL_STRENGTH,
              Math.sign(normalScale.y) * NORMAL_STRENGTH,
            );
          }
        });

        const loaded = model;
        // Every piece is re-hung from a plain holder at its own centre, so the
        // hover lift and the cursor lean turn each piece about its own middle
        // — whatever nesting, axis conversions and unit scales the exporter
        // left inside (the cup carries a Sketchfab Z-up turn and a ×100 × 0.01
        // pair).
        loaded.updateWorldMatrix(true, true);
        for (const node of [...loaded.children]) {
          const centre = new Box3()
            .setFromObject(node)
            .getCenter(new Vector3());
          const holder = new Group();
          holder.name = node.name;
          holder.position.copy(centre);
          loaded.add(holder);
          node.position.sub(centre);
          holder.add(node);
        }
        measure();
        applyStage();

        // Opt-in: the panel only appears with `?panel` in the address.
        if (HERO_PANEL && new URLSearchParams(window.location.search).has("panel"))
          setSnapshot({ layout, file: DEFAULT_HERO_LAYOUT });
      },
      undefined,
      (error) => {
        /* A missing model leaves the frame empty; the page still stands. The
           loader also routes anything the success path throws through here, so
           it is reported rather than swallowed. */
        console.error("hero model", error);
      },
    );

    const observer = new ResizeObserver(fit);
    observer.observe(mount);

    const watcher = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    watcher.observe(mount);

    // Coming back to the tab: the context may have been dropped while away.
    const onVisible = () => {
      dirty = true;
    };
    document.addEventListener("visibilitychange", onVisible);
    canvas.addEventListener("webglcontextrestored", onVisible);

    const motion = window.matchMedia(REDUCED_MOTION_QUERY);
    const onMotionChange = (event: MediaQueryListEvent) => {
      reduced = event.matches;
      if (reduced) {
        lean.yaw = 0;
        lean.pitch = 0;
        spin = 0;
      }
    };
    motion.addEventListener("change", onMotionChange);

    /* Grabbing the product. Pointer capture rather than window listeners, so a
       drag that runs off the frame still belongs to the product until it ends. */
    const handle = surface.current;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onDown = (event: PointerEvent) => {
      dragging = true;
      spin = 0;
      lastX = event.clientX;
      lastY = event.clientY;
      // Capture can be refused for a pointer the browser no longer tracks; the
      // drag still works from the handle's own moves, so this must not throw.
      try {
        handle?.setPointerCapture(event.pointerId);
      } catch {}
    };

    const onDrag = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      drag.yaw = clamp(drag.yaw + dx * POINTER.dragPerPixel, POINTER.yawLimit);
      drag.pitch = clamp(
        drag.pitch + dy * POINTER.dragPerPixel,
        POINTER.pitchLimit,
      );
      // The last sample is the throw; under reduced motion there is none.
      spin = reduced ? 0 : dx * POINTER.dragPerPixel;
      dirty = true;
    };

    const onUp = (event: PointerEvent) => {
      dragging = false;
      try {
        handle?.releasePointerCapture(event.pointerId);
      } catch {}
    };

    /* Only the piece under the pointer lifts. It is the same rectangle the
       drag and the card answer, so all three arrive as one gesture; the ray
       then says which piece inside it the pointer is actually on. */
    const onEnter = (event: MouseEvent) => pick(event);
    const onLeave = () => {
      hovered = null;
      dirty = true;
      onPieceRef.current?.(null);
    };
    const onMove = (event: PointerEvent) => {
      onDrag(event);
      if (!dragging) pick(event);
    };

    handle?.addEventListener("mouseenter", onEnter);
    handle?.addEventListener("mouseleave", onLeave);
    handle?.addEventListener("pointerdown", onDown);
    handle?.addEventListener("pointermove", onMove);
    handle?.addEventListener("pointerup", onUp);
    handle?.addEventListener("pointercancel", onUp);

    /* The idle lean, measured against the whole section the way the page's
       other pointer-aware pieces are. It rides on top of whatever the hand has
       already turned, so the two never fight over the same angle. */
    const section = mount.closest("section");

    const onSectionMove = (event: PointerEvent) => {
      if (dragging || reduced) return;
      const box = section?.getBoundingClientRect();
      if (!box) return;
      const nx = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
      const ny =
        (event.clientY - (box.top + box.height / 2)) / (box.height / 2);
      lean.yaw = clamp(nx, 1) * POINTER.lean.yaw;
      lean.pitch = -clamp(ny, 1) * POINTER.lean.pitch;
      dirty = true;
    };

    const onSectionLeave = () => {
      lean.yaw = 0;
      lean.pitch = 0;
      dirty = true;
    };

    section?.addEventListener("pointermove", onSectionMove);
    section?.addEventListener("pointerleave", onSectionLeave);

    return () => {
      disposed = true;
      frame.current = null;
      controls.current = null;
      unsubscribeReady();
      observer.disconnect();
      watcher.disconnect();
      document.removeEventListener("visibilitychange", onVisible);
      canvas.removeEventListener("webglcontextrestored", onVisible);
      motion.removeEventListener("change", onMotionChange);
      handle?.removeEventListener("mouseenter", onEnter);
      handle?.removeEventListener("mouseleave", onLeave);
      handle?.removeEventListener("pointerdown", onDown);
      handle?.removeEventListener("pointermove", onMove);
      handle?.removeEventListener("pointerup", onUp);
      handle?.removeEventListener("pointercancel", onUp);
      section?.removeEventListener("pointermove", onSectionMove);
      section?.removeEventListener("pointerleave", onSectionLeave);
      scene.traverse((node) => {
        const mesh = node as {
          geometry?: { dispose(): void };
          material?: unknown;
        };
        mesh.geometry?.dispose();
        const material = mesh.material;
        for (const one of Array.isArray(material) ? material : [material]) {
          (one as { dispose?: () => void } | undefined)?.dispose?.();
        }
      });
      draco.dispose();
      environment.texture.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [src, surface]);

  return (
    <>
      <div
        ref={host}
        role="img"
        aria-label={alt}
        className="relative size-full"
      />
      {HERO_PANEL && snapshot && (
        <HeroModelPanel
          snapshot={snapshot}
          onApply={(layout) => controls.current?.apply(layout)}
        />
      )}
    </>
  );
};
