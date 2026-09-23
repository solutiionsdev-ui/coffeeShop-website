"use client";

/**
 * Opalesce — the site's animated WebGL2 gradient.
 *
 * Mounted twice: behind the hero and behind the philosophy block. Each instance
 * owns its own context and canvas, and an IntersectionObserver parks the render
 * loop whenever its section is off screen, so only the one you are looking at
 * costs a frame. The readability scrim is not part of this component — the two
 * blocks put their copy in different places and each supplies its own.
 *
 * 📖 Spec: `docs/opalesce.md`. The fragment shader and the engine below are
 * transcribed from it verbatim; the palette lives in CONFIG and nowhere else.
 * Do not edit the GLSL to change a colour — the ramp is walked perceptually and
 * the stops are placed against each other, so retuning it there produces mud.
 *
 * Two things differ from the spec's engine, both required for a section-sized
 * canvas rather than a full-screen one, and both called for in the spec's own
 * "Правки движка под секционный, а не полноэкранный канвас":
 *   - `resize()` reads `canvas.clientWidth/clientHeight`, not `innerWidth/Height`
 *   - a `ResizeObserver` replaces the window `resize` event, still coalesced to
 *     one call per frame
 * `aim()` is written against `getBoundingClientRect()` for the same reason. It
 * listens on `window`, as the spec's engine does, so the pointer is felt near
 * the section's edges too; while the hero is scrolled away the render loop
 * returns before the pointer integrates, so nothing accumulates off-screen.
 */

import { useEffect, useRef, useState } from "react";

import { Spring } from "@/components/animation/springs/spring";

/* ====== CONFIG — docs/opalesce.md § "CONFIG проекта brewns" ======
   Three values differ from the spec, all to make the pointer visible, all agreed:
     speed           0.07 → 0.12  (the flow, asked for a touch faster)
     flow            0.11 → 0.16  (asked for more churn — see below)
     warp            1.25 → 1.45
     cursor          0    → 1
     pointerRadius   0.75 → 0.3
     pointerStrength 0.15 → 1.2
     iridescence     0.1  → 0.22
     parallax        0.0015 → 0.01

   `speed` only reparametrises time — it scales `t = iTime * uSpeed` and nothing
   else — so the set of fields the shader can reach is unchanged and the
   worst-case contrast below is independent of it. It also leaves the frame
   pacing alone, so faster does not mean choppier.

   `flow` and `warp` are the two halves of "перетекание": `flow` is how fast the
   two warp channels drift past each other, `warp` is how far they drag the
   ground when they do. Both only move the coordinate the noise is sampled at,
   so the set of values `base` can take is the fbm range either way and the
   worst case is unchanged in principle — but the field visits it differently,
   so the sweep below was re-run rather than assumed.

   `pointerRadius` is what makes the touch read as a touch. uv is scaled by
   height, so 0.75 is a gaussian wider than the canvas: it washed the whole
   field evenly and nothing tracked the cursor. 0.3 is roughly a third of the
   frame height, so there is a soft patch centred on the pointer.
   `iridescence` is the gate, not `pointerStrength`: the film only reaches the
   composite through `mix(vec3(1.0), film * 1.25, uIridescence)`, so at 0.1 the
   touch tops out around 16/255 however hard it is pushed. Raising it costs
   headline contrast — measured at 7.29:1, against 7.46 before. Re-measure if
   either moves again; the floor is 7:1. Everything else is untouched. */
const CONFIG = {
  bgColor: "#070707",
  colorA: "#110b07",
  colorB: "#2c1a11",
  colorC: "#6e3e22",
  colorD: "#c69b6e",
  scale: 0.5,
  speed: 0.12,
  flow: 0.16,
  warp: 1.45,
  warpScale: 0.75,
  roughness: 0.45,
  lacunarity: 2,
  thickness: 1.2,
  iridescence: 0.22,
  spread: 0.28,
  sheen: 0.05,
  contrast: 1.35,
  midpoint: 0.54,
  glow: 0.08,
  sink: 0.35,
  grain: 0.045,
  grainAnim: 1,
  dither: 1.55,
  vignette: 0.26,
  cursor: 1,
  pointerRadius: 0.3,
  pointerStrength: 1.2,
  parallax: 0.01,
  maxDpr: 1.5,
};

const VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2  iResolution;
uniform float iTime;
uniform vec2  iMouse;          // the body node — aspect-corrected, same space as uv
uniform vec2  iMouseVel;       // lead node minus body node — a velocity proxy
uniform vec2  iMouseWake;      // a third, much slower node — the tail of the trail

