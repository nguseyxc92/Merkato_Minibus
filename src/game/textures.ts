import * as THREE from 'three';

export interface TextureBundle {
  asphalt: THREE.CanvasTexture;
  sidewalk: THREE.CanvasTexture;
  pedestrianLane: THREE.CanvasTexture;
  corrugatedZinc: THREE.CanvasTexture;
  shutterGrey: THREE.CanvasTexture;
  mosqueWall: THREE.CanvasTexture;
  minaretTile: THREE.CanvasTexture;
  churchStone: THREE.CanvasTexture;
  commercialFacade: THREE.CanvasTexture[];
  shopSigns: THREE.CanvasTexture[];
  taxiPlate: THREE.CanvasTexture;
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

function finalizeColorTex(
  canvas: HTMLCanvasElement,
  maxAniso: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  } else {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
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

  // 1. Weathered Addis Ababa Asphalt with dusty edges and center dashed divider
  const asphalt = (() => {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#3b3c3e';
    ctx.fillRect(0, 0, 512, 512);
    // Aggregate grit
    for (let i = 0; i < 6500; i++) {
      const x = (i * 73) % 512;
      const y = (i * 197 + (i % 17) * 29) % 512;
      const v = 45 + (i % 38);
      ctx.fillStyle = `rgb(${v},${v},${v + 2})`;
      ctx.fillRect(x, y, 2, 2);
    }
    // Dusty highland red-ochre shoulder wash on left/right edges
    const leftGrad = ctx.createLinearGradient(0, 0, 68, 0);
    leftGrad.addColorStop(0, 'rgba(138, 108, 76, 0.55)');
    leftGrad.addColorStop(1, 'rgba(138, 108, 76, 0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, 68, 512);

    const rightGrad = ctx.createLinearGradient(512, 0, 444, 0);
    rightGrad.addColorStop(0, 'rgba(138, 108, 76, 0.55)');
    rightGrad.addColorStop(1, 'rgba(138, 108, 76, 0)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(444, 0, 68, 512);

    // Center white dashed divider
    ctx.fillStyle = 'rgba(235, 232, 220, 0.72)';
    for (let y = 20; y < 512; y += 128) {
      ctx.fillRect(251, y, 10, 64);
    }
    return reg(finalizeColorTex(c, maxAniso, 1, 1));
  })();

  // 2. Concrete sidewalk / market curb paving
  const sidewalk = (() => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#9c9282';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 64) {
      for (let x = 0; x < 256; x += 64) {
        const shade = 148 + ((x * 3 + y * 5) % 20);
        ctx.fillStyle = `rgb(${shade},${shade - 6},${shade - 16})`;
        ctx.fillRect(x + 2, y + 2, 60, 60);
      }
    }
    return reg(finalizeColorTex(c, maxAniso, 4, 4));
  })();

  // 3. Pedestrian-only narrow market lane (cobble + dusty earth)
  const pedestrianLane = (() => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#8b775f';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      for (let x = 0; x < 256; x += 32) {
        const off = (y / 32) % 2 === 0 ? 0 : 16;
        const s = 122 + ((x * 7 + y * 11) % 28);
        ctx.fillStyle = `rgb(${s + 12},${s},${s - 18})`;
        ctx.fillRect((x + off) % 256 + 2, y + 2, 26, 26);
      }
    }
    return reg(finalizeColorTex(c, maxAniso, 2, 6));
  })();

  // 4. Corrugated zinc/tin roof & awning ("ቆርቆሮ" Korkoro)
  const corrugatedZinc = (() => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#7e8388';
    ctx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 12) {
      const g = ctx.createLinearGradient(x, 0, x + 12, 0);
      g.addColorStop(0, '#5a5e63');
      g.addColorStop(0.5, '#b6bcc2');
      g.addColorStop(1, '#5a5e63');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 12, 256);
    }
    // Weathering rust patches
    ctx.fillStyle = 'rgba(130, 72, 42, 0.22)';
    ctx.fillRect(30, 40, 65, 90);
    ctx.fillRect(150, 140, 80, 75);
    return reg(finalizeColorTex(c, maxAniso, 2, 1));
  })();

  // 5. Rolling steel shop shutter
  const shutterGrey = (() => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#687078';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 14) {
      ctx.fillStyle = '#8b939b';
      ctx.fillRect(0, y, 256, 7);
      ctx.fillStyle = '#474d54';
      ctx.fillRect(0, y + 7, 256, 3);
    }
    ctx.strokeStyle = '#363b40';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 250);
    return reg(finalizeColorTex(c, maxAniso));
  })();

  // 6. Anwar Grand Mosque whitewash + emerald green frieze (from Wikimedia refs)
  const mosqueWall = (() => {
    const [c, ctx] = createCanvas(512, 256);
    ctx.fillStyle = '#f2efe8';
    ctx.fillRect(0, 0, 512, 256);
    // Emerald green upper scalloped frieze
    ctx.fillStyle = '#1b6b45';
    ctx.fillRect(0, 0, 512, 56);
    ctx.fillStyle = '#d9b44a';
    ctx.fillRect(0, 54, 512, 5);
    // Decorative round windows & warm plaster arches
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
    return reg(finalizeColorTex(c, maxAniso, 2, 1));
  })();

  // 7. Anwar Mosque Minaret cream stone tiles
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
    return reg(finalizeColorTex(c, maxAniso, 2, 4));
  })();

  // 8. St. Raguel Church stone & warm ochre plaster
  const churchStone = (() => {
    const [c, ctx] = createCanvas(512, 256);
    ctx.fillStyle = '#e8dcc4';
    ctx.fillRect(0, 0, 512, 256);
    // Stone courses
    for (let y = 0; y < 256; y += 32) {
      for (let x = 0; x < 512; x += 64) {
        const s = 216 + ((x * 5 + y * 3) % 22);
        ctx.fillStyle = `rgb(${s},${s - 12},${s - 28})`;
        ctx.fillRect(x + 1, y + 1, 62, 30);
      }
    }
    // Traditional Ethiopian green-yellow-red trim band near top
    ctx.fillStyle = '#1d7a42';
    ctx.fillRect(0, 18, 512, 8);
    ctx.fillStyle = '#e5b726';
    ctx.fillRect(0, 26, 512, 8);
    ctx.fillStyle = '#b92b27';
    ctx.fillRect(0, 34, 512, 8);
    // Arched windows
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
    return reg(finalizeColorTex(c, maxAniso, 2, 1));
  })();

  // 9. Multi-story Addis commercial facade textures
  const commercialPalettes = [
    { wall: '#dfd5c3', band: '#9b7b56', win: '#2a3c4a' },
    { wall: '#c7d3d9', band: '#3f6885', win: '#1f2e3a' },
    { wall: '#e6c8a8', band: '#a5523b', win: '#312c2a' },
    { wall: '#d5d8cf', band: '#496e57', win: '#22332c' },
  ];
  const commercialFacade = commercialPalettes.map((pal) => {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = pal.wall;
    ctx.fillRect(0, 0, 256, 256);
    for (let floor = 0; floor < 3; floor++) {
      const fy = 12 + floor * 82;
      ctx.fillStyle = pal.band;
      ctx.fillRect(0, fy + 64, 256, 12);
      for (let col = 0; col < 4; col++) {
        const wx = 14 + col * 60;
        ctx.fillStyle = pal.win;
        ctx.fillRect(wx, fy + 8, 42, 46);
        ctx.strokeStyle = '#ece9e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(wx, fy + 8, 42, 46);
        // Window mullion
        ctx.fillStyle = '#d5d8de';
        ctx.fillRect(wx + 20, fy + 8, 2, 46);
      }
    }
    return reg(finalizeColorTex(c, maxAniso, 1, 1));
  });

  // 10. Vibrant Merkato Shopfront Signboards (inspired directly by Anwar Mosque / Kenya St photo refs)
  const signConfigs = [
    { bg: '#1574c4', fg: '#ffffff', am: 'ተወከል ኤሌክትሮኒክስ', en: 'ELECTRONICS & AUDIO' },
    { bg: '#d62b22', fg: '#fff15c', am: 'አማዝ ኤሌክትሮኒክስ', en: 'AMAZ HARDWARE' },
    { bg: '#f1c232', fg: '#1d2228', am: 'ጎጃም በረንዳ ሸማ', en: 'SHAMMA & TEXTILES' },
    { bg: '#187848', fg: '#ffffff', am: 'ቡና እና ቅመማ ቅመም', en: 'BERBERE & BUNA MART' },
    { bg: '#e86f2c', fg: '#ffffff', am: 'ራጉኤል ገበያ', en: 'RAGUEL MERCANTILE' },
    { bg: '#264473', fg: '#f8fafc', am: 'ሲኒማ ራስ ንግድ', en: 'CINEMA RAS PLAZA' },
  ];
  const shopSigns = signConfigs.map((cfg) => {
    const [c, ctx] = createCanvas(512, 128);
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.fillStyle = cfg.fg;
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px "Noto Sans Ethiopic", "Abyssinica SIL", sans-serif';
    ctx.fillText(cfg.am, 256, 58);
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(cfg.en, 256, 98);
    return reg(finalizeColorTex(c, maxAniso));
  });

  // 11. Ethiopian Code-1 / Code-3 Share Taxi Plate & Door Number ("AA 03-10135" style from Wikimedia ref)
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
    return reg(finalizeColorTex(c, maxAniso));
  })();

  // 12. Soft radial contact shadow
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
    sidewalk,
    pedestrianLane,
    corrugatedZinc,
    shutterGrey,
    mosqueWall,
    minaretTile,
    churchStone,
    commercialFacade,
    shopSigns,
    taxiPlate,
    contactShadow,
    dispose: () => {
      for (const t of all) t.dispose();
    },
  };
}
