import * as THREE from 'three';
import { sampleRouteAtS, type MerkatoWorldData } from '../../data/merkatoRoutes';
import type { TextureBundle } from '../textures';

export type TrafficDensity = 'low' | 'normal' | 'busy';

export interface AiVehicle {
  group: THREE.Group;
  x: number;
  z: number;
  heading: number;
  s: number;
  baseSpeed: number;
  currentSpeed: number;
  laneOffset: number;
  brakeLightMat: THREE.MeshStandardMaterial;
  active: boolean;
}

export interface PedestrianActor {
  group: THREE.Group;
  baseX: number;
  baseZ: number;
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  span: number;
  phase: number;
  speed: number;
  isCrossing: boolean;
  scaredTimer: number;
  knockedTimer: number;
  hitCooldown: number;
  vx: number;
  vz: number;
  fallRot: number;
  spinAngle: number;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
}

export interface StopPassengerCluster {
  stopId: string;
  group: THREE.Group;
  peds: THREE.Group[];
  setVisibleCount: (n: number) => void;
  setBoardingProgress: (t: number) => void;
}

export interface LivingMarketSystem {
  group: THREE.Group;
  aiVehicles: AiVehicle[];
  pedestrians: PedestrianActor[];
  parkedColliders: { x: number; z: number; radius: number }[];
  stopClusters: Map<string, StopPassengerCluster>;
  setDensity: (density: TrafficDensity) => void;
  triggerHornReaction: (px: number, pz: number) => void;
  knockPedestrian: (ped: PedestrianActor, impulseX: number, impulseZ: number, speedMs: number) => void;
  update: (
    dt: number,
    playerX: number,
    playerZ: number,
    playerSpeedMs: number,
    elapsed: number
  ) => void;
  dispose: () => void;
}

function createCompactVehicle(
  kind: 'minibus' | 'lada' | 'isuzu',
  shadowTex: THREE.Texture
): { group: THREE.Group; brakeLightMat: THREE.MeshStandardMaterial } {
  const g = new THREE.Group();
  const bodyColor = kind === 'minibus' ? 0x1685d8 : kind === 'lada' ? 0x2563eb : 0xe5e7eb;
  const topColor = kind === 'minibus' ? 0xf3f4f6 : kind === 'lada' ? 0xf8fafc : 0xd97706;

  const lowerMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.42, metalness: 0.18 });
  const upperMat = new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.48, metalness: 0.1 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: 0.88 });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: 0xa61b1b,
    emissive: 0xff2211,
    emissiveIntensity: 0.2,
  });

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 4.6),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.45 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  g.add(shadow);

  if (kind === 'minibus') {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.72, 4.4), lowerMat);
    lower.position.y = 0.72;
    lower.castShadow = true;
    g.add(lower);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.78, 4.05), upperMat);
    upper.position.set(0, 1.46, 0.12);
    upper.castShadow = true;
    g.add(upper);
  } else if (kind === 'lada') {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.54, 3.85), lowerMat);
    lower.position.y = 0.56;
    lower.castShadow = true;
    g.add(lower);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.52, 2.05), upperMat);
    cabin.position.set(0, 1.08, 0.15);
    cabin.castShadow = true;
    g.add(cabin);
  } else {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.35, 1.45), upperMat);
    cab.position.set(0, 1.12, -1.45);
    cab.castShadow = true;
    g.add(cab);
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(1.94, 1.55, 3.1), lowerMat);
    cargo.position.set(0, 1.32, 0.92);
    cargo.castShadow = true;
    g.add(cargo);
  }

  for (const [wx, wz] of [
    [-0.75, -1.35],
    [0.75, -1.35],
    [-0.75, 1.32],
    [0.75, 1.32],
  ]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 12), tireMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.32, wz);
    g.add(w);
  }

  for (const lx of [-0.62, 0.62]) {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.06), brakeLightMat);
    bl.position.set(lx, 0.78, kind === 'lada' ? 1.93 : 2.22);
    g.add(bl);
  }

  return { group: g, brakeLightMat };
}

