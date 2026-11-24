import { useEffect, useRef } from 'react';
import type { MerkatoWorldData } from '../data/merkatoRoutes';

interface MinimapProps {
  world: MerkatoWorldData;
  playerX: number;
  playerZ: number;
  playerHeading: number;
  currentStopIndex: number;
}

export function Minimap({
  world,
  playerX,
  playerZ,
  playerHeading,
  currentStopIndex,
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = 0.54; // pixels per meter (~330m view radius)

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#181614';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);

    const toPx = (wx: number, wz: number): [number, number] => [
      (wx - playerX) * scale,
      (wz - playerZ) * scale,
    ];

    // 1. Buildings from same OSM footprint data
    for (const b of world.buildings) {
      const [cx, cz] = toPx(b.cx, b.cz);
      if (Math.abs(cx) > w && Math.abs(cz) > h) continue;

      ctx.beginPath();
      b.poly.forEach(([px, pz], i) => {
        const [sx, sy] = toPx(px, pz);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();

      if (b.kind === 'mosque') {
        ctx.fillStyle = '#1d6b45';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.2;
        ctx.fill();
        ctx.stroke();
      } else if (b.kind === 'church') {
        ctx.fillStyle = '#8b5e2b';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.2;
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = '#2b2824';
        ctx.fill();
      }
    }

    // 2. Pedestrian-only alleys (dashed ochre)
    ctx.strokeStyle = '#6b5a45';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([3, 3]);
    for (const r of world.pedestrianRoads) {
      ctx.beginPath();
      r.pts.forEach(([px, pz], i) => {
        const [sx, sy] = toPx(px, pz);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 3. Drivable streets
    for (const r of world.drivableRoads) {
      ctx.strokeStyle = r.highway === 'primary' || r.highway === 'secondary' ? '#57534e' : '#3f3b37';
      ctx.lineWidth = Math.max(2, r.width * scale * 0.68);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      r.pts.forEach(([px, pz], i) => {
        const [sx, sy] = toPx(px, pz);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
    }

    // 4. Active mission route line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    world.route.forEach((pt, i) => {
      const [sx, sy] = toPx(pt.x, pt.z);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    // 5. Passenger stops
    world.stops.forEach((st, idx) => {
      const [sx, sy] = toPx(st.curbX, st.curbZ);
      const isCurrent = idx === currentStopIndex;
      const isPast = idx < currentStopIndex;

      ctx.beginPath();
      ctx.arc(sx, sy, isCurrent ? 5.5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent ? '#10b981' : isPast ? '#64748b' : '#f59e0b';
      ctx.fill();
      if (isCurrent) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    });

    // 6. Player Minibus Heading Arrow at center (0, 0)
    ctx.save();
    ctx.rotate(playerHeading);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5.5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5.5, 6);
    ctx.closePath();
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    // Subtle North tag & OSM attribution
    ctx.fillStyle = 'rgba(24,22,20,0.78)';
    ctx.fillRect(0, h - 15, w, 15);
    ctx.fillStyle = '#a8a29e';
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillText('© OpenStreetMap contributors', 6, h - 4);
    ctx.fillStyle = '#e7e5e4';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText('N', w - 14, 13);
  }, [world, playerX, playerZ, playerHeading, currentStopIndex]);

  return (
    <div className="border border-stone-700/90 bg-stone-950/95 rounded-md overflow-hidden shadow-lg">
      <canvas ref={canvasRef} width={186} height={186} className="block w-[166px] h-[166px] sm:w-[186px] sm:h-[186px]" />
    </div>
  );
}
