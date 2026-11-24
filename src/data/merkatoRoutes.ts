import rawMapData from './merkatoMapData.json';

export interface RoadSegment {
  id: number;
  name: string;
  nameAm: string;
  highway: string;
  oneway: boolean;
  isPedestrian: boolean;
  width: number;
  pts: [number, number][];
}

export type BuildingKind = 'mosque' | 'church' | 'commercial' | 'mall' | 'shop';

export interface BuildingFootprint {
  id: number;
  name: string;
  nameAm: string;
  kind: BuildingKind;
  levels: number;
  poly: [number, number][];
  cx: number;
  cz: number;
  width: number;
  depth: number;
  angle: number;
  radius: number;
}

export interface RoutePoint {
  id: number;
  x: number;
  z: number;
  s: number;
  heading: number; // radians, 0 = -Z (North), +PI/2 = +X (East)
}

export interface TaxiStop {
  id: string;
  name: string;
  nameAm: string;
  subtitle: string;
  nodeId: number;
  routeIdx: number;
  s: number;
  roadX: number;
  roadZ: number;
  curbX: number;
  curbZ: number;
  heading: number;
  isStart?: boolean;
  isFinish?: boolean;
  verifiedOsmName: string;
}

export interface TurnCue {
  direction: 'left' | 'right' | 'uturn' | 'straight';
  streetName: string;
  distanceM: number;
  s: number;
}

export interface MerkatoWorldData {
  origin: { lat: number; lon: number };
  attribution: string;
  routeLabel: string;
  roads: RoadSegment[];
  drivableRoads: RoadSegment[];
  pedestrianRoads: RoadSegment[];
  buildings: BuildingFootprint[];
  route: RoutePoint[];
  totalRouteLength: number;
  stops: TaxiStop[];
  turnCues: TurnCue[];
}

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

function computeBuildingBounds(poly: [number, number][]): {
  cx: number;
  cz: number;
  width: number;
  depth: number;
  angle: number;
  radius: number;
} {
  let cx = 0;
  let cz = 0;
  for (const [x, z] of poly) {
    cx += x;
    cz += z;
  }
  cx /= poly.length;
  cz /= poly.length;

  // Dominant edge orientation
  let bestLen = 0;
  let angle = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len > bestLen) {
      bestLen = len;
      angle = Math.atan2(dz, dx);
    }
  }

  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  let maxR = 0;
  for (const [x, z] of poly) {
    const rx = x - cx;
    const rz = z - cz;
    maxR = Math.max(maxR, Math.hypot(rx, rz));
    const u = rx * cos - rz * sin;
    const v = rx * sin + rz * cos;
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    minV = Math.min(minV, v);
    maxV = Math.max(maxV, v);
  }

  return {
    cx,
    cz,
    width: Math.max(3, maxU - minU),
    depth: Math.max(3, maxV - minV),
    angle,
    radius: Math.max(2, maxR),
  };
}

let cachedWorld: MerkatoWorldData | null = null;

