import { Quaternion, Vector3 } from "three";

/**
 * The physics of the beans floating behind the philosophy block.
 *
 * Plain rigid-body mechanics, no library: each bean is a sphere for collision
 * purposes with a mass that grows with the cube of its size, so a large bean is
 * sluggish and a small one is flicked away. There is no gravity — the beans are
 * weightless — so what keeps them moving is a slow wander of the air around
 * them, and what keeps them from drifting forever is a light drag. The cursor
 * pushes the air out of its way; bean-on-bean and bean-on-cup hits are elastic
 * with surface friction, which is what turns a glancing hit into spin.
 *
 * Units are the scene's world units and seconds. The view at the cup's depth
 * is about eleven units tall.
 */
export const FIELD = {
  /** Fixed physics step. Rendering runs at whatever the display gives; the
      simulation always advances in these slices, so it behaves the same at
      30, 60 or 120 fps. */
  step: 1 / 120,
  /** Most slices one frame may owe — a stalled frame is dropped, not replayed. */
  maxSteps: 8,
  /** The slow drift each bean wanders on, as an acceleration. It is the air
      moving, so it ignores mass. */
  wander: 0.16,
  /** How fast that drift turns, in radians per second, lowest to highest. */
  wanderRate: { min: 0.12, max: 0.34 },
  /** Linear drag, per second. Low: in weightlessness nothing stops quickly. */
  drag: 0.42,
  /** Angular drag, per second. */
  spinDrag: 0.3,
  /** The idle tumble every bean keeps, as an angular acceleration. */
  spinWander: 0.22,
  /** Stiffness of the invisible walls at the frame's edge, per second squared. */
  wall: 4.5,
  /** Share of a bean allowed past the frame's edge before the wall pushes. */
  bleed: 0.6,
  /** Bounce: 0 is clay, 1 a superball. A roasted bean is hard and light. */
  restitution: 0.62,
  /** Surface friction in collisions. */
  friction: 0.35,
  /** The cursor's reach, as a fraction of the view's height at the cup. */
  pointerReach: 0.16,
  /** The cursor's push at point blank, as an acceleration on a bean of mass 1. */
  pointerPush: 26,
  /** How much of the cursor's own movement is handed to the air around it. */
  pointerWake: 1.8,
  /** How much a passing cursor sets a bean spinning. */
  pointerSpin: 3.2,
  /** Caps, so a violent flick cannot fling a bean through a wall. */
  maxSpeed: 7,
  maxSpin: 6,
  /** Collision radius as a fraction of a bean's length: a bean is long and
      flat, and this is the sphere that best stands in for it. */
  radius: 0.36,
  /** Scroll vortex: radius (world units) inside which its swirl builds up to
      full speed, and the share of it that pulls inward, so the beans wheel
      round the centre rather than flying off at a tangent. */
  vortexCore: 3,
  vortexInward: 0.22,
  /** How much of the swirl each bean picks up as spin about the view axis. */
  vortexSpin: 0.35,
} as const;

export interface Bean {
  position: Vector3;
  velocity: Vector3;
  rotation: Quaternion;
  /** Angular velocity, world space, radians per second. */
  spin: Vector3;
  /** Rendered length, world units. */
  size: number;
  /** Collision radius, world units. */
  radius: number;
  /** Relative mass: the cube of the bean's scale. */
  mass: number;
  /** Moment of inertia of the collision sphere. */
  inertia: number;
  /** Phase and rate of the bean's own wander, per axis. */
  phase: [number, number, number];
  rate: [number, number, number];
}

/** The cursor, as a ray from the camera through the pointer. */
export interface FieldPointer {
  active: boolean;
  origin: Vector3;
  direction: Vector3;
  /** How fast the cursor is moving, world units per second. */
  velocity: Vector3;
}

/** A capsule the beans bounce off: a segment and a radius. */
export interface FieldObstacle {
  a: Vector3;
  b: Vector3;
  radius: number;
}

/** The camera's frustum, which is the box the beans live in. */
export interface FieldView {
  distance: number;
  /** tan of half the vertical field of view. */
  tanHalf: number;
  aspect: number;
  /** Depth band, world z; the camera looks down -z. */
  near: number;
  far: number;
}