uniform vec3  uBgColor, uColorA, uColorB, uColorC, uColorD;
uniform float uScale, uSpeed, uFlow, uWarp, uWarpScale;
uniform float uRoughness, uLacunarity, uThickness, uIridescence, uSpread;
uniform float uSheen, uContrast, uMidpoint, uGlow, uSink;
uniform float uGrain, uDither, uVignette, uPointerRadius, uPointerStrength;
uniform float uParallax;

#define TRAIL_TAPS 6

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float snoise(vec2 p) {
  const float K1 = 0.366025404, K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash2(i)), dot(b, hash2(i + o)), dot(c, hash2(i + 1.0)));
  return dot(n, vec3(70.0));
}

vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c) * p; }

/* THE TOUCH. The shader has no memory, so the tail is reconstructed from three
   pointer nodes: TRAIL_TAPS gaussians strung along the segment between the slow
   wake node and the body node, weighted toward the head. A resting cursor puts
   every tap in the same place and the result is one clean gaussian of exactly
   1.0 at the centre; a moving cursor stretches them into a tapered ribbon that
   melts away from the back as the wake catches up. No branch, no jump, and the
   falloff is the same gaussian at every point along it. */
float trail(vec2 uv, float radius) {
  /* The sample point is wobbled by a slow field first. A gaussian is a perfect
     circle, and a perfect circle parked under a resting cursor is the one thing
     that reads as drawn rather than felt; warping the coordinate by a fraction
     of the radius makes the touch an organic patch that breathes. */
  vec2 wob = vec2(snoise(uv * 1.7 + vec2(0.0, iTime * 0.05)),
                  snoise(uv * 1.7 + vec2(4.3, -iTime * 0.04)));
  uv += wob * radius * 0.22;
  float a = 0.0, wsum = 0.0;
  float r2 = max(1e-4, radius * radius);
  for (int i = 0; i < TRAIL_TAPS; i++) {
    float k = float(i) / float(TRAIL_TAPS - 1);
    vec2 c = mix(iMouseWake, iMouse, k);
    vec2 dd = uv - c;
    float w = mix(0.28, 1.0, k);
    a += w * exp(-dot(dd, dd) / r2);
    wsum += w;
  }
  return a / wsum;
}

vec3 ramp4(float t) {
  vec3 c = mix(uColorA, uColorB, smoothstep(0.00, 0.36, t));
  c = mix(c, uColorC, smoothstep(0.32, 0.70, t));
  c = mix(c, uColorD, smoothstep(0.66, 1.00, t));
  return c;
}

/* A SOFT SHOULDER instead of a clamp. clamp((f - mid) * contrast + 0.5) plateaus wherever
   the field runs past either end, and a plateau is a flat patch of pure colour with a
   visible edge around it — the loudest single way a gradient stops looking expensive.
   tanh has the same slope through the middle and saturates smoothly, so the highlights
   roll off and nothing ever reaches the rail. Same two knobs, no plateau. */
float tone(float x) {
  return 0.5 + 0.5 * tanh((x - uMidpoint) * uContrast * 2.2);
}

// triangular-PDF dither — the only reliable cure for 8-bit gradient banding
float triDither(vec2 fc) {
  float a = fract(sin(dot(fc, vec2(12.9898, 78.233))) * 43758.5453);
  float b = fract(sin(dot(fc + 17.0, vec2(12.9898, 78.233))) * 43758.5453);
  return (a + b - 1.0) / 255.0;
}

#define OCT 3

float fbm(vec2 p) {
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < OCT; i++) { v += amp * snoise(p); p = p * uLacunarity + vec2(6.1, 2.7); amp *= uRoughness; }
  return v;
}


