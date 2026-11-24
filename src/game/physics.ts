import { findClosestRoutePoint, sampleRouteAtS, type BuildingFootprint, type MerkatoWorldData } from '../data/merkatoRoutes';
import type { AiVehicle } from './models/livingMarket';

export interface MinibusPhysicsState {
  x: number;
  z: number;
  heading: number; // 0 = -Z (North), +PI/2 = +X (East)
  speed: number; // m/s (+ forward, - reverse)
  steerAngle: number; // radians (+ left, - right)
  pitch: number;
  roll: number;
  routeS: number;
  offRouteDist: number;
  wheelSpinAccum: number;
  isBraking: boolean;
  isReversing: boolean;
}

export interface DrivingInput {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
}

export interface CollisionEvent {
  severity: number; // 0..1
  kind: 'building' | 'traffic' | 'parked';
}

// Toyota HiAce loaded minibus specs:
// Wheelbase ~ 2.58m, max wheel angle ~ 36 deg -> ~4.4m turning radius (clears tight Merkato corners & U-turns!)
const WHEELBASE = 2.58;
const MAX_STEER_RAD = (36 * Math.PI) / 180;
const MAX_FORWARD_MS = 12.8; // ~46 km/h top speed in dense market
const MAX_REVERSE_MS = -4.2; // ~15 km/h reverse
const ACCEL_RATE = 6.2; // Loaded van pull
const BRAKE_DECEL = 11.5; // Firm loaded-van braking
const COAST_DRAG = 2.4;
const VEHICLE_HALF_W = 0.88;
const VEHICLE_HALF_L = 2.25;

export function createInitialPhysics(world: MerkatoWorldData): MinibusPhysicsState {
  const startStop = world.stops[0];
  return {
    x: startStop.curbX,
    z: startStop.curbZ,
    heading: startStop.heading,
    speed: 0,
    steerAngle: 0,
    pitch: 0,
    roll: 0,
    routeS: startStop.s,
    offRouteDist: 2.3,
    wheelSpinAccum: 0,
    isBraking: false,
    isReversing: false,
  };
}

function resolveCircleVsOrientedBox(
  px: number,
  pz: number,
  pr: number,
  b: BuildingFootprint
): { hit: boolean; nx: number; nz: number; pen: number } {
  // Fast broad-phase radius check
  const dx = px - b.cx;
  const dz = pz - b.cz;
  if (dx * dx + dz * dz > (b.radius + pr + 2) ** 2) {
    return { hit: false, nx: 0, nz: 0, pen: 0 };
  }

  const hw = Math.min(34, b.width * 0.86) * 0.5;
  const hd = Math.min(28, b.depth * 0.86) * 0.5;
  const cos = Math.cos(b.angle);
  const sin = Math.sin(b.angle);
  // Rotate world offset into building local frame (note building rotated by -b.angle around Y)
  const lx = dx * cos - dz * sin;
  const lz = dx * sin + dz * cos;

  const clx = Math.max(-hw, Math.min(hw, lx));
  const clz = Math.max(-hd, Math.min(hd, lz));
  const ox = lx - clx;
  const oz = lz - clz;
  const dSq = ox * ox + oz * oz;
  if (dSq >= pr * pr) {
    return { hit: false, nx: 0, nz: 0, pen: 0 };
  }

  let lnx = 0;
  let lnz = 0;
  let pen = 0;
  if (dSq > 1e-6) {
    const d = Math.sqrt(dSq);
    lnx = ox / d;
    lnz = oz / d;
    pen = pr - d;
  } else {
    // Inside box -> push out shortest axis
    const pxOverlap = hw - Math.abs(lx);
    const pzOverlap = hd - Math.abs(lz);
    if (pxOverlap < pzOverlap) {
      lnx = lx >= 0 ? 1 : -1;
      pen = pxOverlap + pr;
    } else {
      lnz = lz >= 0 ? 1 : -1;
      pen = pzOverlap + pr;
    }
  }

  // Rotate normal back to world XZ
  const wnx = lnx * cos + lnz * sin;
  const wnz = -lnx * sin + lnz * cos;
  return { hit: true, nx: wnx, nz: wnz, pen };
}

