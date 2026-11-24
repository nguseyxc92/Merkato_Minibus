import * as THREE from 'three';
import type { BuildingFootprint, MerkatoWorldData, RoadSegment, TaxiStop } from '../../data/merkatoRoutes';
import type { TextureBundle } from '../textures';

export interface StopVisual {
  stop: TaxiStop;
  bayMesh: THREE.Mesh;
  bayMat: THREE.MeshBasicMaterial;
  beaconMesh: THREE.Mesh;
}

export interface RoadblockCollider {
  x: number;
  z: number;
  radius: number;
}

export interface MerkatoSceneAssets {
  worldGroup: THREE.Group;
  stopVisuals: Map<string, StopVisual>;
  roadblockColliders: RoadblockCollider[];
  roadblockBeacons: THREE.Mesh[];
  dispose: () => void;
}

export const DISTRICT_BOUNDS = {
  minX: -665,
  maxX: 250,
  minZ: -295,
  maxZ: 310,
};

function pointToSegDistSq(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const vx = bx - ax;
  const vz = bz - az;
  const lenSq = vx * vx + vz * vz;
  if (lenSq < 1e-6) return (px - ax) ** 2 + (pz - az) ** 2;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / lenSq));
  const dx = px - (ax + t * vx);
  const dz = pz - (az + t * vz);
  return dx * dx + dz * dz;
}

function minDistToRoute(world: MerkatoWorldData, px: number, pz: number): number {
  let best = Infinity;
  for (let i = 0; i < world.route.length - 1; i++) {
    const a = world.route[i];
    const b = world.route[i + 1];
    const dSq = pointToSegDistSq(px, pz, a.x, a.z, b.x, b.z);
    if (dSq < best) best = dSq;
  }
  return Math.sqrt(best);
}

function buildRoadRibbonGeometry(pts: [number, number][], width: number, yOffset: number): THREE.BufferGeometry {
  const half = width / 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let accumLen = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    if (i > 0) {
      accumLen += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    }
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;

    positions.push(p[0] - nx * half, yOffset, p[1] - nz * half);
    positions.push(p[0] + nx * half, yOffset, p[1] + nz * half);

    uvs.push(0, accumLen / 12);
    uvs.push(1, accumLen / 12);

    if (i < pts.length - 1) {
      const base = i * 2;
      indices.push(base, base + 2, base + 1);
      indices.push(base + 1, base + 2, base + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createAnwarGrandMosque(b: BuildingFootprint, textures: TextureBundle): THREE.Group {
  const group = new THREE.Group();
  group.position.set(b.cx, 0, b.cz);
  group.rotation.y = -b.angle;

  const whitePlaster = new THREE.MeshStandardMaterial({
    map: textures.mosqueWall,
    roughness: 0.72,
  });
  const solidWhite = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.74 });
  const emeraldGreen = new THREE.MeshStandardMaterial({ color: 0x1a6842, roughness: 0.56 });
  const domeTeal = new THREE.MeshStandardMaterial({ color: 0x2f7d64, roughness: 0.42, metalness: 0.14 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd9b043, roughness: 0.28, metalness: 0.85 });
  const minaretMat = new THREE.MeshStandardMaterial({ map: textures.minaretTile, roughness: 0.68 });
  const zincMat = new THREE.MeshStandardMaterial({ map: textures.corrugatedZinc, roughness: 0.58, metalness: 0.35 });
  const elecBayMat = new THREE.MeshStandardMaterial({ map: textures.shopInteriorBays[1], roughness: 0.65 });

  const w = Math.min(84, b.width * 0.76);
  const d = Math.min(72, b.depth * 0.72);

  // Raised marble/concrete courtyard plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 6, 0.7, d + 6), solidWhite);
  plinth.position.y = 0.35;
  plinth.receiveShadow = true;
  group.add(plinth);

  // Main Prayer Hall
  const hallH = 11.5;
  const hall = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, hallH, d * 0.72), whitePlaster);
  hall.position.set(-w * 0.05, 0.7 + hallH / 2, 0);
  hall.castShadow = true;
  hall.receiveShadow = true;
  group.add(hall);

  // Signature deep emerald-green scalloped parapet crown around prayer hall
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 2.2, d * 0.74), emeraldGreen);
  parapet.position.set(-w * 0.05, 0.7 + hallH + 1.0, 0);
  parapet.castShadow = true;
  group.add(parapet);

  for (let x = -w * 0.36; x <= w * 0.3; x += 3.6) {
    const merlon = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.5, 4), emeraldGreen);
    merlon.position.set(x, 0.7 + hallH + 2.6, d * 0.37);
    merlon.rotation.y = Math.PI / 4;
    group.add(merlon);

    const merlonEast = merlon.clone();
    merlonEast.position.set(w * 0.35, 0.7 + hallH + 2.6, (x / w) * d * 0.8);
    group.add(merlonEast);
  }

  // East Colonnade Porch facing Tesema Aba Kemaw Street
  const porch = new THREE.Mesh(new THREE.BoxGeometry(8.5, 8.0, d * 0.7), whitePlaster);
  porch.position.set(w * 0.39, 4.7, 0);
  porch.castShadow = true;
  group.add(porch);

  // Central Great Teal Dome + Crescent Finial
  const centralDome = new THREE.Mesh(
    new THREE.SphereGeometry(9.5, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
    domeTeal
  );
  centralDome.position.set(-w * 0.05, 0.7 + hallH + 1.8, 0);
  centralDome.castShadow = true;
  group.add(centralDome);

  const finialPole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 3.8, 8), goldMat);
  finialPole.position.set(-w * 0.05, 0.7 + hallH + 12.6, 0);
  group.add(finialPole);
  const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.14, 8, 18, Math.PI * 1.45), goldMat);
  crescent.position.set(-w * 0.05, 0.7 + hallH + 14.5, 0);
  crescent.rotation.z = Math.PI * 0.25;
  group.add(crescent);

  for (const [tx, tz] of [
    [-w * 0.38, -d * 0.3],
    [w * 0.28, -d * 0.3],
    [-w * 0.38, d * 0.3],
    [w * 0.28, d * 0.3],
  ]) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.3, 4.2, 8), solidWhite);
    drum.position.set(tx, 0.7 + hallH + 2.8, tz);
    group.add(drum);
    const tDome = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      domeTeal
    );
    tDome.position.set(tx, 0.7 + hallH + 4.8, tz);
    group.add(tDome);
  }

  // Iconic Tall Stone-Tiled Minaret
  const mx = w * 0.38;
  const mz = -d * 0.24;
  const baseTower = new THREE.Mesh(new THREE.BoxGeometry(6.8, 17, 6.8), minaretMat);
  baseTower.position.set(mx, 8.5, mz);
  baseTower.castShadow = true;
  group.add(baseTower);

  const balc1 = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.9, 8.2), emeraldGreen);
  balc1.position.set(mx, 17.2, mz);
  group.add(balc1);

  const upperShaft = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 3.1, 11.5, 8), minaretMat);
  upperShaft.position.set(mx, 23.4, mz);
  upperShaft.castShadow = true;
  group.add(upperShaft);

  const balc2 = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 3.9, 0.8, 12), emeraldGreen);
  balc2.position.set(mx, 29.3, mz);
  group.add(balc2);

  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3.6, 8), solidWhite);
  lantern.position.set(mx, 31.4, mz);
  group.add(lantern);

  const minDome = new THREE.Mesh(
    new THREE.SphereGeometry(2.45, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65),
    domeTeal
  );
  minDome.position.set(mx, 33.2, mz);
  group.add(minDome);

  const minSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 2.8, 8), goldMat);
  minSpire.position.set(mx, 36.2, mz);
  group.add(minSpire);

  // Streetfront Electronics Shop Row along the outer perimeter with open stocked bays
  const signTexList = textures.shopSigns;
  for (let i = 0; i < 4; i++) {
    const sz = -d * 0.3 + i * 11.5;
    const shopBody = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.8, 10.6), elecBayMat);
    shopBody.position.set(w * 0.49, 1.9, sz);
    shopBody.castShadow = true;
    group.add(shopBody);

    const roofAwning = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.24, 10.9), zincMat);
    roofAwning.position.set(w * 0.505, 4.0, sz);
    roofAwning.rotation.z = -0.14;
    group.add(roofAwning);

    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 1.45, 9.6),
      new THREE.MeshStandardMaterial({ map: signTexList[i % signTexList.length], roughness: 0.45 })
    );
    signBoard.position.set(w * 0.54, 4.65, sz);
    group.add(signBoard);
  }

  return group;
}