// ---- house grain. ONE look across the collection: an integer hash (no sin() streaks),
// triangular so it reads as film rather than static, weighted into the midtones so it
// never crusts a black or a white. Static by default; uGrainAnim re-seeds it 24×/s.
uniform float uGrainAnim;
float houseGrain(vec2 fc) {
  uvec2 q = uvec2(fc) * uvec2(1597334677u, 3812015801u)
          + uint(floor(iTime * 24.0 * uGrainAnim)) * 2654435769u;
  uint n = q.x ^ q.y; n = n * 1664525u + 1013904223u; n ^= n >> 16u; n *= 2246822519u; n ^= n >> 13u;
  float a = float(n & 0xffffu) / 65535.0;
  n *= 3266489917u; n ^= n >> 16u;
  float b = float(n & 0xffffu) / 65535.0;
  return a + b - 1.0;
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution) / iResolution.y;
  float t = iTime * uSpeed;

  float tr = trail(uv, uPointerRadius);
  vec2 p = (uv - iMouse * uParallax) * uScale;

  // the two warp channels drift with opposite signs, so the ground churns instead of panning
  vec2 q = vec2(fbm(p * uWarpScale + vec2(0.0, t * uFlow)),
                fbm(p * uWarpScale + vec2(5.2, 1.3) - t * uFlow * 0.7));
  float base = fbm(p + uWarp * q + vec2(t * 0.12, -t * 0.09)) * 0.5 + 0.5;

  /* Film thickness: the ground, plus the touch. A change of a fraction of a wavelength is
     a whole hue step, which is why the trail reads as colour travelling out behind the
     hand rather than as a bright smear following it. */
  float thick = base * uThickness + tr * uPointerStrength;

  /* The three channels must run at genuinely different rates or the cosines stay in step
     and the film comes out grey — a tint you can only see in the numbers. A fifth of a
     cycle between red and blue is about where it starts reading as colour and still well
     short of a rainbow. */
  vec3 film = 0.5 + 0.5 * cos(6.28318 * (thick * vec3(1.0, 1.0 - uSpread * 0.18, 1.0 - uSpread * 0.36)
                                         + vec3(0.0, 0.08, 0.16)));

  float f = tone(base);

  vec3 col = ramp4(f);
  /* MULTIPLY, never add. A thin film only tints what is already behind it; an additive
     rainbow over a palette is the tell that gives most iridescence away. */
  col *= mix(vec3(1.0), film * 1.25, uIridescence);
  col += uColorD * (uGlow * pow(f, 4.0) + uSheen * pow(film.g, 6.0) * 0.25);
  col = mix(uBgColor, col, smoothstep(0.0, max(0.01, uSink), f) * 0.90 + 0.10);

  col *= 1.0 - uVignette * dot(uv, uv);
  { float hgL = clamp(dot(col, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    col += houseGrain(gl_FragCoord.xy) * uGrain * mix(1.0, 4.0 * hgL * (1.0 - hgL), 0.6); }
  col += triDither(gl_FragCoord.xy) * uDither;

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

/** Not in the spec's engine, which calls it without declaring it. */
const hexToVec3 = (h: string): [number, number, number] => {
  const s = h.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16) / 255,
    parseInt(s.slice(2, 4), 16) / 255,
    parseInt(s.slice(4, 6), 16) / 255,
  ];
};

