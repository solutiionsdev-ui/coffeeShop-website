# Opalesce — an animated WebGL2 gradient

> **Примечание для проекта brewns.** Это спецификация шейдера Opalesce, под которую
> написан `src/components/hero/hero-gradient.tsx`. Шейдер и движок ниже — источник
> правды, править их нельзя: значения в CONFIG рассчитаны под конкретную рампу,
> `tone()` и композит.
>
> **Внимание:** блок «CONFIG» ниже — это ПОСТАВОЧНАЯ палитра автора (сине-серая).
> Для brewns действует кофейный конфиг из раздела «CONFIG проекта» в самом конце
> этого файла. При расхождении выигрывает раздел в конце.

A film a few wavelengths thick over a slow flowing ground — the interference tint multiplies the palette instead of replacing it, and the cursor thickens the film so colour travels out behind the hand.

<!-- intro: authored. Everything below this line is extracted — re-running regenerates it. -->

Recreate this exactly. It is **plain WebGL2** — one fullscreen triangle, one
fragment shader, GLSL ES 3.00. No three.js, no library, no build step, no
dependencies. It drops into any stack as a single `<canvas>`.

## The contract

- **Every transformation happens in the shader.** Per frame the CPU lerps the
  pointer scalars, uploads uniforms and issues one `drawArrays`. No JS
  animation, no CSS animation/filter/transform on the canvas — that is what
  keeps it cheap enough to sit above the fold.
- **One uniform per `CONFIG` key**, named `u` + the capitalised key
  (`colorA` → `uColorA`, `warpScale` → `uWarpScale`). Colours upload as
  `vec3` in 0–1.
- **Engine uniforms:** `iResolution` (device px), `iTime` (seconds,
  accumulated — see below), and `iMouse`, `iMouseVel`, `iMouseWake`.
- `uv` is built as `(gl_FragCoord.xy - 0.5 * iResolution) / iResolution.y`,
  so the field is centred and scaled by height — it reflows rather than
  stretching at any aspect ratio.
- The canvas is **opaque** (`alpha: false`); output is clamped and dithered.
  The dither is not decoration: without it a field this smooth bands visibly on
  an 8-bit display.
- **Device pixel ratio is capped at 1.** Raise it only
  if the look demands it — this is a full-screen fragment shader, and the cost
  is quadratic in DPR.
- **Pointer:** a two-stage lerp — a fast lead (0.105) chased by a slower body (0.043). The pointer is *felt*, not tracked — it trails the
  cursor rather than sticking to it.

## Tinting

The palette is `CONFIG`, and `CONFIG` only. To recolour this, change these
values — **never the shader**. Editing GLSL to change a colour produces mud,
because the ramp is walked perceptually and the stops are placed against each
other, not chosen independently.

Shipped palette: bgColor #08090e · colorA #171a26 · colorB #363c58 · colorC #8e93b4 · colorD #f0f1f8

## CONFIG

```js
const CONFIG = {
  "bgColor": "#08090e",
  "colorA": "#171a26",
  "colorB": "#363c58",
  "colorC": "#8e93b4",
  "colorD": "#f0f1f8",
  "scale": 1.05,
  "speed": 0.33,
  "flow": 0.13,
  "warp": 1.05,
  "warpScale": 0.85,
  "roughness": 0.55,
  "lacunarity": 2.05,
  "thickness": 2.2,
  "iridescence": 0.3,
  "spread": 0.55,
  "sheen": 0.18,
  "contrast": 1.1,
  "midpoint": 0.5,
  "glow": 0.18,
  "sink": 0.15,
  "grain": 0,
  "grainAnim": 0,
  "dither": 1.15,
  "vignette": 0.14,
  "cursor": 1,
  "pointerRadius": 0.55,
  "pointerStrength": 0.8,
  "parallax": 0.0023,
  "maxDpr": 1
}
```

## The fragment shader

```glsl
#version 300 es
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
}
```

## The engine

Boilerplate, pointer rig and render loop, verbatim. The pacing is the part worth
reading: the frame interval is clamped to [4.17, 50] ms and the shader clock
**accumulates** from that clamped value rather than reading wall time — so a
backgrounded tab costs a pause and never a lurch, and every spring below steps
by elapsed time, giving the same follow-lag at 60, 120 and 144 Hz.