export function stepMinibusPhysics(
  state: MinibusPhysicsState,
  input: DrivingInput,
  dt: number,
  world: MerkatoWorldData,
  aiVehicles: AiVehicle[],
  parkedColliders: { x: number; z: number; radius: number }[],
  doorLockedOpen: boolean
): CollisionEvent | null {
  // Cannot drive away while passenger sliding door is open!
  const effectiveThrottle = doorLockedOpen ? false : input.throttle;
  const effectiveBrake = doorLockedOpen ? true : input.brake;

  // Steering input (+left, -right)
  const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const speedRatio = Math.min(1, Math.abs(state.speed) / MAX_FORWARD_MS);
  const dynamicMaxSteer = MAX_STEER_RAD * (1 - 0.32 * speedRatio);
  const steerRate = steerTarget === 0 ? 7.5 : 4.6;
  state.steerAngle += (steerTarget * dynamicMaxSteer - state.steerAngle) * Math.min(1, steerRate * dt);

  // Acceleration, braking, then reverse (S/Down brakes to 0 first, then reverses smoothly)
  const prevSpeed = state.speed;
  state.isBraking = false;
  state.isReversing = false;

  if (effectiveThrottle) {
    if (state.speed < -0.2) {
      state.speed = Math.min(0, state.speed + BRAKE_DECEL * dt);
      state.isBraking = true;
    } else {
      state.speed = Math.min(MAX_FORWARD_MS, state.speed + ACCEL_RATE * dt);
    }
  } else if (effectiveBrake) {
    if (state.speed > 0.25) {
      state.speed = Math.max(0, state.speed - BRAKE_DECEL * dt);
      state.isBraking = true;
    } else if (!doorLockedOpen) {
      state.speed = Math.max(MAX_REVERSE_MS, state.speed - ACCEL_RATE * 0.68 * dt);
      state.isReversing = true;
    } else {
      state.speed = 0;
    }
  } else {
    if (Math.abs(state.speed) < 0.08) {
      state.speed = 0;
    } else {
      const sign = Math.sign(state.speed);
      state.speed -= sign * COAST_DRAG * dt;
      if (Math.sign(state.speed) !== sign) state.speed = 0;
    }
  }

  // Loaded-van pitch & roll suspension feel
  const accelMs2 = (state.speed - prevSpeed) / Math.max(0.005, dt);
  const targetPitch = Math.max(-0.04, Math.min(0.04, -accelMs2 * 0.0032));
  const targetRoll = Math.max(-0.045, Math.min(0.045, -state.steerAngle * state.speed * 0.0075));
  state.pitch += (targetPitch - state.pitch) * Math.min(1, 8 * dt);
  state.roll += (targetRoll - state.roll) * Math.min(1, 8 * dt);

  // Bicycle kinematics
  if (Math.abs(state.speed) > 0.01) {
    const angularVel = (state.speed / WHEELBASE) * Math.tan(state.steerAngle);
    // Note: heading = 0 is -Z, +PI/2 is +X; turning left (+steerAngle) decreases heading
    state.heading -= angularVel * dt;
    const fwdX = Math.sin(state.heading);
    const fwdZ = -Math.cos(state.heading);
    state.x += fwdX * state.speed * dt;
    state.z += fwdZ * state.speed * dt;
    state.wheelSpinAccum = (state.speed * dt) / 0.34;
  } else {
    state.wheelSpinAccum = 0;
  }

  // Clamp within outer Merkato perimeter
  state.x = Math.max(-690, Math.min(580, state.x));
  state.z = Math.max(-420, Math.min(420, state.z));

  // Two-circle collision envelope for the 4.5m x 1.76m van (front sphere + rear sphere)
  const fwdX = Math.sin(state.heading);
  const fwdZ = -Math.cos(state.heading);
  const probes: [number, number][] = [
    [state.x + fwdX * (VEHICLE_HALF_L - 0.95), state.z + fwdZ * (VEHICLE_HALF_L - 0.95)],
    [state.x - fwdX * (VEHICLE_HALF_L - 0.95), state.z - fwdZ * (VEHICLE_HALF_L - 0.95)],
  ];
  const probeR = VEHICLE_HALF_W + 0.05;

  let collision: CollisionEvent | null = null;

  // Check building footprints
  for (const b of world.buildings) {
    if (b.kind === 'mosque' || b.kind === 'church') {
      // Use tighter hero facade core collision for mosque/church plazas
      const heroR = b.kind === 'mosque' ? 32 : 20;
      const dx = state.x - b.cx;
      const dz = state.z - b.cz;
      const dist = Math.hypot(dx, dz);
      if (dist < heroR + probeR && dist > 0.01) {
        const pen = heroR + probeR - dist;
        state.x += (dx / dist) * pen;
        state.z += (dz / dist) * pen;
        const sev = Math.min(1, Math.abs(state.speed) / 8);
        if (sev > 0.14) collision = { severity: sev, kind: 'building' };
        state.speed *= 0.35;
      }
      continue;
    }

    for (const [px, pz] of probes) {
      const res = resolveCircleVsOrientedBox(px, pz, probeR, b);
      if (res.hit) {
        state.x += res.nx * res.pen;
        state.z += res.nz * res.pen;
        const sev = Math.min(1, Math.abs(state.speed) / 8);
        if (sev > 0.14 && (!collision || sev > collision.severity)) {
          collision = { severity: sev, kind: 'building' };
        }
        state.speed *= 0.35;
      }
    }
  }

  // Check AI vehicles
  for (const v of aiVehicles) {
    if (!v.active) continue;
    for (const [px, pz] of probes) {
      const dx = px - v.x;
      const dz = pz - v.z;
      const d = Math.hypot(dx, dz);
      const minD = probeR + 1.15;
      if (d < minD && d > 0.001) {
        const pen = minD - d;
        state.x += (dx / d) * pen;
        state.z += (dz / d) * pen;
        const sev = Math.min(1, Math.abs(state.speed - v.currentSpeed) / 7);
        if (sev > 0.16 && (!collision || sev > collision.severity)) {
          collision = { severity: sev, kind: 'traffic' };
        }
        state.speed *= 0.3;
        v.currentSpeed = 0;
      }
    }
  }

  // Check parked vehicles & handcarts
  for (const pc of parkedColliders) {
    for (const [px, pz] of probes) {
      const dx = px - pc.x;
      const dz = pz - pc.z;
      const d = Math.hypot(dx, dz);
      const minD = probeR + pc.radius;
      if (d < minD && d > 0.001) {
        const pen = minD - d;
        state.x += (dx / d) * pen;
        state.z += (dz / d) * pen;
        const sev = Math.min(1, Math.abs(state.speed) / 7);
        if (sev > 0.15 && (!collision || sev > collision.severity)) {
          collision = { severity: sev, kind: 'parked' };
        }
        state.speed *= 0.35;
      }
    }
  }

  // Update route progress S
  const closest = findClosestRoutePoint(world.route, state.x, state.z, state.routeS);
  state.routeS = closest.s;
  state.offRouteDist = closest.dist;

  return collision;
}

export function recoverToNearestRoute(state: MinibusPhysicsState, world: MerkatoWorldData): void {
  const closest = findClosestRoutePoint(world.route, state.x, state.z, state.routeS);
  const pt = sampleRouteAtS(world.route, closest.s);
  const rightX = Math.cos(pt.heading);
  const rightZ = Math.sin(pt.heading);
  state.x = pt.x + rightX * 1.4;
  state.z = pt.z + rightZ * 1.4;
  state.heading = pt.heading;
  state.speed = 0;
  state.steerAngle = 0;
  state.pitch = 0;
  state.roll = 0;
  state.routeS = pt.s;
  state.offRouteDist = 1.4;
}