function createRaguelChurch(b: BuildingFootprint, textures: TextureBundle): THREE.Group {
  const group = new THREE.Group();
  group.position.set(b.cx, 0, b.cz);
  group.rotation.y = -b.angle;

  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.churchStone, roughness: 0.78 });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xede2cb, roughness: 0.72 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x9b4f34, roughness: 0.52, metalness: 0.25 });
  const copperDome = new THREE.MeshStandardMaterial({ color: 0xb8862d, roughness: 0.35, metalness: 0.65 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe3b93c, roughness: 0.25, metalness: 0.88 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd2c4ab, roughness: 0.84 });

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(20, 21.5, 1.1, 8), creamMat);
  plinth.position.y = 0.55;
  plinth.receiveShadow = true;
  group.add(plinth);

  const mainBody = new THREE.Mesh(new THREE.CylinderGeometry(16.5, 17.0, 9.6, 8), stoneMat);
  mainBody.position.y = 1.1 + 4.8;
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  group.add(mainBody);

  for (const ang of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    const porch = new THREE.Mesh(new THREE.BoxGeometry(5.2, 6.2, 3.2), creamMat);
    porch.position.set(Math.sin(ang) * 16.5, 4.2, Math.cos(ang) * 16.5);
    porch.rotation.y = ang;
    porch.castShadow = true;
    group.add(porch);
  }

  const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(19.2, 5.2, 8), roofMat);
  lowerRoof.position.y = 1.1 + 9.6 + 2.4;
  lowerRoof.castShadow = true;
  group.add(lowerRoof);

  const drum = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 6.0, 4.2, 8), creamMat);
  drum.position.y = 15.8;
  drum.castShadow = true;
  group.add(drum);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(5.6, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
    copperDome
  );
  dome.position.y = 17.8;
  dome.castShadow = true;
  group.add(dome);

  const crossPost = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.2, 8), goldMat);
  crossPost.position.y = 24.4;
  group.add(crossPost);
  const crossBar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.32, 0.24), goldMat);
  crossBar.position.y = 25.1;
  group.add(crossBar);
  const crossRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.14, 8, 16), goldMat);
  crossRing.position.y = 25.1;
  group.add(crossRing);

  const halfW = Math.min(34, b.width * 0.44);
  const halfD = Math.min(30, b.depth * 0.44);
  const wallH = 2.6;
  const wallSegs: [number, number, number, number][] = [
    [0, -halfD, halfW * 2, 0.7],
    [-halfW, 0, 0.7, halfD * 2],
    [halfW, 0, 0.7, halfD * 2],
    [-halfW * 0.56, halfD, halfW * 0.85, 0.7],
    [halfW * 0.56, halfD, halfW * 0.85, 0.7],
  ];
  for (const [wx, wz, ww, wd] of wallSegs) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, wallH, wd), wallMat);
    wall.position.set(wx, wallH / 2, wz);
    wall.castShadow = true;
    group.add(wall);
  }

  const gateArch = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.8, 1.1), creamMat);
  gateArch.position.set(0, 2.4, halfD);
  gateArch.castShadow = true;
  group.add(gateArch);

  const gateCross = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.3), goldMat);
  gateCross.position.set(0, 5.5, halfD);
  group.add(gateCross);

  return group;
}