```js
const canvas = document.getElementById('gl')
const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' })
if (!gl) {
  document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;inset:0;display:grid;place-items:center;color:#889;font:13px system-ui">WebGL2 is not available in this browser.</p>')
  throw new Error('no webgl2')
}

const VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

/* ======================================================================
   OPALESCE — thin-film interference, kept off the rainbow.
   Thickness comes from a domain-warped field plus the touch, and the tint is the usual
   cosine of thickness read at three slightly different rates per channel. The one
   decision that matters is the composite: the film MULTIPLIES the ramp rather than
   replacing it, because a real thin film only ever tints what is already behind it —
   an additive rainbow over a palette is the tell that gives most iridescence shaders
   away. A fraction of a wavelength is a whole hue step, so the trail reads as colour
   travelling out behind the hand rather than as a brightness smear following it.
   ====================================================================== */
const FRAG = `
  /* ── the fragment shader from "The fragment shader" above, verbatim ── */
`

function compile(type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh))
  return sh
}

const program = gl.createProgram()
gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT))
gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG))
gl.linkProgram(program)
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
gl.useProgram(program)
gl.bindVertexArray(gl.createVertexArray())

const LOC = {}
const loc = n => (n in LOC ? LOC[n] : (LOC[n] = gl.getUniformLocation(program, n)))
const u1f = (n, v) => gl.uniform1f(loc(n), v)
const u2f = (n, x, y) => gl.uniform2f(loc(n), x, y)
const u3c = (n, hex) => { const c = hexToVec3(hex); gl.uniform3f(loc(n), c[0], c[1], c[2]) }

/* ====== CONFIG → UNIFORMS ====== */
function applyConfig() {
  gl.useProgram(program)
  u3c('uBgColor', CONFIG.bgColor)
  u3c('uColorA', CONFIG.colorA)
  u3c('uColorB', CONFIG.colorB)
  u3c('uColorC', CONFIG.colorC)
  u3c('uColorD', CONFIG.colorD)
  u1f('uScale', CONFIG.scale)
  u1f('uSpeed', CONFIG.speed)
  u1f('uFlow', CONFIG.flow)
  u1f('uWarp', CONFIG.warp)
  u1f('uWarpScale', CONFIG.warpScale)
  u1f('uRoughness', CONFIG.roughness)
  u1f('uLacunarity', CONFIG.lacunarity)
  u1f('uThickness', CONFIG.thickness)
  u1f('uIridescence', CONFIG.iridescence)
  u1f('uSpread', CONFIG.spread)
  u1f('uSheen', CONFIG.sheen)
  u1f('uContrast', CONFIG.contrast)
  u1f('uMidpoint', CONFIG.midpoint)
  u1f('uGlow', CONFIG.glow)
  u1f('uSink', CONFIG.sink)
  u1f('uGrain', CONFIG.grain)
  u1f('uGrainAnim', CONFIG.grainAnim)
  u1f('uDither', CONFIG.dither)
  u1f('uVignette', CONFIG.vignette)
  u1f('uPointerRadius', CONFIG.pointerRadius)
  u1f('uPointerStrength', CONFIG.pointerStrength)
  u1f('uParallax', CONFIG.parallax)
  resize()
}

/* ====== RESIZE ====== */
let dpr = 1
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr)
  const w = Math.max(1, Math.round(innerWidth * dpr))
  const h = Math.max(1, Math.round(innerHeight * dpr))
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
  gl.viewport(0, 0, w, h)
  gl.useProgram(program)
  u2f('iResolution', w, h)
}
/* Coalesced to one resize per frame. A window drag or a phone rotation fires resize far
   faster than the display refreshes, and every raw call reallocates the drawing buffer and
   re-uploads iResolution — that burst is the hitch you feel while dragging an edge. */
let resizeQueued = false
addEventListener('resize', () => {
  if (resizeQueued) return
  resizeQueued = true
  requestAnimationFrame(() => { resizeQueued = false; resize() })
}, { passive: true })

/* ====== POINTER (a handful of scalars — the only per-frame CPU maths allowed) ====== */
const mouse = { x: 0, y: 0, ax: 0, ay: 0, wx: 0, wy: 0, tx: 0, ty: 0 }
/* One handler for both events, and it does exactly one job: write the target. Everything
   that moves is integrated in the render loop, so a flick that fires forty events inside a
   single frame costs the same as one that fires one — and a touch aims on contact instead
   of staying dead until the first drag. */
const aim = e => {
  const a = innerWidth / innerHeight
  mouse.tx = (e.clientX / innerWidth - 0.5) * a
  mouse.ty = (0.5 - e.clientY / innerHeight)
}
addEventListener('pointermove', aim, { passive: true })
addEventListener('pointerdown', aim, { passive: true })

/* ====== RENDER LOOP ====== */
/* The loop does exactly four things: step the pointer followers by elapsed time, upload the
   pointer uniforms, draw one triangle, tick the fps readout. Everything else is the shader's job. */

let visible = true
new IntersectionObserver(es => { visible = es[0].isIntersecting }, { threshold: 0 }).observe(canvas)

const t0 = performance.now()
let prevT = t0, clock = 0, fpsT = t0, fpsN = 0
function frame(now) {
  requestAnimationFrame(frame)

  /* PACING — one clamped clock drives everything below it.
     `ms` is the real frame interval pinned to [4.17, 50] and `s` is that interval measured
     in 60 Hz frames, so every ease in this loop advances by elapsed TIME rather than by
     frame count — the same follow-lag on a 60, 120 or 144 Hz panel instead of a chase that
     doubles in speed when the monitor does. The upper clamp on `s` is what stops a dropped
     frame or a GC pause from flinging the chain across the screen in one step, and it sits
     low enough that no follower can overshoot into a wobble. The shader clock is accumulated
     from the SAME clamped interval instead of read off the wall clock — rAF stops in a
     background tab but wall time does not, and handing the shader that gap is exactly what
     makes a field lurch on the way back. Clamped, an alt-tab costs a pause and never a jump. */
  const raw = now - prevT
  prevT = now
  if (!visible || document.hidden) return
  const ms = raw > 50 ? 50 : raw < 4.167 ? 4.167 : raw
  const s = ms > 36.7 ? 2.2 : ms * 0.06
  clock += ms * 0.001

  /* Three poles, not one — a lead, a body and a wake. A single lerp can only decelerate INTO
     its target: a direction change hinges on a corner and the tail of every move reads as
     dead weight. A quick lead node feeds a slower body — the body is what the field follows,
     and it swings through a turn and coasts for a beat after the hand stops. The wake is a
     third node slower again; it is never drawn on its own, it only says where the body WAS,
     which is what lets the shader lay a tapered trail between the two without keeping a frame
     of history anywhere. All three rates scale with `s`, so the lag is identical at 60 Hz and
     at 144. */
  const kLead = 0.105 * s, kBody = 0.043 * s, kWake = 0.017 * s
  mouse.ax += (mouse.tx - mouse.ax) * kLead
  mouse.ay += (mouse.ty - mouse.ay) * kLead
  mouse.x  += (mouse.ax - mouse.x)  * kBody
  mouse.y  += (mouse.ay - mouse.y)  * kBody
  mouse.wx += (mouse.x  - mouse.wx) * kWake
  mouse.wy += (mouse.y  - mouse.wy) * kWake

  u1f('iTime', clock)
  /* cursor 0: the hand is ignored and the pointer eases back to where it rested — the
     gradient goes fully ambient. Nothing else changes, so it can be flipped live. */
  if (mouse.rest === undefined) mouse.rest = { x: mouse.tx, y: mouse.ty }
  if (!CONFIG.cursor) { mouse.tx = mouse.rest.x; mouse.ty = mouse.rest.y }
  u2f('iMouse', mouse.x, mouse.y)
  u2f('iMouseVel', mouse.ax - mouse.x, mouse.ay - mouse.y)
  u2f('iMouseWake', mouse.wx, mouse.wy)
  gl.drawArrays(gl.TRIANGLES, 0, 3)

  fpsN++
  if (now - fpsT > 500) {
    fpsT = now; fpsN = 0
  }
}

applyConfig()
gl.drawArrays(gl.TRIANGLES, 0, 3)        // one draw before the reveal, so we never fade onto a blank canvas
requestAnimationFrame(frame)
```