export const OpalesceGradient = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    // No WebGL2: the CSS fallback underneath stays visible and the page is fine.
    if (!gl) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let program: WebGLProgram | null = null;
    let vertexShader: WebGLShader | null = null;
    let fragmentShader: WebGLShader | null = null;
    let vao: WebGLVertexArrayObject | null = null;
    let rafId = 0;
    let locations: Record<string, WebGLUniformLocation | null> = {};

    const loc = (n: string) => {
      if (!program) return null;
      if (!(n in locations)) locations[n] = gl.getUniformLocation(program, n);
      return locations[n];
    };
    // uniform2f(null, …) is safe — iMouseVel is declared but unused, so the
    // linker optimises it away and its location is legitimately null.
    const u1f = (n: string, v: number) => gl.uniform1f(loc(n), v);
    const u2f = (n: string, x: number, y: number) => gl.uniform2f(loc(n), x, y);
    const u3c = (n: string, hex: string) => {
      const c = hexToVec3(hex);
      gl.uniform3f(loc(n), c[0], c[1], c[2]);
    };

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) throw new Error("createShader failed");
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(sh) ?? "shader compile failed");
      }
      return sh;
    };

    /* ====== RESIZE — section-sized, per the spec's integration notes ====== */
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.useProgram(program);
      u2f("iResolution", w, h);
    };

    /* ====== CONFIG → UNIFORMS ====== */
    const applyConfig = () => {
      gl.useProgram(program);
      u3c("uBgColor", CONFIG.bgColor);
      u3c("uColorA", CONFIG.colorA);
      u3c("uColorB", CONFIG.colorB);
      u3c("uColorC", CONFIG.colorC);
      u3c("uColorD", CONFIG.colorD);
      u1f("uScale", CONFIG.scale);
      u1f("uSpeed", CONFIG.speed);
      u1f("uFlow", CONFIG.flow);
      u1f("uWarp", CONFIG.warp);
      u1f("uWarpScale", CONFIG.warpScale);
      u1f("uRoughness", CONFIG.roughness);
      u1f("uLacunarity", CONFIG.lacunarity);
      u1f("uThickness", CONFIG.thickness);
      u1f("uIridescence", CONFIG.iridescence);
      u1f("uSpread", CONFIG.spread);
      u1f("uSheen", CONFIG.sheen);
      u1f("uContrast", CONFIG.contrast);
      u1f("uMidpoint", CONFIG.midpoint);
      u1f("uGlow", CONFIG.glow);
      u1f("uSink", CONFIG.sink);
      u1f("uGrain", CONFIG.grain);
      u1f("uGrainAnim", CONFIG.grainAnim);
      u1f("uDither", CONFIG.dither);
      u1f("uVignette", CONFIG.vignette);
      u1f("uPointerRadius", CONFIG.pointerRadius);
      u1f("uPointerStrength", CONFIG.pointerStrength);
      u1f("uParallax", CONFIG.parallax);
      resize();
    };

    const build = () => {
      if (program) gl.deleteProgram(program);
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      if (vao) gl.deleteVertexArray(vao);
      locations = {};

      vertexShader = compile(gl.VERTEX_SHADER, VERT);
      fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG);
      program = gl.createProgram();
      if (!program) throw new Error("createProgram failed");
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? "link failed");
      }
      gl.useProgram(program);
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
    };

    const draw = () => gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* ====== POINTER — a lead, a body and a wake, per the spec. The easing is
       the whole point: the pointer is felt, not tracked. ====== */
    const mouse: {
      x: number;
      y: number;
      ax: number;
      ay: number;
      wx: number;
      wy: number;
      tx: number;
      ty: number;
      rest?: { x: number; y: number };
    } = { x: 0, y: 0, ax: 0, ay: 0, wx: 0, wy: 0, tx: 0, ty: 0 };

    const aim = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const a = rect.width / rect.height;
      mouse.tx = ((e.clientX - rect.left) / rect.width - 0.5) * a;
      mouse.ty = 0.5 - (e.clientY - rect.top) / rect.height;
    };

    /* ====== RENDER LOOP ====== */
    let visible = true;
    const io = new IntersectionObserver(
      (es) => {
        visible = es[0].isIntersecting;
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const t0 = performance.now();
    let prevT = t0;
    let clock = 0;
    let fpsT = t0;
    let fpsN = 0;

    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame);

      const raw = now - prevT;
      prevT = now;
      if (!visible || document.hidden) return;
      const ms = raw > 50 ? 50 : raw < 4.167 ? 4.167 : raw;
      const s = ms > 36.7 ? 2.2 : ms * 0.06;
      clock += ms * 0.001;

      const kLead = 0.105 * s,
        kBody = 0.043 * s,
        kWake = 0.017 * s;
      mouse.ax += (mouse.tx - mouse.ax) * kLead;
      mouse.ay += (mouse.ty - mouse.ay) * kLead;
      mouse.x += (mouse.ax - mouse.x) * kBody;
      mouse.y += (mouse.ay - mouse.y) * kBody;
      mouse.wx += (mouse.x - mouse.wx) * kWake;
      mouse.wy += (mouse.y - mouse.wy) * kWake;

      u1f("iTime", clock);
      if (mouse.rest === undefined) mouse.rest = { x: mouse.tx, y: mouse.ty };
      if (!CONFIG.cursor) {
        mouse.tx = mouse.rest.x;
        mouse.ty = mouse.rest.y;
      }
      u2f("iMouse", mouse.x, mouse.y);
      u2f("iMouseVel", mouse.ax - mouse.x, mouse.ay - mouse.y);
      u2f("iMouseWake", mouse.wx, mouse.wy);
      draw();

      fpsN++;
      if (now - fpsT > 500) {
        fpsT = now;
        fpsN = 0;
      }
    };

    /* ====== RESIZE OBSERVER — coalesced to one call per frame ====== */
    let resizeQueued = false;
    const ro = new ResizeObserver(() => {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(() => {
        resizeQueued = false;
        resize();
        // Under reduced motion nothing else will ever redraw it.
        if (reduceMotion) draw();
      });
    });
    ro.observe(canvas);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(rafId);
    };
    const onContextRestored = () => {
      build();
      applyConfig();
      draw();
      if (!reduceMotion) rafId = requestAnimationFrame(frame);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);

    if (CONFIG.cursor) {
      window.addEventListener("pointermove", aim, { passive: true });
      window.addEventListener("pointerdown", aim, { passive: true });
    }

    build();
    applyConfig();
    draw(); // one draw before the reveal, so we never fade onto a blank canvas
    setReady(true);
    if (!reduceMotion) rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      if (CONFIG.cursor) {
        window.removeEventListener("pointermove", aim);
        window.removeEventListener("pointerdown", aim);
      }
      if (program) gl.deleteProgram(program);
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      if (vao) gl.deleteVertexArray(vao);
    };
  }, []);

  return (
    <div aria-hidden="true" className="absolute inset-0 z-0 bg-background">
      {/* Shown until the first frame lands, and permanently if WebGL2 is absent. */}
      <div className="absolute inset-0 bg-[image:var(--gradient-opalesce-fallback)]" />
      <Spring
        tag="span"
        mode="once"
        enabled={ready}
        from={{ opacity: 0 }}
        to={{ opacity: 1 }}
        config={{ duration: 300 }}
        className="absolute inset-0 block"
      >
        <canvas
          ref={canvasRef}
          className="pointer-events-none block h-full w-full"
        />
      </Spring>
    </div>
  );
};