export function buildMerkatoWorldScene(world: MerkatoWorldData, textures: TextureBundle): MerkatoSceneAssets {
  const worldGroup = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const stopVisuals = new Map<string, StopVisual>();
  const roadblockColliders: RoadblockCollider[] = [];
  const roadblockBeacons: THREE.Mesh[] = [];

  // 1. Ground Terrain extending far beyond playable area + distant Entoto mountain rim
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xb79973,
    roughness: 0.94,
    metalness: 0.0,
  });
  disposables.push(groundMat);

  const groundGeo = new THREE.PlaneGeometry(3400, 3400);
  disposables.push(groundGeo);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  worldGroup.add(ground);

  const ridgeMat = new THREE.MeshStandardMaterial({
    color: 0x6c7a62,
    roughness: 0.92,
  });
  disposables.push(ridgeMat);
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    const dist = 1050 + (i % 3) * 140;
    const hillH = 85 + (i % 4) * 38;
    const hillGeo = new THREE.ConeGeometry(280 + (i % 3) * 60, hillH, 7);
    disposables.push(hillGeo);
    const hill = new THREE.Mesh(hillGeo, ridgeMat);
    hill.position.set(Math.cos(ang) * dist, hillH * 0.42, Math.sin(ang) * dist);
    worldGroup.add(hill);
  }

  // 2. Full 3D Roads (bump-mapped asphalt + pedestrian cobbles + raised 3D concrete curbs)
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: textures.asphalt,
    bumpMap: textures.asphaltBump,
    bumpScale: 0.04,
    roughness: 0.85,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const pedMat = new THREE.MeshStandardMaterial({
    map: textures.pedestrianLane,
    roughness: 0.92,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const asphaltCapMat = new THREE.MeshStandardMaterial({
    color: 0x333538,
    bumpMap: textures.asphaltBump,
    bumpScale: 0.03,
    roughness: 0.86,
  });
  const curbMat = new THREE.MeshStandardMaterial({
    map: textures.sidewalk,
    roughness: 0.84,
  });
  disposables.push(asphaltMat, pedMat, asphaltCapMat, curbMat);

  const junctionSeen = new Set<string>();
  const junctionCapGeo = new THREE.CircleGeometry(1, 14);
  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  disposables.push(junctionCapGeo, unitBoxGeo);

  // Collect raised 3D curb strips & sidewalk aprons along major roads (carefully skipping intersections!)
  interface CurbTransform {
    x: number;
    z: number;
    len: number;
    heading: number;
  }
  const curbTransforms: CurbTransform[] = [];

  const isInsideAnyOtherRoad = (px: number, pz: number, ownRoadId: number): boolean => {
    for (const other of world.drivableRoads) {
      if (other.id === ownRoadId) continue;
      const clearanceSq = (other.width * 0.52 + 0.45) ** 2;
      for (let k = 0; k < other.pts.length - 1; k++) {
        const [ox1, oz1] = other.pts[k];
        const [ox2, oz2] = other.pts[k + 1];
        if (pointToSegDistSq(px, pz, ox1, oz1, ox2, oz2) < clearanceSq) {
          return true;
        }
      }
    }
    return false;
  };

  const addRoad = (road: RoadSegment, isPed: boolean) => {
    const y = isPed ? 0.025 : 0.04;
    const geo = buildRoadRibbonGeometry(road.pts, road.width, y);
    disposables.push(geo);
    const mesh = new THREE.Mesh(geo, isPed ? pedMat : asphaltMat);
    mesh.receiveShadow = true;
    worldGroup.add(mesh);

    if (!isPed) {
      for (const [px, pz] of [road.pts[0], road.pts[road.pts.length - 1]]) {
        const key = `${Math.round(px)}_${Math.round(pz)}`;
        if (junctionSeen.has(key)) continue;
        junctionSeen.add(key);
        const cap = new THREE.Mesh(junctionCapGeo, asphaltCapMat);
        cap.rotation.x = -Math.PI / 2;
        cap.position.set(px, 0.036, pz);
        cap.scale.setScalar(road.width * 0.56);
        cap.receiveShadow = true;
        worldGroup.add(cap);
      }

      // Generate raised 3D concrete curbs along main streets inside active district
      if (road.width >= 7 && (road.highway === 'primary' || road.highway === 'secondary' || road.highway === 'tertiary')) {
        for (let i = 0; i < road.pts.length - 1; i++) {
          const [ax, az] = road.pts[i];
          const [bx, bz] = road.pts[i + 1];
          const segLen = Math.hypot(bx - ax, bz - az);
          if (segLen < 6) continue;
          const midX = (ax + bx) * 0.5;
          const midZ = (az + bz) * 0.5;
          if (
            midX < DISTRICT_BOUNDS.minX - 25 ||
            midX > DISTRICT_BOUNDS.maxX + 25 ||
            midZ < DISTRICT_BOUNDS.minZ - 25 ||
            midZ > DISTRICT_BOUNDS.maxZ + 25
          ) {
            continue;
          }
          const heading = Math.atan2(bx - ax, -(bz - az));
          const rightX = Math.cos(heading);
          const rightZ = Math.sin(heading);
          const curbOffset = road.width * 0.5 + 0.45;
          const trimmedLen = Math.max(2, segLen - 2.6);

          for (const side of [-1, 1]) {
            const cx = midX + rightX * curbOffset * side;
            const cz = midZ + rightZ * curbOffset * side;
            // Keep intersections & active driving route 100% open!
            if (isInsideAnyOtherRoad(cx, cz, road.id)) continue;
            if (minDistToRoute(world, cx, cz) < 4.5) continue;
            curbTransforms.push({ x: cx, z: cz, len: trimmedLen, heading });
          }
        }
      }
    }
  };

  for (const r of world.pedestrianRoads) addRoad(r, true);
  for (const r of world.drivableRoads) addRoad(r, false);

  const dummy = new THREE.Object3D();
  if (curbTransforms.length > 0) {
    const curbInst = new THREE.InstancedMesh(unitBoxGeo, curbMat, curbTransforms.length);
    curbInst.receiveShadow = true;
    curbInst.castShadow = true;
    curbTransforms.forEach((c, idx) => {
      dummy.position.set(c.x, 0.1, c.z);
      dummy.rotation.set(0, -c.heading, 0);
      dummy.scale.set(0.95, 0.2, c.len);
      dummy.updateMatrix();
      curbInst.setMatrixAt(idx, dummy.matrix);
    });
    curbInst.instanceMatrix.needsUpdate = true;
    curbInst.computeBoundingSphere();
    worldGroup.add(curbInst);
  }

  // Extra paved U-turn plaza apron at Tesema Aba Kemaw South Crossover
  const plazaGeo = new THREE.CircleGeometry(12.5, 20);
  disposables.push(plazaGeo);
  const uturnPlaza = new THREE.Mesh(plazaGeo, asphaltCapMat);
  uturnPlaza.rotation.x = -Math.PI / 2;
  uturnPlaza.position.set(150, 0.038, 180.5);
  uturnPlaza.receiveShadow = true;
  worldGroup.add(uturnPlaza);

  // Zebra Crosswalks near stops and major turns
  const crosswalkMat = new THREE.MeshBasicMaterial({
    map: textures.crosswalk,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const crosswalkGeo = new THREE.PlaneGeometry(7.2, 3.2);
  disposables.push(crosswalkMat, crosswalkGeo);
  for (const stop of world.stops) {
    const cw = new THREE.Mesh(crosswalkGeo, crosswalkMat);
    cw.rotation.x = -Math.PI / 2;
    cw.rotation.z = -stop.heading;
    const fwdX = Math.sin(stop.heading);
    const fwdZ = -Math.cos(stop.heading);
    cw.position.set(stop.roadX + fwdX * 7.5, 0.056, stop.roadZ + fwdZ * 7.5);
    worldGroup.add(cw);
  }

  // 3. Route Guide Chevrons (subtle painted arrows on asphalt along active mission route)
  const routeChevronMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const chevronGeo = new THREE.ConeGeometry(0.7, 1.5, 3);
  chevronGeo.rotateX(-Math.PI / 2);
  disposables.push(routeChevronMat, chevronGeo);

  const chevronPositions: { x: number; z: number; heading: number }[] = [];
  for (let i = 0; i < world.route.length - 1; i++) {
    const a = world.route[i];
    const b = world.route[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    if (segLen < 8) continue;
    const heading = Math.atan2(b.x - a.x, -(b.z - a.z));
    chevronPositions.push({
      x: (a.x + b.x) * 0.5,
      z: (a.z + b.z) * 0.5,
      heading,
    });
  }
  const chevronInst = new THREE.InstancedMesh(chevronGeo, routeChevronMat, chevronPositions.length);
  chevronPositions.forEach((cp, idx) => {
    dummy.position.set(cp.x, 0.06, cp.z);
    dummy.rotation.set(0, cp.heading, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    chevronInst.setMatrixAt(idx, dummy.matrix);
  });
  chevronInst.instanceMatrix.needsUpdate = true;
  chevronInst.computeBoundingSphere();
  worldGroup.add(chevronInst);

  // 4. Hero Landmarks + Full 3D Multi-Part Ethiopian Shops & Houses
  const shutterMat = new THREE.MeshStandardMaterial({ map: textures.shutterGrey, roughness: 0.52, metalness: 0.32 });
  const zincMat = new THREE.MeshStandardMaterial({ map: textures.corrugatedZinc, roughness: 0.58, metalness: 0.35 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ map: textures.sidewalk, roughness: 0.85 });
  const concreteTrimMat = new THREE.MeshStandardMaterial({ color: 0xc2b8a8, roughness: 0.86 });
  const steelStrutMat = new THREE.MeshStandardMaterial({ color: 0x3b4248, roughness: 0.45, metalness: 0.55 });
  const rotoTankMat = new THREE.MeshStandardMaterial({ color: 0x181c20, roughness: 0.42, metalness: 0.1 });
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x9b6d3f, roughness: 0.88 });
  const sackMat = new THREE.MeshStandardMaterial({ color: 0xc9b084, roughness: 0.92 });
  const stuccoMats = textures.stuccoWalls.map(
    (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.84 })
  );
  const shopBayMats = textures.shopInteriorBays.map(
    (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.68 })
  );
  const commercialMats = textures.commercialFacade.map(
    (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.76 })
  );
  const signMats = textures.shopSigns.map(
    (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 })
  );
  disposables.push(
    shutterMat,
    zincMat,
    sidewalkMat,
    concreteTrimMat,
    steelStrutMat,
    rotoTankMat,
    crateMat,
    sackMat,
    ...stuccoMats,
    ...shopBayMats,
    ...commercialMats,
    ...signMats
  );

  const signPlaneGeo = new THREE.BoxGeometry(1, 0.95, 0.14);
  const bayPanelGeo = new THREE.BoxGeometry(1, 3.1, 0.14);
  const tankGeo = new THREE.CylinderGeometry(0.75, 0.78, 1.45, 10);
  const strutGeo = new THREE.CylinderGeometry(0.055, 0.06, 3.6, 6);
  disposables.push(signPlaneGeo, bayPanelGeo, tankGeo, strutGeo);

  const genericShops: BuildingFootprint[] = [];
  for (const b of world.buildings) {
    if (b.kind === 'mosque') {
      worldGroup.add(createAnwarGrandMosque(b, textures));
      continue;
    }
    if (b.kind === 'church') {
      worldGroup.add(createRaguelChurch(b, textures));
      continue;
    }
    genericShops.push(b);
  }

  // Group buildings for batched 3D architectural parts
  const sidewalkInst = new THREE.InstancedMesh(unitBoxGeo, sidewalkMat, genericShops.length);
  const awningInst = new THREE.InstancedMesh(unitBoxGeo, zincMat, genericShops.length);
  const shutterHeaderInst = new THREE.InstancedMesh(unitBoxGeo, shutterMat, genericShops.length);
  const pilasterInst = new THREE.InstancedMesh(unitBoxGeo, concreteTrimMat, genericShops.length * 4);
  const parapetInst = new THREE.InstancedMesh(unitBoxGeo, concreteTrimMat, genericShops.length);
  sidewalkInst.receiveShadow = true;
  awningInst.castShadow = true;
  parapetInst.castShadow = true;

  const stuccoBuckets: { b: BuildingFootprint; idx: number }[][] = stuccoMats.map(() => []);
  const bayBuckets: { b: BuildingFootprint; bw: number; bd: number }[][] = shopBayMats.map(() => []);
  const upperStories: { b: BuildingFootprint; matIdx: number }[] = [];
  const signEntries: { b: BuildingFootprint; signIdx: number }[] = [];
  const ledgeEntries: { x: number; y: number; z: number; w: number; d: number; angle: number }[] = [];
  const tankEntries: { x: number; y: number; z: number }[] = [];
  const strutEntries: { x: number; z: number }[] = [];
  const crateEntries: { x: number; y: number; z: number; sx: number; sy: number; sz: number; ang: number }[] = [];

  genericShops.forEach((b, idx) => {
    const bw = Math.min(34, b.width * 0.9);
    const bd = Math.min(28, b.depth * 0.9);
    const groundH = 3.65;
    const sin = Math.sin(-b.angle);
    const cos = Math.cos(-b.angle);

    // 1. Concrete Sidewalk Plinth & Entry Step
    dummy.position.set(b.cx, 0.11, b.cz);
    dummy.rotation.set(0, -b.angle, 0);
    dummy.scale.set(bw + 1.4, 0.22, bd + 1.4);
    dummy.updateMatrix();
    sidewalkInst.setMatrixAt(idx, dummy.matrix);

    // 2. Stucco Wall Bucket
    stuccoBuckets[idx % stuccoMats.length].push({ b, idx });

    // 3. Recessed/Framed Open Shop Interior Bays on Front & Back street faces
    if (bw >= 4.5 && bd >= 4.0) {
      const bayIdx = Math.abs(idx + Math.round(b.cx)) % shopBayMats.length;
      bayBuckets[bayIdx].push({ b, bw, bd });
    }

    // 4. Rolled-Shutter Housing Beam over Shopfronts
    dummy.position.set(b.cx, groundH - 0.18, b.cz);
    dummy.rotation.set(0, -b.angle, 0);
    dummy.scale.set(bw + 0.18, 0.42, bd + 0.18);
    dummy.updateMatrix();
    shutterHeaderInst.setMatrixAt(idx, dummy.matrix);

    // 5. 4 Corner Structural Concrete Pilasters
    const corners: [number, number][] = [
      [-bw * 0.49, -bd * 0.49],
      [bw * 0.49, -bd * 0.49],
      [-bw * 0.49, bd * 0.49],
      [bw * 0.49, bd * 0.49],
    ];
    corners.forEach(([lx, lz], cIdx) => {
      const wx = b.cx + lx * cos + lz * sin;
      const wz = b.cz - lx * sin + lz * cos;
      dummy.position.set(wx, groundH / 2 + 0.1, wz);
      dummy.rotation.set(0, -b.angle, 0);
      dummy.scale.set(0.38, groundH + 0.1, 0.38);
      dummy.updateMatrix();
      pilasterInst.setMatrixAt(idx * 4 + cIdx, dummy.matrix);
    });

    // 6. Sloped Corrugated Zinc Overhang Awning
    dummy.position.set(b.cx, groundH + 0.24, b.cz);
    dummy.rotation.set(0.08, -b.angle, 0);
    dummy.scale.set(bw + 1.25, 0.2, bd + 1.25);
    dummy.updateMatrix();
    awningInst.setMatrixAt(idx, dummy.matrix);

    // Add slender 3D steel awning struts & street-side market crates/sacks ONLY when well clear of the route
    const clearDist = minDistToRoute(world, b.cx, b.cz);
    if (clearDist > Math.max(bw, bd) * 0.5 + 5.8 && bw >= 6) {
      for (const side of [-1, 1]) {
        const lx = side * (bw * 0.44);
        const lz = bd * 0.5 + 0.45;
        const sx = b.cx + lx * cos + lz * sin;
        const sz = b.cz - lx * sin + lz * cos;
        if (minDistToRoute(world, sx, sz) >= 5.2) {
          strutEntries.push({ x: sx, z: sz });
        }
      }
      // Wooden merchandise crate or sack outside front shop apron
      const cx = b.cx + (bd * 0.5 + 0.5) * sin;
      const cz = b.cz + (bd * 0.5 + 0.5) * cos;
      if (minDistToRoute(world, cx, cz) >= 5.4) {
        crateEntries.push({
          x: cx,
          y: 0.46,
          z: cz,
          sx: 0.85,
          sy: 0.52,
          sz: 0.65,
          ang: -b.angle,
        });
      }
    }

    // 7. Upper Stories + 3D Floor Slab Ledges + Rooftop Parapet + Roto Water Tanks
    const isMultiStory = b.levels >= 2 || b.kind === 'mall' || b.kind === 'commercial';
    let roofTopY = groundH + 0.35;
    if (isMultiStory) {
      const upperH = Math.min(18, Math.max(3.5, (b.levels - 1) * 3.5));
      upperStories.push({ b, matIdx: idx % commercialMats.length });
      roofTopY = 3.7 + upperH;

      // 3D Balcony / floor slab bands between stories
      const floors = Math.max(1, Math.round(upperH / 3.5));
      for (let f = 0; f <= floors; f++) {
        ledgeEntries.push({
          x: b.cx,
          y: 3.7 + f * (upperH / floors),
          z: b.cz,
          w: bw * 1.01,
          d: bd * 1.01,
          angle: -b.angle,
        });
      }
    }

    // Rooftop Parapet Rim
    dummy.position.set(b.cx, roofTopY + 0.28, b.cz);
    dummy.rotation.set(0, -b.angle, 0);
    dummy.scale.set(bw * 0.99, 0.56, bd * 0.99);
    dummy.updateMatrix();
    parapetInst.setMatrixAt(idx, dummy.matrix);

    // Iconic Black Ethiopian Roto Water Tanks on ~45% of rooftops
    if (idx % 2 === 0 && bw >= 5 && bd >= 5) {
      tankEntries.push({
        x: b.cx - bw * 0.16 * cos,
        y: roofTopY + 1.25,
        z: b.cz + bw * 0.16 * sin,
      });
    }

    // Shopfront Signboards
    if (bw >= 5) {
      signEntries.push({ b, signIdx: idx % signMats.length });
    }
  });

  sidewalkInst.instanceMatrix.needsUpdate = true;
  sidewalkInst.computeBoundingSphere();
  awningInst.instanceMatrix.needsUpdate = true;
  awningInst.computeBoundingSphere();
  shutterHeaderInst.instanceMatrix.needsUpdate = true;
  shutterHeaderInst.computeBoundingSphere();
  pilasterInst.instanceMatrix.needsUpdate = true;
  pilasterInst.computeBoundingSphere();
  parapetInst.instanceMatrix.needsUpdate = true;
  parapetInst.computeBoundingSphere();
  worldGroup.add(sidewalkInst, shutterHeaderInst, pilasterInst, awningInst, parapetInst);

  // Stucco ground-floor core bodies
  stuccoBuckets.forEach((bucket, sIdx) => {
    if (!bucket.length) return;
    const inst = new THREE.InstancedMesh(unitBoxGeo, stuccoMats[sIdx], bucket.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    bucket.forEach(({ b }, i) => {
      const bw = Math.min(34, b.width * 0.9);
      const bd = Math.min(28, b.depth * 0.9);
      dummy.position.set(b.cx, 3.65 / 2 + 0.1, b.cz);
      dummy.rotation.set(0, -b.angle, 0);
      dummy.scale.set(bw, 3.65, bd);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    worldGroup.add(inst);
  });

  // Open Shop Interior Bays (front + back faces on ground floor)
  bayBuckets.forEach((bucket, bIdx) => {
    if (!bucket.length) return;
    const inst = new THREE.InstancedMesh(bayPanelGeo, shopBayMats[bIdx], bucket.length * 2);
    bucket.forEach(({ b, bw, bd }, i) => {
      const sin = Math.sin(-b.angle);
      const cos = Math.cos(-b.angle);
      const panelW = Math.max(2.6, bw - 0.8);
      for (const side of [-1, 1]) {
        const offZ = side * (bd * 0.5 + 0.03);
        dummy.position.set(b.cx + sin * offZ, 1.75, b.cz + cos * offZ);
        dummy.rotation.set(0, -b.angle + (side === -1 ? Math.PI : 0), 0);
        dummy.scale.set(panelW, 1, 1);
        dummy.updateMatrix();
        inst.setMatrixAt(i * 2 + (side === -1 ? 0 : 1), dummy.matrix);
      }
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    worldGroup.add(inst);
  });

  // Upper commercial/residential stories batched by facade material
  for (let m = 0; m < commercialMats.length; m++) {
    const batch = upperStories.filter((u) => u.matIdx === m);
    if (!batch.length) continue;
    const inst = new THREE.InstancedMesh(unitBoxGeo, commercialMats[m], batch.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    batch.forEach(({ b }, i) => {
      const bw = Math.min(34, b.width * 0.9);
      const bd = Math.min(28, b.depth * 0.9);
      const upperH = Math.min(18, Math.max(3.5, (b.levels - 1) * 3.5));
      dummy.position.set(b.cx, 3.7 + upperH / 2, b.cz);
      dummy.rotation.set(0, -b.angle, 0);
      dummy.scale.set(bw * 0.96, upperH, bd * 0.96);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    worldGroup.add(inst);
  }

  // 3D Balcony Floor Slab Ledges
  if (ledgeEntries.length > 0) {
    const ledgeInst = new THREE.InstancedMesh(unitBoxGeo, concreteTrimMat, ledgeEntries.length);
    ledgeEntries.forEach((l, i) => {
      dummy.position.set(l.x, l.y, l.z);
      dummy.rotation.set(0, l.angle, 0);
      dummy.scale.set(l.w, 0.24, l.d);
      dummy.updateMatrix();
      ledgeInst.setMatrixAt(i, dummy.matrix);
    });
    ledgeInst.instanceMatrix.needsUpdate = true;
    ledgeInst.computeBoundingSphere();
    worldGroup.add(ledgeInst);
  }

  // Rooftop Roto Water Tanks
  if (tankEntries.length > 0) {
    const tankInst = new THREE.InstancedMesh(tankGeo, rotoTankMat, tankEntries.length);
    tankEntries.forEach((t, i) => {
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      tankInst.setMatrixAt(i, dummy.matrix);
    });
    tankInst.instanceMatrix.needsUpdate = true;
    tankInst.computeBoundingSphere();
    worldGroup.add(tankInst);
  }

  // Awning Support Struts & Roadside Merchandise Crates/Sacks
  if (strutEntries.length > 0) {
    const strutInst = new THREE.InstancedMesh(strutGeo, steelStrutMat, strutEntries.length);
    strutEntries.forEach((s, i) => {
      dummy.position.set(s.x, 1.85, s.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      strutInst.setMatrixAt(i, dummy.matrix);
    });
    strutInst.instanceMatrix.needsUpdate = true;
    strutInst.computeBoundingSphere();
    worldGroup.add(strutInst);
  }

  if (crateEntries.length > 0) {
    const crateHalf = Math.ceil(crateEntries.length / 2);
    const crateInst = new THREE.InstancedMesh(unitBoxGeo, crateMat, crateHalf);
    const sackInst = new THREE.InstancedMesh(unitBoxGeo, sackMat, Math.max(1, crateEntries.length - crateHalf));
    let ci = 0;
    let si = 0;
    crateEntries.forEach((c, idx) => {
      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(0, c.ang, 0);
      dummy.scale.set(c.sx, c.sy, c.sz);
      dummy.updateMatrix();
      if (idx % 2 === 0 && ci < crateHalf) {
        crateInst.setMatrixAt(ci++, dummy.matrix);
      } else if (si < sackInst.count) {
        sackInst.setMatrixAt(si++, dummy.matrix);
      }
    });
    crateInst.instanceMatrix.needsUpdate = true;
    crateInst.computeBoundingSphere();
    sackInst.instanceMatrix.needsUpdate = true;
    sackInst.computeBoundingSphere();
    worldGroup.add(crateInst, sackInst);
  }

  // Shopfront signs batched by sign texture
  for (let s = 0; s < signMats.length; s++) {
    const batch = signEntries.filter((e) => e.signIdx === s);
    if (!batch.length) continue;
    const inst = new THREE.InstancedMesh(signPlaneGeo, signMats[s], batch.length);
    batch.forEach(({ b }, i) => {
      const bw = Math.min(34, b.width * 0.9);
      const bd = Math.min(28, b.depth * 0.9);
      const signW = Math.min(8.5, bw * 0.72);
      const offsetZ = bd * 0.5 + 0.18;
      const sin = Math.sin(-b.angle);
      const cos = Math.cos(-b.angle);
      dummy.position.set(b.cx + sin * offsetZ, 4.15, b.cz + cos * offsetZ);
      dummy.rotation.set(0, -b.angle, 0);
      dummy.scale.set(signW, 1, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    worldGroup.add(inst);
  }

  // 5. Wooden Utility Poles + Streetlamp Arms + Overhead Power Wires along the route
  const poleGeo = new THREE.CylinderGeometry(0.11, 0.15, 7.8, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x5c4632, roughness: 0.92 });
  const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff0b3 });
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x1e2024 });
  const wireGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 4);
  wireGeo.rotateX(Math.PI / 2);
  disposables.push(poleGeo, poleMat, armGeo, lampMat, wireMat, wireGeo);

  const poleCoords: { x: number; z: number; heading: number }[] = [];
  for (let i = 0; i < world.route.length; i += 4) {
    const rp = world.route[i];
    const rightX = Math.cos(rp.heading);
    const rightZ = Math.sin(rp.heading);
    poleCoords.push({ x: rp.x + rightX * 5.7, z: rp.z + rightZ * 5.7, heading: rp.heading });
  }
  const poleInst = new THREE.InstancedMesh(poleGeo, poleMat, poleCoords.length);
  const armInst = new THREE.InstancedMesh(armGeo, steelStrutMat, poleCoords.length);
  const lampInst = new THREE.InstancedMesh(unitBoxGeo, lampMat, poleCoords.length);

  poleCoords.forEach((p, idx) => {
    dummy.position.set(p.x, 3.9, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poleInst.setMatrixAt(idx, dummy.matrix);

    const rightX = Math.cos(p.heading);
    const rightZ = Math.sin(p.heading);
    dummy.position.set(p.x - rightX * 0.75, 7.2, p.z - rightZ * 0.75);
    dummy.rotation.set(0, -p.heading, Math.PI / 2 - 0.18);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    armInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(p.x - rightX * 1.45, 7.32, p.z - rightZ * 1.45);
    dummy.rotation.set(0, -p.heading, 0);
    dummy.scale.set(0.32, 0.14, 0.55);
    dummy.updateMatrix();
    lampInst.setMatrixAt(idx, dummy.matrix);
  });
  poleInst.instanceMatrix.needsUpdate = true;
  poleInst.computeBoundingSphere();
  armInst.instanceMatrix.needsUpdate = true;
  armInst.computeBoundingSphere();
  lampInst.instanceMatrix.needsUpdate = true;
  lampInst.computeBoundingSphere();
  worldGroup.add(poleInst, armInst, lampInst);

  // Connect consecutive utility poles with overhead electric cables
  const wireSegs: { mx: number; mz: number; len: number; yaw: number }[] = [];
  for (let i = 0; i < poleCoords.length - 1; i++) {
    const a = poleCoords[i];
    const b = poleCoords[i + 1];
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    if (dist > 4 && dist < 85) {
      wireSegs.push({
        mx: (a.x + b.x) * 0.5,
        mz: (a.z + b.z) * 0.5,
        len: dist,
        yaw: Math.atan2(b.x - a.x, b.z - a.z),
      });
    }
  }
  if (wireSegs.length > 0) {
    const wireInst = new THREE.InstancedMesh(wireGeo, wireMat, wireSegs.length * 2);
    wireSegs.forEach((ws, idx) => {
      for (let strand = 0; strand < 2; strand++) {
        dummy.position.set(ws.mx, 7.35 + strand * 0.35, ws.mz);
        dummy.rotation.set(0, ws.yaw, 0);
        dummy.scale.set(1, 1, ws.len);
        dummy.updateMatrix();
        wireInst.setMatrixAt(idx * 2 + strand, dummy.matrix);
      }
    });
    wireInst.instanceMatrix.needsUpdate = true;
    wireInst.computeBoundingSphere();
    worldGroup.add(wireInst);
  }

  // 6. GTA-Style District Perimeter Roadblocks (on every drivable road crossing DISTRICT_BOUNDS)
  const barrierMat = new THREE.MeshStandardMaterial({ map: textures.jerseyBarrier, roughness: 0.72 });
  const signBlockMat = new THREE.MeshStandardMaterial({ map: textures.roadClosedSign, roughness: 0.48 });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.42 });
  const coneStripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const barrierGeo = new THREE.BoxGeometry(2.6, 1.05, 0.85);
  const closedSignGeo = new THREE.BoxGeometry(3.4, 1.55, 0.14);
  const coneGeo = new THREE.ConeGeometry(0.28, 0.78, 10);
  const beaconGeo = new THREE.SphereGeometry(0.18, 8, 8);
  disposables.push(barrierMat, signBlockMat, coneMat, coneStripeMat, barrierGeo, closedSignGeo, coneGeo, beaconGeo);

  const roadblockPlacements: { x: number; z: number; roadHeading: number; width: number }[] = [];
  const tryAddRoadblock = (x: number, z: number, roadHeading: number, width: number) => {
    if (minDistToRoute(world, x, z) < 16) return;
    for (const ex of roadblockPlacements) {
      if (Math.hypot(ex.x - x, ex.z - z) < 11) return;
    }
    roadblockPlacements.push({ x, z, roadHeading, width });
  };

  for (const r of world.drivableRoads) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, az] = r.pts[i];
      const [bx, bz] = r.pts[i + 1];
      const heading = Math.atan2(bx - ax, -(bz - az));
      const checkAxis = (p0: number, p1: number, q0: number, q1: number, bound: number, isX: boolean) => {
        if ((p0 - bound) * (p1 - bound) <= 0 && Math.abs(p1 - p0) > 1e-4) {
          const t = (bound - p0) / (p1 - p0);
          if (t >= 0 && t <= 1) {
            const q = q0 + (q1 - q0) * t;
            const ix = isX ? bound : q;
            const iz = isX ? q : bound;
            if (
              ix >= DISTRICT_BOUNDS.minX - 6 &&
              ix <= DISTRICT_BOUNDS.maxX + 6 &&
              iz >= DISTRICT_BOUNDS.minZ - 6 &&
              iz <= DISTRICT_BOUNDS.maxZ + 6
            ) {
              tryAddRoadblock(ix, iz, heading, r.width);
            }
          }
        }
      };
      checkAxis(ax, bx, az, bz, DISTRICT_BOUNDS.minX, true);
      checkAxis(ax, bx, az, bz, DISTRICT_BOUNDS.maxX, true);
      checkAxis(az, bz, ax, bx, DISTRICT_BOUNDS.minZ, false);
      checkAxis(az, bz, ax, bx, DISTRICT_BOUNDS.maxZ, false);
    }
  }

  for (const rb of roadblockPlacements) {
    const rbGroup = new THREE.Group();
    rbGroup.position.set(rb.x, 0, rb.z);
    rbGroup.rotation.y = -rb.roadHeading;

    const span = Math.max(7.2, rb.width + 1.4);
    const numBarriers = Math.max(2, Math.round(span / 2.9));
    for (let b = 0; b < numBarriers; b++) {
      const lx = (b - (numBarriers - 1) * 0.5) * 2.85;
      const jersey = new THREE.Mesh(barrierGeo, barrierMat);
      jersey.position.set(lx, 0.525, 0);
      jersey.castShadow = true;
      jersey.receiveShadow = true;
      rbGroup.add(jersey);

      // Push physical collision sphere into world coordinates
      const cos = Math.cos(-rb.roadHeading);
      const sin = Math.sin(-rb.roadHeading);
      roadblockColliders.push({
        x: rb.x + lx * cos,
        z: rb.z - lx * sin,
        radius: 1.5,
      });
    }

    // Center "ROAD CLOSED / መንገድ ተዘግቷል" signboard on twin metal posts
    for (const px of [-1.35, 1.35]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6), steelStrutMat);
      post.position.set(px, 1.25, -0.45);
      rbGroup.add(post);

      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      disposables.push(beaconMat);
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(px, 2.6, -0.45);
      rbGroup.add(beacon);
      roadblockBeacons.push(beacon);
    }
    const board = new THREE.Mesh(closedSignGeo, signBlockMat);
    board.position.set(0, 1.78, -0.35);
    board.castShadow = true;
    rbGroup.add(board);

    // Orange traffic cones in front & behind barricade
    for (const cx of [-span * 0.36, 0, span * 0.36]) {
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(cx, 0.39, 1.35);
      rbGroup.add(cone);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.21, 0.16, 10), coneStripeMat);
      band.position.set(cx, 0.42, 1.35);
      rbGroup.add(band);
    }

    worldGroup.add(rbGroup);
  }

  // 7. Stop Bays & Addis Taxi Signposts along the right curb
  const postMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.45, metalness: 0.4 });
  const signHeadMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });
  disposables.push(postMat, signHeadMat);

  for (const stop of world.stops) {
    const bayMat = new THREE.MeshBasicMaterial({
      color: stop.isFinish ? 0xf59e0b : 0x10b981,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    const bayGeo = new THREE.PlaneGeometry(3.2, 7.4);
    disposables.push(bayMat, bayGeo);

    const bayMesh = new THREE.Mesh(bayGeo, bayMat);
    bayMesh.rotation.x = -Math.PI / 2;
    bayMesh.rotation.z = -stop.heading;
    bayMesh.position.set(stop.curbX, 0.07, stop.curbZ);
    worldGroup.add(bayMesh);

    const rightX = Math.cos(stop.heading);
    const rightZ = Math.sin(stop.heading);
    const sx = stop.curbX + rightX * 2.1;
    const sz = stop.curbZ + rightZ * 2.1;

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.1, 8), postMat);
    post.position.set(sx, 1.55, sz);
    worldGroup.add(post);

    const signHead = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.52, 0.08), signHeadMat);
    signHead.position.set(sx, 3.15, sz);
    signHead.rotation.y = -stop.heading;
    worldGroup.add(signHead);

    const beaconMat = new THREE.MeshBasicMaterial({
      color: stop.isFinish ? 0xfbbf24 : 0x34d399,
      transparent: true,
      opacity: 0.65,
    });
    const beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), beaconMat);
    beaconMesh.position.set(sx, 3.9, sz);
    worldGroup.add(beaconMesh);
    disposables.push(beaconMat);

    stopVisuals.set(stop.id, { stop, bayMesh, bayMat, beaconMesh });
  }

  return {
    worldGroup,
    stopVisuals,
    roadblockColliders,
    roadblockBeacons,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}
