import * as THREE from 'three';

export interface TextureBundle {
  asphalt: THREE.CanvasTexture;
  asphaltBump: THREE.CanvasTexture;
  sidewalk: THREE.CanvasTexture;
  pedestrianLane: THREE.CanvasTexture;
  corrugatedZinc: THREE.CanvasTexture;
  shutterGrey: THREE.CanvasTexture;
  shopInteriorBays: THREE.CanvasTexture[];
  stuccoWalls: THREE.CanvasTexture[];
  mosqueWall: THREE.CanvasTexture;
  minaretTile: THREE.CanvasTexture;
  churchStone: THREE.CanvasTexture;
  commercialFacade: THREE.CanvasTexture[];
  shopSigns: THREE.CanvasTexture[];
  taxiPlate: THREE.CanvasTexture;
  jerseyBarrier: THREE.CanvasTexture;
  roadClosedSign: THREE.CanvasTexture;
  crosswalk: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function finalizeTex(
  canvas: HTMLCanvasElement,
  maxAniso: number,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = maxAniso;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createMerkatoTextures(maxAniso: number): TextureBundle {
  const all: THREE.CanvasTexture[] = [];
  const reg = (t: THREE.CanvasTexture) => {
    all.push(t);
    return t;
  };

  // 1. Realistic Addis Ababa Asphalt (tire wear tracks, aggregate, dust shoulders, crisp lane dashes)
  const asphalt = (() => {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#313235';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle longitudinal tire wear bands in left & right lanes
    const laneWear = (cx: number) => {
      const g = ctx.createLinearGradient(cx - 48, 0, cx + 48, 0);
      g.addColorStop(0, 'rgba(20,20,22,0)');
      g.addColorStop(0.5, 'rgba(18,18,20,0.38)');
      g.addColorStop(1, 'rgba(20,20,22,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 48, 0, 96, 512);
    };
    laneWear(135);
    laneWear(377);

    // Asphalt aggregate grain + subtle tar patches
    for (let i = 0; i < 12000; i++) {
      const x = (i * 97 + (i % 13) * 19) % 512;
      const y = (i * 211 + (i % 29) * 37) % 512;
      const v = 36 + (i % 44);
      ctx.fillStyle = `rgb(${v},${v},${v + 2})`;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.fillStyle = 'rgba(26, 26, 28, 0.45)';
    ctx.fillRect(82, 110, 58, 72);
    ctx.fillRect(320, 340, 74, 48);

    // Dusty highland red-brown gutter wash near curbs
    const leftGrad = ctx.createLinearGradient(0, 0, 54, 0);
    leftGrad.addColorStop(0, 'rgba(132, 98, 66, 0.72)');
    leftGrad.addColorStop(1, 'rgba(132, 98, 66, 0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, 54, 512);

    const rightGrad = ctx.createLinearGradient(512, 0, 458, 0);
    rightGrad.addColorStop(0, 'rgba(132, 98, 66, 0.72)');
    rightGrad.addColorStop(1, 'rgba(132, 98, 66, 0)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(458, 0, 54, 512);

    // Crisp edge lines & dashed center line
    ctx.fillStyle = 'rgba(235, 232, 222, 0.45)';
    ctx.fillRect(26, 0, 5, 512);
    ctx.fillRect(481, 0, 5, 512);

    ctx.fillStyle = 'rgba(245, 210, 88, 0.85)';
    for (let y = 18; y < 512; y += 128) {
      ctx.fillRect(251, y, 10, 68);
    }
    return reg(finalizeTex(c, maxAniso, true));
  })();

  // Linear bump map for asphalt grain
  const asphaltBump = (() => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9000; i++) {
      const x = (i * 59) % 256;
      const y = (i * 173 + (i % 19) * 11) % 256;
      const v = 90 + (i % 90);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
    return reg(finalizeTex(c, maxAniso, false));
  })();

  // 2. Concrete sidewalk tiles with weathered joints
  const sidewalk = (() => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#a59a89';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 64) {
      for (let x = 0; x < 256; x += 64) {
        const shade = 152 + ((x * 5 + y * 7) % 24);
        ctx.fillStyle = `rgb(${shade},${shade - 7},${shade - 18})`;
        ctx.fillRect(x + 2, y + 2, 60, 60);
      }
    }
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = 'rgba(70, 60, 48, 0.16)';
      ctx.fillRect((i * 43) % 256, (i * 113) % 256, 2, 2);
    }
    return reg(finalizeTex(c, maxAniso, true, 3, 3));
  })();

  // 3. Pedestrian-only market cobble alley
  const pedestrianLane = (() => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#7e6a54';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      for (let x = 0; x < 256; x += 32) {
        const off = (y / 32) % 2 === 0 ? 0 : 16;
        const s = 114 + ((x * 7 + y * 11) % 34);
        ctx.fillStyle = `rgb(${s + 14},${s + 2},${s - 15})`;
        ctx.fillRect((x + off) % 256 + 2, y + 2, 27, 27);
      }
    }
    return reg(finalizeTex(c, maxAniso, true, 2, 6));
  })();

  // 4. Corrugated zinc/tin roof & awning ("ቆርቆሮ")
  const corrugatedZinc = (() => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#7f858b';
    ctx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 10) {
      const g = ctx.createLinearGradient(x, 0, x + 10, 0);
      g.addColorStop(0, '#4f5459');
      g.addColorStop(0.5, '#c2c8ce');
      g.addColorStop(1, '#4f5459');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 10, 256);
    }
    // Authentic rust & dust weathering streaks
    ctx.fillStyle = 'rgba(136, 70, 34, 0.28)';
    ctx.fillRect(24, 30, 70, 110);
    ctx.fillRect(148, 120, 82, 95);
    return reg(finalizeTex(c, maxAniso, true, 2, 1));
  })();

  // 5. Rolling steel shop shutter
  const shutterGrey = (() => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#5e666e';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 12) {
      ctx.fillStyle = '#8b939c';
      ctx.fillRect(0, y, 256, 6);
      ctx.fillStyle = '#3f454b';
      ctx.fillRect(0, y + 6, 256, 3);
    }
    ctx.strokeStyle = '#2d3236';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 248);
    return reg(finalizeTex(c, maxAniso, true));
  })();

  // 6. Open Realistic Merkato Shop Interior Bays (with shelves, goods, hanging clothes, open doorway!)
  const shopInteriorConfigs = [
    { wall: '#e8dcc8', accent: '#1e6bb8', itemColors: ['#2563eb', '#f59e0b', '#e11d48', '#f8fafc'], label: 'SHAMMA & TEXTILES' },
    { wall: '#dde4ea', accent: '#155e75', itemColors: ['#111827', '#334155', '#0ea5e9', '#e2e8f0'], label: 'ELECTRONICS' },
    { wall: '#eed9b7', accent: '#b45309', itemColors: ['#b91c1c', '#d97706', '#ca8a04', '#78350f'], label: 'SPICES & BUNA' },
    { wall: '#dfe5dc', accent: '#166534', itemColors: ['#dc2626', '#2563eb', '#16a34a', '#eab308'], label: 'HOUSEHOLD & PLASTICS' },
  ];
  const shopInteriorBays = shopInteriorConfigs.map((cfg) => {
    const [c, ctx] = createCanvas(512, 256);
    // Exterior shop frame + concrete pilasters on left/right
    ctx.fillStyle = cfg.wall;
    ctx.fillRect(0, 0, 512, 256);

    // Rolled-up shutter header housing at top
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(24, 10, 464, 34);
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(24, 14, 464, 10);

    // Two wide shop bays separated by central concrete pillar
    for (const bx of [28, 268]) {
      const bw = 216;
      const by = 44;
      const bh = 212;
      // Deep shadowed interior
      ctx.fillStyle = '#211c17';
      ctx.fillRect(bx, by, bw, bh);

      // Warm overhead shop bulb glow
      const glow = ctx.createRadialGradient(bx + bw / 2, by + 35, 10, bx + bw / 2, by + 70, 130);
      glow.addColorStop(0, 'rgba(255, 224, 160, 0.55)');
      glow.addColorStop(1, 'rgba(33, 28, 23, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(bx, by, bw, bh);

      // Horizontal display shelves stocked with colorful goods
      for (let row = 0; row < 4; row++) {
        const sy = by + 28 + row * 42;
        ctx.fillStyle = '#5c4632';
        ctx.fillRect(bx + 10, sy + 24, bw - 20, 6);
        for (let col = 0; col < 6; col++) {
          ctx.fillStyle = cfg.itemColors[(row + col) % cfg.itemColors.length];
          ctx.fillRect(bx + 14 + col * 32, sy + 2, 24, 22);
        }
      }

      // Partially pulled-down side shutter edge
      ctx.fillStyle = '#64748b';
      ctx.fillRect(bx, by, 14, bh);
      ctx.fillRect(bx + bw - 14, by, 14, bh);
    }

    // Center structural column
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(244, 44, 24, 212);
    return reg(finalizeTex(c, maxAniso, true));
  });

  // 7. Weathered Ethiopian Plaster / Stucco Walls for Side Walls & Houses
  const stuccoPalettes = ['#dfd1bc', '#d4b898', '#c8d2d6', '#e2c5ab', '#cbc9bd'];
  const stuccoWalls = stuccoPalettes.map((col) => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = col;
    ctx.fillRect(0, 0, 256, 256);
    // Subtle plaster variation & lower street-level grime
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect((i * 61) % 256, (i * 149) % 256, 6, 4);
    }
    const baseGrad = ctx.createLinearGradient(0, 200, 0, 256);
    baseGrad.addColorStop(0, 'rgba(65, 52, 40, 0)');
    baseGrad.addColorStop(1, 'rgba(65, 52, 40, 0.36)');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 200, 256, 56);
    return reg(finalizeTex(c, maxAniso, true));
  });

  // 8. Anwar Grand Mosque whitewash + emerald green frieze
  const mosqueWall = (() => {
    const [c, ctx] = createCanvas(512, 256);
    ctx.fillStyle = '#f2efe8';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#1b6b45';
    ctx.fillRect(0, 0, 512, 56);
    ctx.fillStyle = '#d9b44a';
    ctx.fillRect(0, 54, 512, 5);
    for (let x = 32; x < 512; x += 96) {
      ctx.fillStyle = '#255c43';
      ctx.beginPath();
      ctx.arc(x + 28, 92, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c49d46';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#2b3933';
      ctx.fillRect(x, 134, 56, 122);
      ctx.beginPath();
      ctx.arc(x + 28, 134, 28, Math.PI, 0);
      ctx.fill();
    }
    return reg(finalizeTex(c, maxAniso, true, 2, 1));
  })();

  // 9. Anwar Mosque Minaret cream stone tiles
  const minaretTile = (() => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#ede7da';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#cbc1ae';
    ctx.lineWidth = 2;
    for (let y = 0; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
      const offset = (y / 32) % 2 === 0 ? 0 : 32;
      for (let x = offset; x < 256; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 32);
        ctx.stroke();
      }
    }
    return reg(finalizeTex(c, maxAniso, true, 2, 4));
  })();

  // 10. St. Raguel Church stone & warm ochre plaster
  const churchStone = (() => {
    const [c, ctx] = createCanvas(512, 256);
    ctx.fillStyle = '#e8dcc4';
    ctx.fillRect(0, 0, 512, 256);
    for (let y = 0; y < 256; y += 32) {
      for (let x = 0; x < 512; x += 64) {
        const s = 216 + ((x * 5 + y * 3) % 22);
        ctx.fillStyle = `rgb(${s},${s - 12},${s - 28})`;
        ctx.fillRect(x + 1, y + 1, 62, 30);
      }
    }
    ctx.fillStyle = '#1d7a42';
    ctx.fillRect(0, 18, 512, 8);
    ctx.fillStyle = '#e5b726';
    ctx.fillRect(0, 26, 512, 8);
    ctx.fillStyle = '#b92b27';
    ctx.fillRect(0, 34, 512, 8);
    for (let x = 48; x < 512; x += 128) {
      ctx.fillStyle = '#533524';
      ctx.fillRect(x, 108, 40, 74);
      ctx.beginPath();
      ctx.arc(x + 20, 108, 20, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#d9b55b';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    return reg(finalizeTex(c, maxAniso, true, 2, 1));
  })();

  // 11. Multi-story Addis commercial facades (balcony lines + realistic glass + mullions)
  const commercialPalettes = [
    { wall: '#dfd5c3', band: '#8d6e4e', win: '#1f2d38' },
    { wall: '#c7d3d9', band: '#325d7a', win: '#192630' },
    { wall: '#e6c8a8', band: '#9b4a33', win: '#2a2422' },
    { wall: '#d5d8cf', band: '#3c634b', win: '#1b2b25' },
  ];
  const commercialFacade = commercialPalettes.map((pal) => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = pal.wall;
    ctx.fillRect(0, 0, 256, 256);
    for (let floor = 0; floor < 3; floor++) {
      const fy = 10 + floor * 82;
      ctx.fillStyle = pal.band;
      ctx.fillRect(0, fy + 64, 256, 13);
      for (let col = 0; col < 4; col++) {
        const wx = 14 + col * 60;
        ctx.fillStyle = pal.win;
        ctx.fillRect(wx, fy + 6, 44, 48);
        // Subtle sky reflection inside window pane
        const wg = ctx.createLinearGradient(wx, fy + 6, wx, fy + 54);
        wg.addColorStop(0, 'rgba(135, 185, 225, 0.35)');
        wg.addColorStop(1, 'rgba(20, 28, 36, 0.1)');
        ctx.fillStyle = wg;
        ctx.fillRect(wx + 2, fy + 8, 40, 44);
        ctx.strokeStyle = '#ece9e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(wx, fy + 6, 44, 48);
        ctx.fillStyle = '#d5d8de';
        ctx.fillRect(wx + 21, fy + 6, 2, 48);
      }
    }
    return reg(finalizeTex(c, maxAniso, true));
  });

  // 12. Vibrant Merkato Shopfront Signboards
  const signConfigs = [
    { bg: '#1574c4', fg: '#ffffff', am: 'ተወከል ኤሌክትሮኒክስ', en: 'ELECTRONICS & AUDIO' },
    { bg: '#d62b22', fg: '#fff15c', am: 'አማዝ ኤሌክትሮኒክስ', en: 'AMAZ HARDWARE' },
    { bg: '#f1c232', fg: '#1d2228', am: 'ጎጃም በረንዳ ሸማ', en: 'SHAMMA & TEXTILES' },
    { bg: '#187848', fg: '#ffffff', am: 'ቡና እና ቅመማ ቅመም', en: 'BERBERE & BUNA MART' },
    { bg: '#e86f2c', fg: '#ffffff', am: 'ራጉኤል ገበያ', en: 'RAGUEL MERCANTILE' },
    { bg: '#264473', fg: '#f8fafc', am: 'ሲኒማ ራስ ንግድ', en: 'CINEMA RAS PLAZA' },
    { bg: '#0f766e', fg: '#ffffff', am: 'ፋርማሲ እና ክሊኒክ', en: 'MERKATO PHARMACY' },
    { bg: '#7c2d12', fg: '#fde68a', am: 'አውቶቢስ ተራ ቡና', en: 'ETHIOPIA COFFEE HOUSE' },
  ];
  const shopSigns = signConfigs.map((cfg) => {
    const [c, ctx] = createCanvas(512, 128);
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = 'rgba(255,255,255,0.48)';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.fillStyle = cfg.fg;
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px "Noto Sans Ethiopic", "Abyssinica SIL", sans-serif';
    ctx.fillText(cfg.am, 256, 58);
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(cfg.en, 256, 98);
    return reg(finalizeTex(c, maxAniso, true));
  });

  // 13. Ethiopian Code-3 Share Taxi Plate
  const taxiPlate = (() => {
    const [c, ctx] = createCanvas(256, 96);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = '#0f5fa6';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 248, 88);
    ctx.fillStyle = '#0f5fa6';
    ctx.fillRect(10, 10, 56, 76);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('ኮድ 3', 38, 44);
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('AA', 38, 72);
    ctx.fillStyle = '#0f3968';
    ctx.font = 'bold 38px monospace';
    ctx.fillText('10135', 162, 62);
    return reg(finalizeTex(c, maxAniso, true));
  })();

  // 14. GTA-style Roadblock Concrete Jersey Barrier (red/white & yellow/black hazard stripes)
  const jerseyBarrier = (() => {
    const [c, ctx] = createCanvas(256, 128);
    ctx.fillStyle = '#c9c4bc';
    ctx.fillRect(0, 0, 256, 128);
    // Hazard stripe band along top
    for (let x = -64; x < 320; x += 48) {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 24, 0);
      ctx.lineTo(x + 48, 52);
      ctx.lineTo(x + 24, 52);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(x + 24, 0);
      ctx.lineTo(x + 48, 0);
      ctx.lineTo(x + 72, 52);
      ctx.lineTo(x + 48, 52);
      ctx.closePath();
      ctx.fill();
    }
    // Concrete grime at base
    const g = ctx.createLinearGradient(0, 75, 0, 128);
    g.addColorStop(0, 'rgba(60,55,48,0)');
    g.addColorStop(1, 'rgba(60,55,48,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 75, 256, 53);
    return reg(finalizeTex(c, maxAniso, true));
  })();

  // 15. GTA-style "ROAD CLOSED / መንገድ ተዘግቷል" Sign
  const roadClosedSign = (() => {
    const [c, ctx] = createCanvas(512, 256);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 492, 236);
    ctx.fillStyle = '#18181b';
    ctx.textAlign = 'center';
    ctx.font = 'bold 46px "Noto Sans Ethiopic", sans-serif';
    ctx.fillText('መንገድ ተዘግቷል', 256, 98);
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.fillText('ROAD CLOSED', 256, 162);
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('MERKATO DISTRICT BOUNDARY', 256, 212);
    return reg(finalizeTex(c, maxAniso, true));
  })();

  // 16. Zebra Crosswalk decal
  const crosswalk = (() => {
    const [c, ctx] = createCanvas(256, 128);
    ctx.clearRect(0, 0, 256, 128);
    ctx.fillStyle = 'rgba(244, 244, 240, 0.82)';
    for (let x = 8; x < 256; x += 36) {
      ctx.fillRect(x, 8, 20, 112);
    }
    return reg(finalizeTex(c, maxAniso, true));
  })();

  // 17. Soft radial contact shadow
  const contactShadow = (() => {
    const [c, ctx] = createCanvas(128, 128);
    const g = ctx.createRadialGradient(64, 64, 12, 64, 64, 62);
    g.addColorStop(0, 'rgba(10, 8, 6, 0.72)');
    g.addColorStop(0.55, 'rgba(10, 8, 6, 0.36)');
    g.addColorStop(1, 'rgba(10, 8, 6, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    all.push(tex);
    return tex;
  })();

  return {
    asphalt,
    asphaltBump,
    sidewalk,
    pedestrianLane,
    corrugatedZinc,
    shutterGrey,
    shopInteriorBays,
    stuccoWalls,
    mosqueWall,
    minaretTile,
    churchStone,
    commercialFacade,
    shopSigns,
    taxiPlate,
    jerseyBarrier,
    roadClosedSign,
    crosswalk,
    contactShadow,
    dispose: () => {
      for (const t of all) t.dispose();
    },
  };
}
