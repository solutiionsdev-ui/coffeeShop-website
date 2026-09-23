"use client";

import { useEffect, useRef } from "react";
import {
  Box3,
  DirectionalLight,
  Fog,
  Group,
  InstancedMesh,
  type Material,
  Matrix4,
  type Mesh,
  NeutralToneMapping,
  type Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  type Texture,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { useLoop } from "@/hooks/animation/use-render-loop";

import {
  createField,
  stepField,
  type Field,
  type FieldView,
  type FieldWorld,
} from "./bean-field";
import { CUP_ANCHOR } from "./cup-anchor";

/* ════════════ TUNING — everything adjustable lives here ════════════ */

/** The camera. A moderate lens: enough convergence for the beans' depth to
    read, not so much that the cup keystones at the frame's edge. */
const VIEW = { fov: 30, distance: 20 };

/**
 * The depth band the beans float in, world z. The cup stands at 0 and is about
 * 1.7 units deep at its widest, so the band starts behind its back face: the
 * beans drift behind the cup and never through it.
 */
const DEPTH = { near: -3, far: -12 };

const BEANS = {
  /** How many, per tier — a phone pays for every one in fill and physics. */
  desktop: 34,
  mobile: 16,
  /** A bean's length at scale 1, as a fraction of the view's height at the
      cup. The beans stand further back than the cup, so this runs large to
      keep them the size they read at on screen. */
  length: 0.07,
  /** Scale range. Log-uniform, so small and large are equally common. */
  scale: { min: 0.55, max: 1.7 },
};

const CUP = {
  /** Turns the printed wordmark to the lens. */
  yaw: Math.PI + 1.2,
  /** Lean to the right, radians. */
  tilt: 0.21,
  /** Height against the board's cup box. Under 1: the takeaway cup is much
      wider than the photographed one, so at the box's full height it crowded
      the headline. */
  scale: 0.92,
  /** How far below the box's bottom the cup's foot sits, as a share of its
      height — the part the section's bottom edge cuts off. */
  drop: 0.2,
  /** Radius of the capsule the beans bounce off, as a share of its height. */
  capsule: 0.36,
  /** How far it turns toward the pointer, radians. */
  lean: { yaw: 0.26, pitch: 0.1 },
  /** How quickly it follows, per second. */
  follow: 4,
  /** Turn about its own (tilted) vertical axis across the section's scroll,
      radians, centred so the wordmark faces the lens mid-section. */
  spin: Math.PI * 1.2,
  /** How quickly the turn catches up with the scroll, per second. */
  spinFollow: 6,
  /** Entrance: it rises this share of its height into place, at this rate. */
  rise: 1.1,
  riseRate: 2.4,
};

/**
 * The light: a baked room for reflections plus a warm key and a rim, so the
 * beans' roasted surface and the cup's wordmark both read on the dark field.
 */
const LIGHT = {
  exposure: 1.15,
  environment: 0.55,
  key: { colour: 0xfff1e0, intensity: 2.4, position: [-5, 6, 7] },
  rim: { colour: 0xffd9b0, intensity: 1.6, position: [5, 3, -6] },
} as const;

/** Far beans sink into the section's own ground (`--color-background`). */
const FOG = { colour: 0x070707, start: 4, end: 24 };

/**
 * The scroll vortex. Scrolling sets the air wheeling about the view's centre,
 * the beans' depth band midway: `strength` is the swirl at `fullSpeed` px/s
 * of scroll (world units per second squared), and `follow` how quickly it
 * builds and dies away, per second. Scrolling down turns it one way, up the
 * other.
 */
const VORTEX = { strength: 2.4, fullSpeed: 1600, follow: 3 };

/** The cursor's movement fades from the air this fast once it stops, per second. */
const POINTER_SETTLE = 8;
/** Caps the cursor speed handed to the physics, world units per second. */
const POINTER_MAX_SPEED = 24;

/** Frame budget on a phone: the physics is fixed-step, so this only thins
    the drawing, not the motion. */
const MOBILE_FRAME = 1000 / 30;

/** What the file's meshes are told apart by. */
const CUP_MATERIAL = "CupCoffee";
const BEAN_MATERIAL = "COFFEE_MAT";

const DRACO_PATH = "/draco/";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/* ═══════════════════════════════════════════════════════════════════ */

const materialsOf = (mesh: Mesh): Material[] =>
  Array.isArray(mesh.material) ? mesh.material : [mesh.material];

const meshesOf = (root: Object3D) => {
  const found: Mesh[] = [];
  root.traverse((node) => {
    if ((node as Mesh).isMesh) found.push(node as Mesh);
  });
  return found;
};

/** A scene holding the cup and nothing else. */
const isCupOnly = (root: Object3D) => {
  const meshes = meshesOf(root);
  return (
    meshes.length > 0 &&
    meshes.every((mesh) =>
      materialsOf(mesh).every((material) =>
        material.name.startsWith(CUP_MATERIAL),
      ),
    )
  );
};

const disposeTree = (root: Object3D) => {
  for (const mesh of meshesOf(root)) {
    mesh.geometry.dispose();
    for (const material of materialsOf(mesh)) {
      for (const value of Object.values(material)) {
        if ((value as Texture | null)?.isTexture) (value as Texture).dispose();
      }
      material.dispose();
    }
  }
};

export interface PhilosophySceneProps {
  /** The .glb holding the cup alone in one scene and a bean in another. */
  src: string;
}

/**
 * The philosophy block's 3D layer: coffee beans floating weightless across
 * the whole section, and the hero's takeaway cup standing where the board puts
 * its cup, leaning right and cut by the section's bottom edge.
 *
 * One canvas for both, so the beans bounce off the cup rather than passing
 * through it. It sits over the scrim and under the copy. The cup's place comes
 * from the layout, not from here: the section marks the board's cup box with
 * `CUP_ANCHOR`, and the scene projects that box into the world on every resize.
 *
 * The beans are one instanced mesh — one draw call however many there are —
 * and the physics lives in `bean-field.ts`. Drawing runs off the app's shared
 * ticker and stops when the section is off screen or the tab is hidden. Under
 * reduced motion nothing moves: the beans hang where they were scattered and
 * the cup stands in place.
 */
export const PhilosophyScene = ({ src }: PhilosophySceneProps) => {
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<((time: number) => void) | null>(null);

  useLoop((time) => frame.current?.(time), { framerate: 0 });

  useEffect(() => {
    const mount = host.current;
    const section = mount?.closest("section");
    if (!mount || !section) return;
    const mark = section.querySelector<HTMLElement>(`[${CUP_ANCHOR}]`);

    // Tiered once: a device does not change what it is mid-visit.
    const mobile =
      window.innerWidth < 768 ||
      window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    mount.appendChild(canvas);

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        canvas,
        alpha: true,
        antialias: !mobile,
        stencil: false,
        powerPreference: mobile ? "default" : "high-performance",
      });
    } catch {
      // No WebGL: the section stands without its 3D layer.
      canvas.remove();
      return;
    }

    renderer.setClearAlpha(0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NeutralToneMapping;
    renderer.toneMappingExposure = LIGHT.exposure;

    const scene = new Scene();
    scene.fog = new Fog(
      FOG.colour,
      VIEW.distance + FOG.start,
      VIEW.distance + FOG.end,
    );
    const camera = new PerspectiveCamera(VIEW.fov, 1, 1, 60);
    camera.position.set(0, 0, VIEW.distance);
    camera.lookAt(0, 0, 0);

    const pmrem = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    room.dispose();
    scene.environment = environment.texture;
    scene.environmentIntensity = LIGHT.environment;

    for (const { colour, intensity, position } of [LIGHT.key, LIGHT.rim]) {
      const light = new DirectionalLight(colour, intensity);
      light.position.set(position[0], position[1], position[2]);
      scene.add(light);
    }

    /** Carries the cup's place on the page, its size, tilt and lean. Its
        content is a unit-tall cup centred on the origin. */
    const cup = new Group();
    cup.visible = false;
    scene.add(cup);
    /** The scroll turn, under the tilt so it spins the cup about its own
        axis rather than the world's vertical. */
    const spin = new Group();
    cup.add(spin);
    let turned = 0;

    const tanHalf = Math.tan((VIEW.fov * Math.PI) / 360);
    const view: FieldView = {
      distance: VIEW.distance,
      tanHalf,
      aspect: 1,
      near: DEPTH.near,
      far: DEPTH.far,
    };
    const world: FieldWorld = {
      view,
      pointer: {
        active: false,
        origin: new Vector3(),
        direction: new Vector3(),
        velocity: new Vector3(),
      },
      obstacle: null,
      vortex: {
        centre: new Vector3(0, 0, (DEPTH.near + DEPTH.far) / 2),
        strength: 0,
      },
    };
    const capsule = { a: new Vector3(), b: new Vector3(), radius: 0 };
    /** Last frame's scroll position, for the vortex; null after a gap. */
    let lastScroll: number | null = null;

    /** Where the board's cup box lands in the world, from the last fit. */
    const place = { x: 0, bottom: 0, height: 0, shown: false };
    /** The pointer across the section, -1..1 each way, for the cup's lean. */
    const aim = { x: 0, y: 0 };
    const lean = { yaw: 0, pitch: 0 };
    let rise = reduced ? 0 : 1;

    let field: Field | null = null;
    let beans: InstancedMesh | null = null;
    let cupReady = false;
    let ready = false;
    let disposed = false;
    let dirty = true;
    let onScreen = false;
    let last = 0;
    let lastDraw = 0;
    const loaded: Object3D[] = [];

    const poseCup = () => {
      cup.visible = cupReady && place.shown;
      cup.scale.setScalar(place.height || 1);
      cup.position.set(
        place.x,
        place.bottom + place.height / 2 - rise * place.height * CUP.rise,
        0,
      );
      cup.rotation.set(lean.pitch, lean.yaw, -CUP.tilt);
      cup.updateMatrixWorld();

      if (!cup.visible) {
        world.obstacle = null;
        return;
      }
      // The capsule runs up the cup's own axis, so it tilts and leans with it.
      capsule.radius = place.height * CUP.capsule;
      capsule.a.set(0, -0.5 + CUP.capsule, 0).applyMatrix4(cup.matrixWorld);
      capsule.b.set(0, 0.5 - CUP.capsule, 0).applyMatrix4(cup.matrixWorld);
      world.obstacle = capsule;
    };

    let fittedWidth = 0;
    const fit = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      // On touch, a height-only change is the URL bar folding away; rebuilding
      // the framebuffer for it flashes the canvas mid-scroll.
      if (mobile && fittedWidth === width && ready) return;
      fittedWidth = width;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      view.aspect = camera.aspect;
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, mobile ? 1 : 1.5),
      );
      renderer.setSize(width, height, false);

      if (mark) {
        const box = mount.getBoundingClientRect();
        const cell = mark.getBoundingClientRect();
        place.shown = cell.height > 0;
        if (place.shown) {
          // World units per pixel at the cup's depth, where z is 0.
          const unit = (2 * VIEW.distance * tanHalf) / height;
          place.height = cell.height * unit * CUP.scale;
          place.x = (cell.left + cell.width / 2 - box.left - width / 2) * unit;
          place.bottom =
            (box.top + height / 2 - cell.bottom) * unit -
            place.height * CUP.drop;
        }
      }
      poseCup();
      dirty = true;
    };

    const matrix = new Matrix4();
    const scale = new Vector3();
    const writeBeans = () => {
      if (!field || !beans) return;
      field.beans.forEach((bean, i) => {
        matrix.compose(bean.position, bean.rotation, scale.setScalar(bean.size));
        beans?.setMatrixAt(i, matrix);
      });
      beans.instanceMatrix.needsUpdate = true;
    };

    const ray = new Vector3();
    frame.current = (time) => {
      if (!ready || !onScreen || document.hidden) {
        last = 0;
        lastScroll = null;
        return;
      }
      if (mobile && time - lastDraw < MOBILE_FRAME) return;
      const dt = last ? Math.min(0.05, (time - last) / 1000) : 0;
      last = time;
      lastDraw = time;

      if (!reduced && dt > 0) {
        const { pointer } = world;
        if (pointer.active) {
          ray
            .set(aim.x, aim.y, 0.5)
            .unproject(camera)
            .sub(camera.position)
            .normalize();
          pointer.origin.copy(camera.position);
          pointer.direction.copy(ray);
        }
        pointer.velocity.multiplyScalar(Math.exp(-POINTER_SETTLE * dt));

        const follow = 1 - Math.exp(-CUP.follow * dt);
        const aimed = pointer.active ? 1 : 0;
        lean.yaw += (aim.x * aimed * CUP.lean.yaw - lean.yaw) * follow;
        lean.pitch += (-aim.y * aimed * CUP.lean.pitch - lean.pitch) * follow;
        rise *= Math.exp(-CUP.riseRate * dt);

        // Scroll turn: 0 as the section's top enters, 1 as its bottom leaves.
        const box = section.getBoundingClientRect();
        const travel = Math.min(
          1,
          Math.max(
            0,
            (window.innerHeight - box.top) / (window.innerHeight + box.height),
          ),
        );
        turned +=
          ((travel - 0.5) * CUP.spin - turned) *
          (1 - Math.exp(-CUP.spinFollow * dt));
        spin.rotation.y = turned;
        poseCup();

        // Scroll speed → vortex, eased so it builds and dies away smoothly.
        const scrollNow = window.scrollY;
        const scrollSpeed =
          lastScroll === null ? 0 : (scrollNow - lastScroll) / dt;
        lastScroll = scrollNow;
        const swirl =
          Math.max(-1, Math.min(1, scrollSpeed / VORTEX.fullSpeed)) *
          VORTEX.strength;
        world.vortex.strength +=
          (swirl - world.vortex.strength) * (1 - Math.exp(-VORTEX.follow * dt));

        if (field) stepField(field, dt, world);
        dirty = true;
      }

      if (!dirty) return;
      writeBeans();
      renderer.render(scene, camera);
      dirty = false;
    };

    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    const loader = new GLTFLoader().setDRACOLoader(draco);

    loader.load(
      src,
      (gltf) => {
        if (disposed) {
          gltf.scenes.forEach(disposeTree);
          return;
        }
        loaded.push(...gltf.scenes);

        const cupScene = gltf.scenes.find(isCupOnly);
        if (cupScene) {
          cupScene.rotation.set(0, CUP.yaw, 0);
          cupScene.updateWorldMatrix(true, true);
          const box = new Box3().setFromObject(cupScene);
          const size = box.getSize(new Vector3());
          cupScene.position.sub(box.getCenter(new Vector3()));
          const unit = new Group();
          unit.scale.setScalar(1 / (size.y || 1));
          unit.add(cupScene);
          spin.add(unit);
          cupReady = true;
        }

        const bean = gltf.scenes
          .flatMap(meshesOf)
          .find((mesh) =>
            materialsOf(mesh).some((material) => material.name === BEAN_MATERIAL),
          );
        if (bean) {
          // Baked to a unit-long bean centred on its own middle, so every
          // instance scales and turns about the right point.
          bean.updateWorldMatrix(true, false);
          const geometry = bean.geometry.clone().applyMatrix4(bean.matrixWorld);
          geometry.computeBoundingBox();
          const bounds = geometry.boundingBox ?? new Box3();
          const centre = bounds.getCenter(new Vector3());
          const longest = Math.max(...bounds.getSize(new Vector3()).toArray()) || 1;
          geometry.translate(-centre.x, -centre.y, -centre.z);
          geometry.scale(1 / longest, 1 / longest, 1 / longest);

          beans = new InstancedMesh(
            geometry,
            bean.material,
            mobile ? BEANS.mobile : BEANS.desktop,
          );
          // The physics moves every instance; the shared bounds would not.
          beans.frustumCulled = false;
          scene.add(beans);
        }

        fit();
        if (beans) {
          field = createField(
            beans.count,
            {
              base: BEANS.length * 2 * VIEW.distance * tanHalf,
              ...BEANS.scale,
            },
            world,
          );
          writeBeans();
        }

        // Prewarm, while the section is still far off screen: upload every
        // texture, link every program, then draw one real frame.
        //
        // Linking alone was not enough — measured on a cold GPU cache, the
        // first draw on arrival still stalled 225-425 ms: three checks the link
        // status synchronously on first use, and the GPU builds its pipeline
        // for the draw, not the link. The same first draw also allocated the
        // canvas's drawing buffer (~70 ms). `compileAsync` waits on the parallel
        // compile without blocking the thread, and the throwaway frame then
        // takes both costs here instead of mid-scroll. The cup is posed at rest
        // for it, so it is inside the frustum and actually drawn.
        for (const mesh of meshesOf(scene)) {
          for (const material of materialsOf(mesh)) {
            for (const value of Object.values(material)) {
              if ((value as Texture | null)?.isTexture)
                renderer.initTexture(value as Texture);
            }
          }
        }
        renderer.compileAsync(scene, camera).then(() => {
          if (disposed) return;
          const entering = rise;
          rise = 0;
          poseCup();
          renderer.render(scene, camera);
          rise = entering;
          poseCup();
          ready = true;
          dirty = true;
        });
      },
      undefined,
      (error) => {
        console.error("philosophy scene", error);
      },
    );

    let queued = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(fit);
    });
    observer.observe(mount);

    const watcher = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        dirty = true;
      },
      { rootMargin: "10% 0px" },
    );
    watcher.observe(mount);

    const onVisible = () => {
      dirty = true;
    };
    document.addEventListener("visibilitychange", onVisible);
    canvas.addEventListener("webglcontextrestored", onVisible);

    /* The cursor. Nothing reacts until it has actually moved — an unmoved
       pointer would otherwise sit dead centre and punch a hole in the field. */
    let lastMove = { x: 0, y: 0, t: 0 };
    const scratch = new Vector3();
    const onMove = (event: PointerEvent) => {
      const box = mount.getBoundingClientRect();
      aim.x = ((event.clientX - box.left) / box.width) * 2 - 1;
      aim.y = -(((event.clientY - box.top) / box.height) * 2 - 1);

      const elapsed = (event.timeStamp - lastMove.t) / 1000;
      if (world.pointer.active && elapsed > 0 && elapsed < 0.1) {
        const unit = (2 * VIEW.distance * tanHalf) / box.height;
        scratch.set(
          ((event.clientX - lastMove.x) / elapsed) * unit,
          -((event.clientY - lastMove.y) / elapsed) * unit,
          0,
        );
        world.pointer.velocity.lerp(scratch, 0.5).clampLength(0, POINTER_MAX_SPEED);
      }
      lastMove = { x: event.clientX, y: event.clientY, t: event.timeStamp };
      world.pointer.active = true;
    };
    const onLeave = () => {
      world.pointer.active = false;
      aim.x = 0;
      aim.y = 0;
    };

    section.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerdown", onMove, { passive: true });
    section.addEventListener("pointerleave", onLeave, { passive: true });
    section.addEventListener("pointercancel", onLeave, { passive: true });

    return () => {
      disposed = true;
      frame.current = null;
      cancelAnimationFrame(queued);
      observer.disconnect();
      watcher.disconnect();
      document.removeEventListener("visibilitychange", onVisible);
      canvas.removeEventListener("webglcontextrestored", onVisible);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerdown", onMove);
      section.removeEventListener("pointerleave", onLeave);
      section.removeEventListener("pointercancel", onLeave);
      beans?.geometry.dispose();
      beans?.dispose();
      loaded.forEach(disposeTree);
      draco.dispose();
      environment.texture.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [src]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-5 transform-gpu backface-hidden"
    />
  );
};