## Markup

```html
<canvas id="gl"></canvas>
<style>
  html, body { margin: 0; height: 100%; background: #08090e }
  #gl { display: block; width: 100vw; height: 100vh }
</style>
```

---

# CONFIG проекта brewns — источник правды

Эти значения перекрывают блок «CONFIG» выше и трейлинг-список автора.
Использовать ровно их, не подставлять свои.

```js
const CONFIG = {
  "bgColor": "#070707",
  "colorA": "#110b07",
  "colorB": "#2c1a11",
  "colorC": "#6e3e22",
  "colorD": "#c69b6e",
  "scale": 0.5,
  "speed": 0.07,
  "flow": 0.11,
  "warp": 1.25,
  "warpScale": 0.75,
  "roughness": 0.45,
  "lacunarity": 2,
  "thickness": 1.2,
  "iridescence": 0.1,
  "spread": 0.28,
  "sheen": 0.05,
  "contrast": 1.35,
  "midpoint": 0.54,
  "glow": 0.08,
  "sink": 0.35,
  "grain": 0.045,
  "grainAnim": 1,
  "dither": 1.55,
  "vignette": 0.26,
  "cursor": 0,
  "pointerRadius": 0.75,
  "pointerStrength": 0.15,
  "parallax": 0.0015,
  "maxDpr": 1.5
}
```