/** A swirl about an axis parallel to the view, driven from outside. */
export interface FieldVortex {
  centre: Vector3;
  /** Tangential acceleration at full swirl, world units per second squared;
      the sign sets the direction. 0 is still air. */
  strength: number;
}

export interface FieldWorld {
  view: FieldView;
  pointer: FieldPointer;
  obstacle: FieldObstacle | null;
  vortex: FieldVortex;
}

export interface Field {
  beans: Bean[];
  /** Simulated seconds owed to the next step. */
  debt: number;
  time: number;
}

/* Scratch, so the loop allocates nothing. */
const _d = new Vector3();
const _n = new Vector3();
const _t = new Vector3();
const _p = new Vector3();
const _w = new Vector3();
const _a = new Vector3();
const _ri = new Vector3();
const _rj = new Vector3();
const _rel = new Vector3();
const _seg = new Vector3();
const _q = new Quaternion();

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** Half the frame's height at depth `z`. */
const halfHeight = (view: FieldView, z: number) =>
  (view.distance - z) * view.tanHalf;

const randomUnit = (target: Vector3, random: () => number) => {
  const z = random() * 2 - 1;
  const angle = random() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return target.set(r * Math.cos(angle), r * Math.sin(angle), z);
};

/** A uniformly random orientation (Shoemake). */
const randomRotation = (target: Quaternion, random: () => number) => {
  const u1 = random();
  const u2 = random() * Math.PI * 2;
  const u3 = random() * Math.PI * 2;
  const a = Math.sqrt(1 - u1);
  const b = Math.sqrt(u1);
  return target.set(a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3));
};

/** Closest point to `p` on the obstacle's segment, written into `target`. */
const closestOnSegment = (obstacle: FieldObstacle, p: Vector3, target: Vector3) => {
  _seg.subVectors(obstacle.b, obstacle.a);
  const length = _seg.lengthSq();
  const s = length > 0 ? Math.min(1, Math.max(0, _t.subVectors(p, obstacle.a).dot(_seg) / length)) : 0;
  return target.copy(obstacle.a).addScaledVector(_seg, s);
};

/**
 * Scatters `count` beans through the frustum, clear of each other and of the
 * obstacle. Sizes are log-uniform between `min` and `max` times `base`, so
 * small beans are as common as large ones read to the eye.
 */
export const createField = (
  count: number,
  sizes: { base: number; min: number; max: number },
  world: FieldWorld,
  random: () => number = Math.random,
): Field => {
  const beans: Bean[] = [];
  const { view, obstacle } = world;

  for (let i = 0; i < count; i++) {
    const scale = sizes.min * Math.pow(sizes.max / sizes.min, random());
    const size = sizes.base * scale;
    const radius = size * FIELD.radius;
    const mass = scale * scale * scale;
    const position = new Vector3();

    // Rejection sampling: a free spot, or the last try if none turns up.
    for (let attempt = 0; attempt < 40; attempt++) {
      const z = lerp(view.far, view.near, random());
      const half = halfHeight(view, z) * 0.9;
      position.set((random() * 2 - 1) * half * view.aspect, (random() * 2 - 1) * half, z);
      const clearOfBeans = beans.every(
        (other) => other.position.distanceTo(position) > other.radius + radius,
      );
      const clearOfCup =
        !obstacle ||
        closestOnSegment(obstacle, position, _p).distanceTo(position) > obstacle.radius + radius;
      if (clearOfBeans && clearOfCup) break;
    }

    beans.push({
      position,
      velocity: randomUnit(new Vector3(), random).multiplyScalar(lerp(0.08, 0.25, random())),
      rotation: randomRotation(new Quaternion(), random),
      spin: randomUnit(new Vector3(), random).multiplyScalar(lerp(0.15, 0.5, random())),
      size,
      radius,
      mass,
      inertia: 0.4 * mass * radius * radius,
      phase: [random() * 7, random() * 7, random() * 7],
      rate: [
        lerp(FIELD.wanderRate.min, FIELD.wanderRate.max, random()),
        lerp(FIELD.wanderRate.min, FIELD.wanderRate.max, random()),
        lerp(FIELD.wanderRate.min, FIELD.wanderRate.max, random()),
      ],
    });
  }

  return { beans, debt: 0, time: 0 };
};