function createPersonMesh(
  clothColor: number,
  shawlColor: number | null,
  carryGoods: boolean,
  skinMat: THREE.Material
): { group: THREE.Group; legL: THREE.Mesh; legR: THREE.Mesh } {
  const g = new THREE.Group();
  const clothMat = new THREE.MeshStandardMaterial({ color: clothColor, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2f353b, roughness: 0.9 });

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.68, 0.14), pantsMat);
  legL.position.set(-0.09, 0.34, 0);
  g.add(legL);

  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.68, 0.14), pantsMat);
  legR.position.set(0.09, 0.34, 0);
  g.add(legR);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.56, 0.22), clothMat);
  torso.position.y = 0.96;
  torso.castShadow = true;
  g.add(torso);

  if (shawlColor !== null) {
    const shawlMat = new THREE.MeshStandardMaterial({ color: shawlColor, roughness: 0.88 });
    const shawl = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.36, 0.25), shawlMat);
    shawl.position.y = 1.06;
    g.add(shawl);
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), skinMat);
  head.position.y = 1.38;
  g.add(head);

  if (carryGoods) {
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xc28e48, roughness: 0.82 });
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.24, 10), crateMat);
    basket.position.y = 1.62;
    g.add(basket);
  }

  return { group: g, legL, legR };
}

function createHandcart(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c5634, roughness: 0.88 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e2022, roughness: 0.88 });
  const sackMat = new THREE.MeshStandardMaterial({ color: 0xc7ab7c, roughness: 0.9 });

  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 1.8), woodMat);
  bed.position.y = 0.52;
  bed.castShadow = true;
  g.add(bed);

  for (const [hx, hz] of [
    [-0.45, 1.15],
    [0.45, 1.15],
  ]) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.8), woodMat);
    handle.position.set(hx, 0.68, hz);
    handle.rotation.x = -0.25;
    g.add(handle);
  }
  for (const wx of [-0.62, 0.62]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 14), tireMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, 0);
    g.add(wheel);
  }
  const sack1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.38, 1.1), sackMat);
  sack1.position.set(0, 0.78, -0.1);
  g.add(sack1);
  return g;
}