## Известные пробелы в спеке автора

Три вещи, которые придётся дописать при интеграции — в оригинальном документе
их нет, это не повод «улучшать» шейдер:

1. **`hexToVec3` не определена.** В движке она вызывается в `u3c`, но объявления
   нет. Реализовать тривиально:
   ```js
   const hexToVec3 = h => {
     const s = h.replace('#', '')
     return [parseInt(s.slice(0,2),16)/255, parseInt(s.slice(2,4),16)/255, parseInt(s.slice(4,6),16)/255]
   }
   ```
2. **`CONFIG.cursor` — не uniform.** Он обрабатывается только в JS, в цикле
   рендера. Не добавлять для него `u1f`.
3. **`iMouseVel` объявлен в шейдере, но не используется.** `getUniformLocation`
   для него вернёт `null` после оптимизации — это нормально, `gl.uniform2f(null, …)`
   безопасен. Не удалять из кода.

## Правки движка под секционный, а не полноэкранный канвас

Оригинал занимает весь вьюпорт. Для hero-секции нужно:

- `resize()` читает `canvas.clientWidth` / `canvas.clientHeight`, а не
  `innerWidth` / `innerHeight`;
- `ResizeObserver` на контейнер вместо window-события `resize` (коалесинг
  в один вызов на кадр сохранить);
- в `aim()` координаты через `canvas.getBoundingClientRect()`, аспект из
  `rect.width / rect.height`;
- при `cursor: 0` обработчик указателя можно не вешать вовсе.

## Замечания по параметрам

- **`vignette` множит в абсолютный ноль, а не в `bgColor`.** При 0.26 углы
  уедут примерно в `#050505`. Если по периметру hero проступит тёмный ореол —
  снижать виньетку до 0.15 и добирать `sink` до 0.45.
- **`contrast` определяет, какие стопы вообще участвуют.** При `base ∈ [0.3, 0.7]`
  и `contrast: 1.35` рабочий диапазон `f` примерно `[0.19, 0.72]`. Переход к
  `colorD` начинается со `smoothstep(0.66, 1.0, f)` — то есть при contrast ниже
  ~0.9 четвёртый стоп не участвует вообще.
- **`midpoint` работает контринтуитивно:** выше значение — темнее картинка.
- **`sink` подмешивает `bgColor` в тени,** но в композите стоит пол
  `* 0.90 + 0.10` — полностью в фон градиент не уйдёт никогда.