/** Forces, integration and walls for one bean over one slice. */
const moveBean = (bean: Bean, h: number, time: number, world: FieldWorld) => {
  const { position: p, velocity: v, spin: w, phase, rate } = bean;
  const { view, pointer } = world;
  const inverseMass = 1 / bean.mass;

  // The air's own slow wander.
  _a.set(
    Math.sin(time * rate[0] + phase[0]),
    Math.sin(time * rate[1] + phase[1]),
    0.6 * Math.sin(time * rate[2] + phase[2]),
  ).multiplyScalar(FIELD.wander);

  // Walls: a spring past the frame's edge, which is a frustum, so the box is
  // wider at the back than at the front.
  const halfH = halfHeight(view, p.z);
  const inset = bean.radius * (1 - FIELD.bleed);
  const limitX = halfH * view.aspect - inset;
  const limitY = halfH - inset;
  if (Math.abs(p.x) > limitX) _a.x -= Math.sign(p.x) * (Math.abs(p.x) - limitX) * FIELD.wall;
  if (Math.abs(p.y) > limitY) _a.y -= Math.sign(p.y) * (Math.abs(p.y) - limitY) * FIELD.wall;
  if (p.z > view.near) _a.z -= (p.z - view.near) * FIELD.wall;
  if (p.z < view.far) _a.z += (view.far - p.z) * FIELD.wall;

  // The cursor: a push away from its ray, strongest on the ray and gone at the
  // edge of its reach, plus the wake of its own movement. Both are forces, so a
  // heavy bean answers less.
  if (pointer.active) {
    const reach = FIELD.pointerReach * 2 * view.distance * view.tanHalf;
    _d.subVectors(p, pointer.origin);
    const along = _d.dot(pointer.direction);
    _d.addScaledVector(pointer.direction, -along);
    const distance = _d.length();
    if (along > 0 && distance < reach) {
      const falloff = 1 - distance / reach;
      if (distance > 1e-5) {
        _n.copy(_d).divideScalar(distance);
        _a.addScaledVector(_n, FIELD.pointerPush * falloff * falloff * inverseMass);
        // The push lands on the bean's near face while the air slides past it,
        // which is a torque about the axis across the two.
        _w.crossVectors(_n, pointer.velocity).multiplyScalar(-FIELD.pointerSpin * falloff * inverseMass * h);
        w.add(_w);
      }
      _a.addScaledVector(pointer.velocity, FIELD.pointerWake * falloff * inverseMass);
    }
  }

  // The scroll vortex: air wheeling about the view axis through its centre.
  // It is the air moving, so like the wander it ignores mass. Tangential
  // speed builds linearly out to the core and holds beyond it; a share of it
  // pulls inward so the ring holds together.
  const { vortex } = world;
  if (vortex.strength) {
    const dx = p.x - vortex.centre.x;
    const dy = p.y - vortex.centre.y;
    const r = Math.hypot(dx, dy);
    if (r > 1e-4) {
      const swirl = vortex.strength * Math.min(1, r / FIELD.vortexCore);
      _a.x += (-dy / r) * swirl - (dx / r) * Math.abs(swirl) * FIELD.vortexInward;
      _a.y += (dx / r) * swirl - (dy / r) * Math.abs(swirl) * FIELD.vortexInward;
      w.z += swirl * FIELD.vortexSpin * h;
    }
  }

  v.addScaledVector(_a, h).multiplyScalar(Math.exp(-FIELD.drag * h));
  if (v.lengthSq() > FIELD.maxSpeed * FIELD.maxSpeed) v.setLength(FIELD.maxSpeed);
  p.addScaledVector(v, h);

  // The idle tumble, then drag.
  w.x += Math.sin(time * rate[1] * 0.7 + phase[2]) * FIELD.spinWander * h;
  w.y += Math.sin(time * rate[2] * 0.7 + phase[0]) * FIELD.spinWander * h;
  w.z += Math.sin(time * rate[0] * 0.7 + phase[1]) * FIELD.spinWander * h;
  w.multiplyScalar(Math.exp(-FIELD.spinDrag * h));
  if (w.lengthSq() > FIELD.maxSpin * FIELD.maxSpin) w.setLength(FIELD.maxSpin);

  // Orientation follows the spin, which is world-space, hence premultiply.
  const angle = w.length() * h;
  if (angle > 1e-9) {
    _q.setFromAxisAngle(_w.copy(w).normalize(), angle);
    bean.rotation.premultiply(_q).normalize();
  }
};

