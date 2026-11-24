import * as THREE from 'three';
import type { BuildingFootprint, MerkatoWorldData, RoadSegment, TaxiStop } from '../../data/merkatoRoutes';
import type { TextureBundle } from '../textures';

export interface StopVisual {
  stop: TaxiStop;
  bayMesh: THREE.Mesh;
  bayMat: THREE.MeshBasicMaterial;
  beaconMesh: THREE.Mesh;
}

export interface MerkatoSceneAssets {
  worldGroup: THREE.Group;
  stopVisuals: Map<string, StopVisual>;
  dispose: () => void;
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
    // Perpendicular in XZ
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
  const shutterMat = new THREE.MeshStandardMaterial({ map: textures.shutterGrey, roughness: 0.5, metalness: 0.4 });

  // Scale conservatively to fit OSM footprint (~120m x ~120m courtyard & prayer hall)
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

  // Scalloped merlons along parapet top
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

  // 4 Flanking Corner Turret Cupolas
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

  // Iconic Tall Stone-Tiled Minaret (visible from Kenya St & Tesema Aba Kemaw St!)
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

  // Streetfront Electronics Shop Row along the outer perimeter (matches Wikimedia street photo!)
  const signTexList = textures.shopSigns;
  for (let i = 0; i < 4; i++) {
    const sz = -d * 0.3 + i * 11.5;
    const shopBody = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.8, 10.6), shutterMat);
    shopBody.position.set(w * 0.49, 1.9, sz);
    shopBody.castShadow = true;
    group.add(shopBody);

    const roofAwning = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.25, 10.8), zincMat);
    roofAwning.position.set(w * 0.5, 4.0, sz);
    roofAwning.rotation.z = -0.14;
    group.add(roofAwning);

    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 1.45, 9.6),
      new THREE.MeshStandardMaterial({ map: signTexList[i % signTexList.length], roughness: 0.45 })
    );
    signBoard.position.set(w * 0.535, 4.65, sz);
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

  // Stepped circular/octagonal plinth
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(20, 21.5, 1.1, 8), creamMat);
  plinth.position.y = 0.55;
  plinth.receiveShadow = true;
  group.add(plinth);

  // Main Octagonal Ethiopian Orthodox Sanctuary Body
  const mainBody = new THREE.Mesh(new THREE.CylinderGeometry(16.5, 17.0, 9.6, 8), stoneMat);
  mainBody.position.y = 1.1 + 4.8;
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  group.add(mainBody);

  // Cardinal arched entry porticos
  for (const ang of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    const porch = new THREE.Mesh(new THREE.BoxGeometry(5.2, 6.2, 3.2), creamMat);
    porch.position.set(Math.sin(ang) * 16.5, 4.2, Math.cos(ang) * 16.5);
    porch.rotation.y = ang;
    porch.castShadow = true;
    group.add(porch);
  }

  // Tiered Conical Octagonal Roof
  const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(19.2, 5.2, 8), roofMat);
  lowerRoof.position.y = 1.1 + 9.6 + 2.4;
  lowerRoof.castShadow = true;
  group.add(lowerRoof);

  // Upper Lantern Drum + Dome
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

  // Ethiopian Orthodox Processional Cross on Top
  const crossPost = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.2, 8), goldMat);
  crossPost.position.y = 24.4;
  group.add(crossPost);
  const crossBar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.32, 0.24), goldMat);
  crossBar.position.y = 25.1;
  group.add(crossBar);
  const crossRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.14, 8, 16), goldMat);
  crossRing.position.y = 25.1;
  group.add(crossRing);

  // Compound perimeter stone wall & gate facing Kenya St (SE side)
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

  // Gate arch on Kenya Street side
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

  // 1. Ground Terrain extending far beyond playable area + distant Entoto mountain rim (no floating void!)
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xb99d79,
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

  // Distant Entoto highland ridge in the background (North & West horizon)
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

  // 2. Roads (drivable asphalt + pedestrian-only cobble alleys)
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: textures.asphalt,
    roughness: 0.88,
    metalness: 0.04,
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
    color: 0x3b3c3e,
    roughness: 0.88,
  });
  disposables.push(asphaltMat, pedMat, asphaltCapMat);

  const junctionSeen = new Set<string>();
  const junctionCapGeo = new THREE.CircleGeometry(1, 14);
  disposables.push(junctionCapGeo);

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
    }
  };

  for (const r of world.pedestrianRoads) addRoad(r, true);
  for (const r of world.drivableRoads) addRoad(r, false);

  // Extra paved U-turn plaza apron at Tesema Aba Kemaw South Crossover (146..154, 179..182)
  const plazaGeo = new THREE.CircleGeometry(12.5, 20);
  disposables.push(plazaGeo);
  const uturnPlaza = new THREE.Mesh(plazaGeo, asphaltCapMat);
  uturnPlaza.rotation.x = -Math.PI / 2;
  uturnPlaza.position.set(150, 0.038, 180.5);
  uturnPlaza.receiveShadow = true;
  worldGroup.add(uturnPlaza);

  // 3. Route Guide Chevrons (subtle painted arrows on asphalt along active mission route)
  const routeChevronMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const chevronGeo = new THREE.ConeGeometry(0.75, 1.6, 3);
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
  const dummy = new THREE.Object3D();
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

  // 4. Hero Landmarks (Anwar Grand Mosque + St. Raguel Church) + Reusable Merkato Shopfronts
  const shutterMat = new THREE.MeshStandardMaterial({ map: textures.shutterGrey, roughness: 0.52, metalness: 0.32 });
  const zincMat = new THREE.MeshStandardMaterial({ map: textures.corrugatedZinc, roughness: 0.58, metalness: 0.35 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ map: textures.sidewalk, roughness: 0.85 });
  const commercialMats = textures.commercialFacade.map(
    (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78 })
  );
  const signMats = textures.shopSigns.map(
    (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 })
  );
  disposables.push(shutterMat, zincMat, sidewalkMat, ...commercialMats, ...signMats);

  // Shared unit geometries for modular buildings
  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const signPlaneGeo = new THREE.BoxGeometry(1, 0.95, 0.14);
  disposables.push(unitBoxGeo, signPlaneGeo);

  // Collect instanced shop base boxes, awnings, and sidewalks for crisp frame rates on ordinary laptops
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

  // Build reusable shopfront & multi-story blocks
  const shopGroundInst = new THREE.InstancedMesh(unitBoxGeo, shutterMat, genericShops.length);
  const awningInst = new THREE.InstancedMesh(unitBoxGeo, zincMat, genericShops.length);
  const sidewalkInst = new THREE.InstancedMesh(unitBoxGeo, sidewalkMat, genericShops.length);
  shopGroundInst.castShadow = true;
  shopGroundInst.receiveShadow = true;
  awningInst.castShadow = true;
  sidewalkInst.receiveShadow = true;

  const upperStories: { b: BuildingFootprint; matIdx: number }[] = [];
  const signEntries: { b: BuildingFootprint; signIdx: number }[] = [];

  genericShops.forEach((b, idx) => {
    const bw = Math.min(34, b.width * 0.9);
    const bd = Math.min(28, b.depth * 0.9);
    const groundH = 3.5;

    // Ground floor shop with rolling shutters
    dummy.position.set(b.cx, groundH / 2, b.cz);
    dummy.rotation.set(0, -b.angle, 0);
    dummy.scale.set(bw, groundH, bd);
    dummy.updateMatrix();
    shopGroundInst.setMatrixAt(idx, dummy.matrix);

    // Corrugated zinc overhang awning
    dummy.position.set(b.cx, groundH + 0.18, b.cz);
    dummy.rotation.set(0.06, -b.angle, 0);
    dummy.scale.set(bw + 1.1, 0.22, bd + 1.1);
    dummy.updateMatrix();
    awningInst.setMatrixAt(idx, dummy.matrix);

    // Sidewalk apron around shop
    dummy.position.set(b.cx, 0.08, b.cz);
    dummy.rotation.set(0, -b.angle, 0);
    dummy.scale.set(bw + 1.8, 0.16, bd + 1.8);
    dummy.updateMatrix();
    sidewalkInst.setMatrixAt(idx, dummy.matrix);

    if (b.levels >= 2 || b.kind === 'mall' || b.kind === 'commercial') {
      upperStories.push({ b, matIdx: idx % commercialMats.length });
    }
    if (idx % 2 === 0 && bw >= 5) {
      signEntries.push({ b, signIdx: idx % signMats.length });
    }
  });

  shopGroundInst.instanceMatrix.needsUpdate = true;
  shopGroundInst.computeBoundingSphere();
  awningInst.instanceMatrix.needsUpdate = true;
  awningInst.computeBoundingSphere();
  sidewalkInst.instanceMatrix.needsUpdate = true;
  sidewalkInst.computeBoundingSphere();
  worldGroup.add(sidewalkInst, shopGroundInst, awningInst);

  // Upper commercial stories batched by facade material
  for (let m = 0; m < commercialMats.length; m++) {
    const batch = upperStories.filter((u) => u.matIdx === m);
    if (!batch.length) continue;
    const inst = new THREE.InstancedMesh(unitBoxGeo, commercialMats[m], batch.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    batch.forEach(({ b }, i) => {
      const bw = Math.min(34, b.width * 0.9);
      const bd = Math.min(28, b.depth * 0.9);
      const upperH = Math.min(18, Math.max(3.4, (b.levels - 1) * 3.4));
      dummy.position.set(b.cx, 3.6 + upperH / 2, b.cz);
      dummy.rotation.set(0, -b.angle, 0);
      dummy.scale.set(bw * 0.97, upperH, bd * 0.97);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    worldGroup.add(inst);
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
      const offsetZ = bd * 0.5 + 0.16;
      const sin = Math.sin(-b.angle);
      const cos = Math.cos(-b.angle);
      dummy.position.set(b.cx + sin * offsetZ, 4.05, b.cz + cos * offsetZ);
      dummy.rotation.set(0, -b.angle, 0);
      dummy.scale.set(signW, 1, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    worldGroup.add(inst);
  }

  // 5. Wooden Utility Poles along the route (seen in every Merkato photo!)
  const poleGeo = new THREE.CylinderGeometry(0.11, 0.15, 7.6, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x5c4632, roughness: 0.92 });
  disposables.push(poleGeo, poleMat);
  const poleCoords: [number, number][] = [];
  for (let i = 0; i < world.route.length; i += 4) {
    const rp = world.route[i];
    const rightX = Math.cos(rp.heading);
    const rightZ = Math.sin(rp.heading);
    poleCoords.push([rp.x + rightX * 5.6, rp.z + rightZ * 5.6]);
  }
  const poleInst = new THREE.InstancedMesh(poleGeo, poleMat, poleCoords.length);
  poleCoords.forEach(([px, pz], idx) => {
    dummy.position.set(px, 3.8, pz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poleInst.setMatrixAt(idx, dummy.matrix);
  });
  poleInst.instanceMatrix.needsUpdate = true;
  poleInst.computeBoundingSphere();
  worldGroup.add(poleInst);

  // 6. Stop Bays & Addis Taxi Signposts along the right curb
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

    // Stop Signpost on sidewalk just right of bay
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
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}