interface DustPuff {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export function createLivingMarket(world: MerkatoWorldData, textures: TextureBundle): LivingMarketSystem {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x6b422e, roughness: 0.8 });

  // 1. Moving AI Traffic along the mapped route
  const aiVehicles: AiVehicle[] = [];
  const vehicleSpecs: { s: number; kind: 'minibus' | 'lada' | 'isuzu'; speed: number; offset: number }[] = [
    { s: 130, kind: 'minibus', speed: 7.4, offset: 0.5 },
    { s: 290, kind: 'lada', speed: 8.2, offset: -0.4 },
    { s: 470, kind: 'minibus', speed: 6.8, offset: 0.4 },
    { s: 680, kind: 'isuzu', speed: 6.1, offset: 0.2 },
    { s: 940, kind: 'minibus', speed: 7.5, offset: -0.3 },
    { s: 1180, kind: 'lada', speed: 8.0, offset: 0.5 },
    { s: 1450, kind: 'minibus', speed: 7.2, offset: -0.2 },
    { s: 1740, kind: 'lada', speed: 7.9, offset: 0.4 },
    { s: 2040, kind: 'minibus', speed: 6.9, offset: 0.3 },
    { s: 2340, kind: 'isuzu', speed: 6.3, offset: -0.3 },
  ];

  vehicleSpecs.forEach((spec) => {
    const { group: vg, brakeLightMat } = createCompactVehicle(spec.kind, textures.contactShadow);
    const pt = sampleRouteAtS(world.route, spec.s);
    const rightX = Math.cos(pt.heading);
    const rightZ = Math.sin(pt.heading);
    const x = pt.x + rightX * spec.offset;
    const z = pt.z + rightZ * spec.offset;
    vg.position.set(x, 0, z);
    vg.rotation.y = -pt.heading;
    group.add(vg);
    aiVehicles.push({
      group: vg,
      x,
      z,
      heading: pt.heading,
      s: spec.s,
      baseSpeed: spec.speed,
      currentSpeed: spec.speed,
      laneOffset: spec.offset,
      brakeLightMat,
      active: true,
    });
  });

  // 2. Parked Minibuses, Handcarts & Market Umbrellas along wide market shoulders (strictly outside main lane!)
  const parkedColliders: { x: number; z: number; radius: number }[] = [];
  const parkedSList = [65, 390, 820, 1280, 1620, 2220];
  parkedSList.forEach((ps, idx) => {
    const pt = sampleRouteAtS(world.route, ps);
    const rightX = Math.cos(pt.heading);
    const rightZ = Math.sin(pt.heading);
    const px = pt.x + rightX * 4.4;
    const pz = pt.z + rightZ * 4.4;
    if (idx % 2 === 0) {
      const { group: parkedVan } = createCompactVehicle('minibus', textures.contactShadow);
      parkedVan.position.set(px, 0, pz);
      parkedVan.rotation.y = -pt.heading;
      group.add(parkedVan);
      parkedColliders.push({ x: px, z: pz, radius: 1.55 });
    } else {
      const cart = createHandcart();
      cart.position.set(px, 0, pz);
      cart.rotation.y = -pt.heading + 0.15;
      group.add(cart);
      parkedColliders.push({ x: px, z: pz, radius: 1.0 });
    }
  });

  // Market umbrellas on outer sidewalk shoulders (safe offset 5.7m left/right of route)
  const umbrellaColors = [0xe11d48, 0x0284c7, 0xd97706, 0x16a34a];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
  const umbPoleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6);
  const umbTopGeo = new THREE.ConeGeometry(1.35, 0.55, 8);
  for (let s = 95; s < world.totalRouteLength - 80; s += 190) {
    const pt = sampleRouteAtS(world.route, s);
    const rightX = Math.cos(pt.heading);
    const rightZ = Math.sin(pt.heading);
    const side = (Math.round(s) % 380 < 190 ? -1 : 1) * 5.85;
    const ux = pt.x + rightX * side;
    const uz = pt.z + rightZ * side;

    const uGroup = new THREE.Group();
    uGroup.position.set(ux, 0, uz);
    const pole = new THREE.Mesh(umbPoleGeo, poleMat);
    pole.position.y = 1.2;
    uGroup.add(pole);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: umbrellaColors[Math.round(s) % umbrellaColors.length],
      roughness: 0.72,
    });
    const canopy = new THREE.Mesh(umbTopGeo, canopyMat);
    canopy.position.y = 2.45;
    canopy.castShadow = true;
    uGroup.add(canopy);
    group.add(uGroup);
  }

  // 3. Pedestrians & Shoppers (sidewalks + pedestrian-only lanes + crossing spots)
  const pedestrians: PedestrianActor[] = [];
  const palette = [0x1d4ed8, 0xb91c1c, 0x047857, 0xd97706, 0x6d28d9, 0x374151, 0xbe185d];

  for (let s = 45; s < world.totalRouteLength - 40; s += 46) {
    const pt = sampleRouteAtS(world.route, s);
    const rightX = Math.cos(pt.heading);
    const rightZ = Math.sin(pt.heading);
    const fwdX = Math.sin(pt.heading);
    const fwdZ = -Math.cos(pt.heading);

    const isCrossing = Math.round(s) % 138 === 45;
    const side = isCrossing ? 0 : s % 92 < 46 ? 1 : -1;
    const baseX = pt.x + rightX * (isCrossing ? 0 : side * 4.4);
    const baseZ = pt.z + rightZ * (isCrossing ? 0 : side * 4.4);

    const { group: pg, legL, legR } = createPersonMesh(
      palette[pedestrians.length % palette.length],
      pedestrians.length % 2 === 0 ? 0xf5f2eb : null,
      pedestrians.length % 3 === 0,
      skinMat
    );
    pg.position.set(baseX, 0, baseZ);
    group.add(pg);

    pedestrians.push({
      group: pg,
      baseX,
      baseZ,
      x: baseX,
      z: baseZ,
      dirX: isCrossing ? rightX : fwdX,
      dirZ: isCrossing ? rightZ : fwdZ,
      span: isCrossing ? 4.4 : 8.5,
      phase: (s * 0.17) % (Math.PI * 2),
      speed: isCrossing ? 1.15 : 1.0 + (pedestrians.length % 3) * 0.25,
      isCrossing,
      scaredTimer: 0,
      knockedTimer: 0,
      hitCooldown: 0,
      vx: 0,
      vz: 0,
      fallRot: 0,
      spinAngle: 0,
      legL,
      legR,
    });
  }

  for (const pedRoad of world.pedestrianRoads) {
    for (let i = 0; i < pedRoad.pts.length - 1; i++) {
      const [ax, az] = pedRoad.pts[i];
      const [bx, bz] = pedRoad.pts[i + 1];
      const mx = (ax + bx) * 0.5;
      const mz = (az + bz) * 0.5;
      const len = Math.hypot(bx - ax, bz - az) || 1;
      const { group: pg, legL, legR } = createPersonMesh(
        palette[pedestrians.length % palette.length],
        0xf5f2eb,
        true,
        skinMat
      );
      pg.position.set(mx, 0, mz);
      group.add(pg);
      pedestrians.push({
        group: pg,
        baseX: mx,
        baseZ: mz,
        x: mx,
        z: mz,
        dirX: (bx - ax) / len,
        dirZ: (bz - az) / len,
        span: Math.min(8, len * 0.4),
        phase: i,
        speed: 1.1,
        isCrossing: false,
        scaredTimer: 0,
        knockedTimer: 0,
        hitCooldown: 0,
        vx: 0,
        vz: 0,
        fallRot: 0,
        spinAngle: 0,
        legL,
        legR,
      });
    }
  }

  // 4. Waiting & Boarding Passenger Clusters at each Taxi Stop
  const stopClusters = new Map<string, StopPassengerCluster>();
  for (const stop of world.stops) {
    if (stop.isFinish) continue;
    const clusterGroup = new THREE.Group();
    const rightX = Math.cos(stop.heading);
    const rightZ = Math.sin(stop.heading);
    const waitX = stop.curbX + rightX * 2.1;
    const waitZ = stop.curbZ + rightZ * 2.1;
    clusterGroup.position.set(waitX, 0, waitZ);
    clusterGroup.rotation.y = -stop.heading;

    const peds: THREE.Group[] = [];
    for (let i = 0; i < 4; i++) {
      const { group: pg } = createPersonMesh(
        palette[(i + stop.routeIdx) % palette.length],
        i % 2 === 0 ? 0xf5f2eb : null,
        i === 2,
        skinMat
      );
      const localZ = (i - 1.5) * 1.1;
      const localX = (i % 2) * 0.45;
      pg.position.set(localX, 0, localZ);
      pg.rotation.y = -Math.PI / 2;
      pg.userData.homeX = localX;
      pg.userData.homeZ = localZ;
      clusterGroup.add(pg);
      peds.push(pg);
    }
    group.add(clusterGroup);

    stopClusters.set(stop.id, {
      stopId: stop.id,
      group: clusterGroup,
      peds,
      setVisibleCount: (n: number) => {
        peds.forEach((p, idx) => {
          p.visible = idx < n;
        });
      },
      setBoardingProgress: (t: number) => {
        const clamped = Math.max(0, Math.min(1, t));
        peds.forEach((p) => {
          const hx = (p.userData.homeX as number) ?? 0;
          const hz = (p.userData.homeZ as number) ?? 0;
          p.position.x = hx - clamped * 1.45;
          p.position.z = hz * (1 - clamped * 0.65);
        });
      },
    });
  }

  // 5. Pooled Impact Dust Puff Particles (InstancedMesh, zero GC)
  const MAX_PUFFS = 36;
  const puffGeo = new THREE.SphereGeometry(0.32, 6, 6);
  const puffMat = new THREE.MeshBasicMaterial({
    color: 0xd6c2a3,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const puffInst = new THREE.InstancedMesh(puffGeo, puffMat, MAX_PUFFS);
  puffInst.frustumCulled = false;
  group.add(puffInst);

  const puffs: DustPuff[] = Array.from({ length: MAX_PUFFS }, () => ({
    x: 0,
    y: -10,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 0.5,
  }));
  let puffCursor = 0;
  const puffDummy = new THREE.Object3D();

  const spawnDustBurst = (x: number, z: number) => {
    for (let i = 0; i < 10; i++) {
      const p = puffs[puffCursor];
      puffCursor = (puffCursor + 1) % MAX_PUFFS;
      const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 1.8 + Math.random() * 2.5;
      p.x = x;
      p.y = 0.55;
      p.z = z;
      p.vx = Math.cos(ang) * spd;
      p.vy = 1.2 + Math.random() * 1.4;
      p.vz = Math.sin(ang) * spd;
      p.maxLife = 0.48 + Math.random() * 0.2;
      p.life = p.maxLife;
    }
  };

  let currentDensity: TrafficDensity = 'normal';

  const applyDensity = (density: TrafficDensity) => {
    currentDensity = density;
    const maxAi = density === 'low' ? 4 : density === 'normal' ? 7 : aiVehicles.length;
    aiVehicles.forEach((v, idx) => {
      v.active = idx < maxAi;
      v.group.visible = v.active;
    });
    const pedStep = density === 'low' ? 2 : 1;
    pedestrians.forEach((p, idx) => {
      p.group.visible = idx % pedStep === 0 || p.isCrossing;
    });
  };
  applyDensity('normal');

  return {
    group,
    aiVehicles,
    pedestrians,
    parkedColliders,
    stopClusters,
    setDensity: applyDensity,
    triggerHornReaction: (px, pz) => {
      for (const p of pedestrians) {
        const d = Math.hypot(p.x - px, p.z - pz);
        if (d < 22) {
          p.scaredTimer = 2.2;
        }
      }
    },
    knockPedestrian: (ped, impulseX, impulseZ, speedMs) => {
      ped.vx = impulseX;
      ped.vz = impulseZ;
      ped.knockedTimer = speedMs >= 2.2 ? 3.4 : 1.1;
      ped.hitCooldown = 1.5;
      ped.spinAngle = Math.atan2(impulseX, impulseZ);
      spawnDustBurst(ped.x, ped.z);
    },
    update: (dt, playerX, playerZ, playerSpeedMs, elapsed) => {
      // Update AI traffic along route
      for (let i = 0; i < aiVehicles.length; i++) {
        const v = aiVehicles[i];
        if (!v.active) continue;

        let targetSpeed = v.baseSpeed;
        const dxP = playerX - v.x;
        const dzP = playerZ - v.z;
        const distP = Math.hypot(dxP, dzP);
        const fwdX = Math.sin(v.heading);
        const fwdZ = -Math.cos(v.heading);
        const dotP = dxP * fwdX + dzP * fwdZ;
        if (distP < 16 && dotP > 2) {
          targetSpeed = Math.min(targetSpeed, Math.max(0, (distP - 6.8) * 1.2));
        }

        for (let j = 0; j < aiVehicles.length; j++) {
          if (i === j || !aiVehicles[j].active) continue;
          const o = aiVehicles[j];
          const dxO = o.x - v.x;
          const dzO = o.z - v.z;
          const distO = Math.hypot(dxO, dzO);
          if (distO < 14 && dxO * fwdX + dzO * fwdZ > 2) {
            targetSpeed = Math.min(targetSpeed, Math.max(0, (distO - 6.5) * 1.1));
          }
        }

        for (const p of pedestrians) {
          if (!p.isCrossing || !p.group.visible || p.knockedTimer > 0) continue;
          const distPed = Math.hypot(p.x - v.x, p.z - v.z);
          if (distPed < 10 && (p.x - v.x) * fwdX + (p.z - v.z) * fwdZ > 0) {
            targetSpeed = 0;
            break;
          }
        }

        const isBraking = targetSpeed < v.currentSpeed - 0.5 || targetSpeed < 0.5;
        v.brakeLightMat.emissiveIntensity = isBraking ? 1.6 : 0.2;
        v.currentSpeed = THREE.MathUtils.damp(v.currentSpeed, targetSpeed, 3.8, dt);

        v.s += v.currentSpeed * dt;
        if (v.s > world.totalRouteLength) v.s -= world.totalRouteLength;

        const pt = sampleRouteAtS(world.route, v.s);
        const rightX = Math.cos(pt.heading);
        const rightZ = Math.sin(pt.heading);
        v.x = pt.x + rightX * v.laneOffset;
        v.z = pt.z + rightZ * v.laneOffset;
        v.heading = pt.heading;
        v.group.position.set(v.x, 0, v.z);
        v.group.rotation.y = -v.heading;
      }

      // Update pedestrians (walking + physical knockdown / crush tumble recovery)
      for (const p of pedestrians) {
        if (!p.group.visible) continue;
        if (p.hitCooldown > 0) p.hitCooldown = Math.max(0, p.hitCooldown - dt);
        if (p.scaredTimer > 0) p.scaredTimer = Math.max(0, p.scaredTimer - dt);

        if (p.knockedTimer > 0) {
          p.knockedTimer = Math.max(0, p.knockedTimer - dt);
          p.x += p.vx * dt;
          p.z += p.vz * dt;
          const damp = Math.exp(-4.8 * dt);
          p.vx *= damp;
          p.vz *= damp;

          let hopY = 0;
          if (p.knockedTimer > 0.7) {
            // Knocked flat onto ground (first 0.4s hops slightly)
            const elapsedKnock = 3.4 - p.knockedTimer;
            if (elapsedKnock < 0.45) {
              hopY = Math.sin((elapsedKnock / 0.45) * Math.PI) * 0.42;
            }
            p.fallRot = Math.min(Math.PI * 0.48, p.fallRot + dt * 9.5);
          } else {
            // Getting back up
            p.fallRot = Math.max(0, p.fallRot - dt * 2.5);
            // Smoothly return base anchor near settled position or sidewalk
            p.x += (p.baseX - p.x) * Math.min(1, dt * 1.4);
            p.z += (p.baseZ - p.z) * Math.min(1, dt * 1.4);
          }

          p.group.position.set(p.x, hopY + (p.fallRot / (Math.PI * 0.48)) * 0.16, p.z);
          p.group.rotation.set(p.fallRot, p.spinAngle, 0);
          p.legL.rotation.x = p.fallRot * 0.25;
          p.legR.rotation.x = -p.fallRot * 0.25;
          continue;
        }

        // Upright walking behavior
        p.fallRot = 0;
        const distPlayer = Math.hypot(p.x - playerX, p.z - playerZ);
        let speedScale = 1;
        if (p.isCrossing) {
          if (distPlayer < 9 && Math.abs(playerSpeedMs) > 1.2 && p.scaredTimer <= 0) {
            speedScale = 0.05;
          } else if (p.scaredTimer > 0) {
            speedScale = 1.9;
          }
        }

        p.phase += dt * p.speed * speedScale;
        const offset = Math.sin(p.phase) * p.span;
        const cosDir = Math.cos(p.phase) >= 0 ? 1 : -1;
        p.x = p.baseX + p.dirX * offset;
        p.z = p.baseZ + p.dirZ * offset;
        p.group.position.set(p.x, 0, p.z);
        p.group.rotation.set(0, Math.atan2(p.dirX * cosDir, p.dirZ * cosDir), 0);

        const swing = speedScale > 0.1 ? Math.sin(elapsed * 7.5 + p.phase) * 0.42 : 0;
        p.legL.rotation.x = swing;
        p.legR.rotation.x = -swing;
      }

      // Update dust puffs
      for (let i = 0; i < MAX_PUFFS; i++) {
        const pf = puffs[i];
        if (pf.life > 0) {
          pf.life = Math.max(0, pf.life - dt);
          pf.x += pf.vx * dt;
          pf.y += pf.vy * dt;
          pf.z += pf.vz * dt;
          pf.vy -= 2.2 * dt;
          const t = pf.life / pf.maxLife;
          const scale = (1 - t) * 1.4 + 0.4;
          puffDummy.position.set(pf.x, Math.max(0.15, pf.y), pf.z);
          puffDummy.scale.setScalar(scale * t);
        } else {
          puffDummy.position.set(0, -20, 0);
          puffDummy.scale.setScalar(0.001);
        }
        puffDummy.updateMatrix();
        puffInst.setMatrixAt(i, puffDummy.matrix);
      }
      puffInst.instanceMatrix.needsUpdate = true;

      void currentDensity;
    },
    dispose: () => {
      puffGeo.dispose();
      puffMat.dispose();
      poleMat.dispose();
      umbPoleGeo.dispose();
      umbTopGeo.dispose();
    },
  };
}