export function getMerkatoWorld(): MerkatoWorldData {
  if (cachedWorld) return cachedWorld;

  const roads = (rawMapData.roads as RoadSegment[]).map((r) => ({
    ...r,
    pts: r.pts.map((p) => [p[0], p[1]] as [number, number]),
  }));
  const drivableRoads = roads.filter((r) => !r.isPedestrian);
  const pedestrianRoads = roads.filter((r) => r.isPedestrian);

  // Build route points with arc length s & heading
  const rawRoute = rawMapData.routePts as { id: number; x: number; z: number }[];
  const route: RoutePoint[] = [];
  let accumS = 0;
  for (let i = 0; i < rawRoute.length; i++) {
    const cur = rawRoute[i];
    if (i > 0) {
      const prev = rawRoute[i - 1];
      accumS += Math.hypot(cur.x - prev.x, cur.z - prev.z);
    }
    const next = rawRoute[Math.min(rawRoute.length - 1, i + 1)];
    const prev = rawRoute[Math.max(0, i - 1)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    // Heading where 0 = -Z (North), +PI/2 = +X (East) -> atan2(dx, -dz)
    const heading = Math.atan2(dx, -dz);
    route.push({ id: cur.id, x: cur.x, z: cur.z, s: accumS, heading });
  }
  const totalRouteLength = route[route.length - 1].s;

  // Filter or trim generic building boxes so OBB corners never encroach onto the active route lane
  const buildings: BuildingFootprint[] = [];
  for (const b of rawMapData.buildings as {
    id: number;
    name: string;
    nameAm: string;
    kind: BuildingKind;
    levels: number;
    poly: [number, number][];
  }[]) {
    const bounds = computeBuildingBounds(b.poly);
    let minRouteDistSq = Infinity;
    const hw = Math.min(34, bounds.width * 0.9) * 0.5;
    const hd = Math.min(28, bounds.depth * 0.9) * 0.5;
    const cos = Math.cos(bounds.angle);
    const sin = Math.sin(bounds.angle);
    const localPts: [number, number][] = [
      [0, 0],
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
      [0, -hd],
      [0, hd],
      [-hw, 0],
      [hw, 0],
    ];
    const testPts: [number, number][] = localPts.map(([lx, lz]) => [
      bounds.cx + (lx * cos + lz * sin),
      bounds.cz + (-lx * sin + lz * cos),
    ]);
    for (let i = 0; i < route.length - 1; i++) {
      for (const [tx, tz] of testPts) {
        const dSq = pointToSegDistSq(tx, tz, route[i].x, route[i].z, route[i + 1].x, route[i + 1].z);
        if (dSq < minRouteDistSq) minRouteDistSq = dSq;
      }
    }
    if (b.kind !== 'mosque' && b.kind !== 'church' && minRouteDistSq < 25) {
      continue;
    }
    buildings.push({
      ...b,
      ...bounds,
    });
  }

  // Build stops with right-hand curb bay position (Ethiopia drives on the RIGHT)
  const stops: TaxiStop[] = (
    rawMapData.stops as {
      id: string;
      name: string;
      nameAm: string;
      subtitle: string;
      nodeId: number;
      routeIdx: number;
      isStart?: boolean;
      isFinish?: boolean;
      verifiedOsmName: string;
    }[]
  ).map((st) => {
    const rp = route[Math.min(route.length - 1, Math.max(0, st.routeIdx))];
    // Right-hand perpendicular vector for heading: forward = (sin(h), -cos(h)), right = (cos(h), sin(h))
    const rightX = Math.cos(rp.heading);
    const rightZ = Math.sin(rp.heading);
    const curbOffset = 2.3; // pull alongside right edge of lane
    return {
      ...st,
      s: rp.s,
      roadX: rp.x,
      roadZ: rp.z,
      curbX: rp.x + rightX * curbOffset,
      curbZ: rp.z + rightZ * curbOffset,
      heading: rp.heading,
    };
  });

  // Precompute major turn cues along the route
  const turnCues: TurnCue[] = [
    {
      direction: 'right',
      streetName: 'Tesema Aba Kemaw St (Southbound)',
      distanceM: 0,
      s: route[26].s,
    },
    {
      direction: 'uturn',
      streetName: 'Tesema Aba Kemaw St (Northbound -> Anwar Mosque)',
      distanceM: 0,
      s: route[35].s,
    },
    {
      direction: 'left',
      streetName: 'Fitawrari Habte Giorgis St (Westbound)',
      distanceM: 0,
      s: route[51].s,
    },
    {
      direction: 'left',
      streetName: 'Autobis Tera Link Rd (Southbound)',
      distanceM: 0,
      s: route[85].s,
    },
    {
      direction: 'right',
      streetName: 'Kenya St (Autobis Tera Terminal)',
      distanceM: 0,
      s: route[107].s,
    },
  ];

  cachedWorld = {
    origin: rawMapData.meta.origin,
    attribution: rawMapData.meta.attribution,
    routeLabel: rawMapData.meta.routeLabel,
    roads,
    drivableRoads,
    pedestrianRoads,
    buildings,
    route,
    totalRouteLength,
    stops,
    turnCues,
  };
  return cachedWorld;
}

export function sampleRouteAtS(route: RoutePoint[], targetS: number): {
  x: number;
  z: number;
  heading: number;
  s: number;
} {
  const s = Math.max(0, Math.min(route[route.length - 1].s, targetS));
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    if (s <= b.s || i === route.length - 2) {
      const span = Math.max(0.001, b.s - a.s);
      const t = Math.max(0, Math.min(1, (s - a.s) / span));
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      const heading = Math.atan2(b.x - a.x, -(b.z - a.z));
      return { x, z, heading, s };
    }
  }
  const last = route[route.length - 1];
  return { x: last.x, z: last.z, heading: last.heading, s: last.s };
}

export function findClosestRoutePoint(
  route: RoutePoint[],
  px: number,
  pz: number,
  hintS?: number
): { s: number; dist: number; x: number; z: number; heading: number } {
  let bestDistSq = Infinity;
  let bestS = 0;
  let bestX = route[0].x;
  let bestZ = route[0].z;
  let bestHeading = route[0].heading;

  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    // If hintS provided, softly prefer segments near hintS when route overlaps near start/end
    if (hintS !== undefined && Math.abs(a.s - hintS) > 450 && Math.abs(b.s - hintS) > 450) {
      continue;
    }
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const lenSq = vx * vx + vz * vz;
    if (lenSq < 1e-6) continue;
    const t = Math.max(0, Math.min(1, ((px - a.x) * vx + (pz - a.z) * vz) / lenSq));
    const cx = a.x + vx * t;
    const cz = a.z + vz * t;
    const dSq = (px - cx) ** 2 + (pz - cz) ** 2;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestS = a.s + (b.s - a.s) * t;
      bestX = cx;
      bestZ = cz;
      bestHeading = Math.atan2(vx, -vz);
    }
  }

  if (bestDistSq === Infinity && hintS !== undefined) {
    return findClosestRoutePoint(route, px, pz);
  }

  return {
    s: bestS,
    dist: Math.sqrt(bestDistSq),
    x: bestX,
    z: bestZ,
    heading: bestHeading,
  };
}