/** Elastic hit with friction between two beans that overlap. */
const collide = (i: Bean, j: Bean) => {
  _d.subVectors(j.position, i.position);
  const reach = i.radius + j.radius;
  const distanceSq = _d.lengthSq();
  if (distanceSq >= reach * reach || distanceSq < 1e-12) return;

  const distance = Math.sqrt(distanceSq);
  _n.copy(_d).divideScalar(distance);
  const im = 1 / i.mass;
  const jm = 1 / j.mass;

  // Push apart, lighter bean moving further.
  const correction = (reach - distance) / (im + jm);
  i.position.addScaledVector(_n, -correction * im);
  j.position.addScaledVector(_n, correction * jm);

  // Velocity of each surface at the contact point, spin included.
  _ri.copy(_n).multiplyScalar(i.radius);
  _rj.copy(_n).multiplyScalar(-j.radius);
  _rel
    .copy(j.velocity)
    .add(_t.crossVectors(j.spin, _rj))
    .sub(i.velocity)
    .sub(_p.crossVectors(i.spin, _ri));
  const closing = _rel.dot(_n);
  if (closing >= 0) return;

  const normal = (-(1 + FIELD.restitution) * closing) / (im + jm);

  // Friction: opposes the surfaces sliding, capped by Coulomb's law.
  _t.copy(_rel).addScaledVector(_n, -closing);
  const sliding = _t.length();
  let tangent = 0;
  if (sliding > 1e-6) {
    _t.divideScalar(sliding);
    tangent = Math.min(
      FIELD.friction * normal,
      sliding / (im + jm + (i.radius * i.radius) / i.inertia + (j.radius * j.radius) / j.inertia),
    );
  }

  // Impulse on j; i takes the opposite.
  _p.copy(_n).multiplyScalar(normal).addScaledVector(_t, -tangent);
  i.velocity.addScaledVector(_p, -im);
  j.velocity.addScaledVector(_p, jm);
  i.spin.add(_w.crossVectors(_ri, _p).multiplyScalar(-1 / i.inertia));
  j.spin.add(_w.crossVectors(_rj, _p).multiplyScalar(1 / j.inertia));
};

/** A bean against the cup, which does not move for it. */
const bounceOff = (bean: Bean, obstacle: FieldObstacle) => {
  closestOnSegment(obstacle, bean.position, _p);
  _d.subVectors(bean.position, _p);
  const reach = bean.radius + obstacle.radius;
  const distanceSq = _d.lengthSq();
  if (distanceSq >= reach * reach || distanceSq < 1e-12) return;

  const distance = Math.sqrt(distanceSq);
  _n.copy(_d).divideScalar(distance);
  bean.position.copy(_p).addScaledVector(_n, reach);

  const closing = bean.velocity.dot(_n);
  if (closing >= 0) return;
  // The sliding part rolls the bean along the cup's wall.
  _t.copy(bean.velocity).addScaledVector(_n, -closing);
  bean.spin.addScaledVector(_w.crossVectors(_n, _t), FIELD.friction / bean.radius);
  _t.multiplyScalar(-FIELD.friction);
  bean.velocity.addScaledVector(_n, -(1 + FIELD.restitution) * closing).add(_t);
};

/** Advances the field by `dt` seconds of real time. */
export const stepField = (field: Field, dt: number, world: FieldWorld) => {
  field.debt = Math.min(field.debt + dt, FIELD.step * FIELD.maxSteps);
  const { beans } = field;

  while (field.debt >= FIELD.step) {
    for (const bean of beans) moveBean(bean, FIELD.step, field.time, world);
    for (let i = 0; i < beans.length; i++) {
      for (let j = i + 1; j < beans.length; j++) collide(beans[i], beans[j]);
    }
    if (world.obstacle) for (const bean of beans) bounceOff(bean, world.obstacle);
    field.debt -= FIELD.step;
    field.time += FIELD.step;
  }
};
