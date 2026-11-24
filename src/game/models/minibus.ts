import * as THREE from 'three';
import type { TextureBundle } from '../textures';

export interface MinibusRig {
  root: THREE.Group;
  chassisGroup: THREE.Group;
  slidingDoor: THREE.Group;
  wheels: {
    flPivot: THREE.Group;
    frPivot: THREE.Group;
    flSpin: THREE.Group;
    frSpin: THREE.Group;
    rlSpin: THREE.Group;
    rrSpin: THREE.Group;
  };
  steeringWheel: THREE.Group;
  brakeLightsMat: THREE.MeshStandardMaterial;
  passengerMeshes: THREE.Group[];
  setDoorOpen: (ratio: number) => void;
  setOnboardCount: (count: number) => void;
  updateMotion: (
    wheelSpinDelta: number,
    steerAngleRad: number,
    pitchRad: number,
    rollRad: number,
    isBraking: boolean
  ) => void;
}

function createWheel(tireMat: THREE.Material, rimMat: THREE.Material, hubMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 18), tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.23, 12), rimMat);
  rim.rotation.z = Math.PI / 2;
  g.add(rim);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.25, 10), hubMat);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  return g;
}

function createSeatedPassenger(shirtColor: number, headMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const torsoMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.8 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.22), torsoMat);
  torso.position.y = 0.22;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), headMat);
  head.position.y = 0.5;
  g.add(head);
  return g;
}

export function createEthiopianMinibus(textures: TextureBundle): MinibusRig {
  const root = new THREE.Group();
  const chassisGroup = new THREE.Group();
  root.add(chassisGroup);

  // Materials (varied roughness/metalness >= 0.25 between adjacent parts)
  const bluePaint = new THREE.MeshStandardMaterial({
    color: 0x1685d8,
    roughness: 0.34,
    metalness: 0.22,
  });
  const whitePaint = new THREE.MeshStandardMaterial({
    color: 0xf4f5f7,
    roughness: 0.38,
    metalness: 0.12,
  });
  const trimBlack = new THREE.MeshStandardMaterial({
    color: 0x1e2226,
    roughness: 0.82,
    metalness: 0.08,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xd9dfe6,
    roughness: 0.2,
    metalness: 0.85,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x9fc4d8,
    roughness: 0.08,
    metalness: 0.05,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const interiorSeatMat = new THREE.MeshStandardMaterial({
    color: 0x7c7464,
    roughness: 0.88,
  });
  const dashMat = new THREE.MeshStandardMaterial({
    color: 0x26292e,
    roughness: 0.72,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff8dc,
    emissive: 0xffeeb0,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  const brakeLightsMat = new THREE.MeshStandardMaterial({
    color: 0xb81d18,
    emissive: 0xff2211,
    emissiveIntensity: 0.25,
    roughness: 0.28,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    map: textures.taxiPlate,
    roughness: 0.45,
  });

  // Contact shadow grounded under minibus
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 5.2),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.03;
  root.add(contactShadow);

  // Dimensions: Toyota HiAce H50/H100 proportions: ~1.76m wide, 4.72m long, 1.98m tall
  // Local forward = -Z (front at z = -2.35, rear at z = +2.35)
  // Right curb side = +X (+0.88), driver left side = -X (-0.88)

  // 1. Floor pan & underbody frame
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.14, 4.58), trimBlack);
  floor.position.set(0, 0.38, 0);
  floor.castShadow = true;
  chassisGroup.add(floor);

  // 2. Lower Cerulean Blue Body Hull (split cleanly at beltline y = 1.14)
  // Front nose lower blue panel (slanted cab-over-axle face)
  const frontLower = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.68, 0.92), bluePaint);
  frontLower.position.set(0, 0.79, -1.86);
  frontLower.castShadow = true;
  chassisGroup.add(frontLower);

  // Left side full blue lower flank (-X, driver side)
  const leftFlank = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.7, 4.56), bluePaint);
  leftFlank.position.set(-0.84, 0.8, 0);
  leftFlank.castShadow = true;
  chassisGroup.add(leftFlank);

  // Right side lower flank split around sliding door opening (z from -0.68 to +0.62)
  const rightFrontFlank = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.7, 1.6), bluePaint);
  rightFrontFlank.position.set(0.84, 0.8, -1.52);
  rightFrontFlank.castShadow = true;
  chassisGroup.add(rightFrontFlank);

  const rightRearFlank = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.7, 1.72), bluePaint);
  rightRearFlank.position.set(0.84, 0.8, 1.44);
  rightRearFlank.castShadow = true;
  chassisGroup.add(rightRearFlank);

  // Step sill under sliding door
  const doorSill = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 1.3), trimBlack);
  doorSill.position.set(0.84, 0.43, -0.04);
  chassisGroup.add(doorSill);

  // Rear tailgate lower blue panel
  const rearLower = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.7, 0.1), bluePaint);
  rearLower.position.set(0, 0.8, 2.26);
  rearLower.castShadow = true;
  chassisGroup.add(rearLower);

  // 3. Upper White Cabin (roof, pillars, window frames)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.12, 4.18), whitePaint);
  roof.position.set(0, 1.94, 0.15);
  roof.castShadow = true;
  chassisGroup.add(roof);

  // Slanted upper front nose + windshield pillars
  const frontUpperBrow = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.16, 0.36), whitePaint);
  frontUpperBrow.position.set(0, 1.88, -1.96);
  frontUpperBrow.rotation.x = 0.25;
  chassisGroup.add(frontUpperBrow);

  const leftAPillar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.82, 0.1), whitePaint);
  leftAPillar.position.set(-0.83, 1.51, -2.1);
  leftAPillar.rotation.x = -0.32;
  chassisGroup.add(leftAPillar);

  const rightAPillar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.82, 0.1), whitePaint);
  rightAPillar.position.set(0.83, 1.51, -2.1);
  rightAPillar.rotation.x = -0.32;
  chassisGroup.add(rightAPillar);

  // Windshield (clear enough for driver-seat visibility)
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.58, 0.74), glassMat);
  windshield.position.set(0, 1.52, -2.13);
  windshield.rotation.x = -0.32;
  windshield.rotation.y = Math.PI; // face outward/inward DoubleSide
  windshield.material.side = THREE.DoubleSide;
  windshield.renderOrder = 3;
  chassisGroup.add(windshield);

  // Side pillars (B, C, D) on left and right
  const leftBPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.14), whitePaint);
  leftBPillar.position.set(-0.84, 1.53, -0.78);
  chassisGroup.add(leftBPillar);

  const leftCPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.14), whitePaint);
  leftCPillar.position.set(-0.84, 1.53, 0.68);
  chassisGroup.add(leftCPillar);

  const leftDPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.22), whitePaint);
  leftDPillar.position.set(-0.84, 1.53, 2.18);
  chassisGroup.add(leftDPillar);

  const rightBPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.14), whitePaint);
  rightBPillar.position.set(0.84, 1.53, -0.78);
  chassisGroup.add(rightBPillar);

  const rightCPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.14), whitePaint);
  rightCPillar.position.set(0.84, 1.53, 0.68);
  chassisGroup.add(rightCPillar);

  const rightDPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.22), whitePaint);
  rightDPillar.position.set(0.84, 1.53, 2.18);
  chassisGroup.add(rightDPillar);

  // Rear window frame & glass
  const rearTopRail = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.14, 0.12), whitePaint);
  rearTopRail.position.set(0, 1.87, 2.25);
  chassisGroup.add(rearTopRail);

  const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.62), glassMat);
  rearGlass.position.set(0, 1.5, 2.26);
  rearGlass.renderOrder = 3;
  chassisGroup.add(rearGlass);

  // Left side glass & right rear glass
  const leftSideGlass = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.62), glassMat);
  leftSideGlass.rotation.y = -Math.PI / 2;
  leftSideGlass.position.set(-0.84, 1.52, 0.12);
  leftSideGlass.renderOrder = 3;
  chassisGroup.add(leftSideGlass);

  const rightRearGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.62), glassMat);
  rightRearGlass.rotation.y = Math.PI / 2;
  rightRearGlass.position.set(0.84, 1.52, 1.44);
  rightRearGlass.renderOrder = 3;
  chassisGroup.add(rightRearGlass);

  // 4. Sliding Side Door (+X curb side, z center = -0.05, width = 1.32)
  const slidingDoor = new THREE.Group();
  slidingDoor.position.set(0.87, 0.46, -0.05);

  const doorLower = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.69, 1.32), bluePaint);
  doorLower.position.y = 0.345;
  doorLower.castShadow = true;
  slidingDoor.add(doorLower);

  const doorFrameTop = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 1.32), whitePaint);
  doorFrameTop.position.y = 1.42;
  slidingDoor.add(doorFrameTop);

  const doorPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.74, 0.09), whitePaint);
  doorPillarL.position.set(0, 1.05, -0.61);
  slidingDoor.add(doorPillarL);

  const doorPillarR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.74, 0.09), whitePaint);
  doorPillarR.position.set(0, 1.05, 0.61);
  slidingDoor.add(doorPillarR);

  const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.6), glassMat);
  doorGlass.rotation.y = Math.PI / 2;
  doorGlass.position.set(0.01, 1.04, 0);
  doorGlass.renderOrder = 3;
  slidingDoor.add(doorGlass);

  const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.14), trimBlack);
  doorHandle.position.set(0.05, 0.56, -0.48);
  slidingDoor.add(doorHandle);

  chassisGroup.add(slidingDoor);

  // Black sliding door track along right rear flank (signature HiAce detail!)
  const doorTrack = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 1.55), trimBlack);
  doorTrack.position.set(0.89, 1.04, 1.44);
  chassisGroup.add(doorTrack);

  // 5. Bumpers, Grille, Lights, Mirrors & Code-3 Plates
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.18), trimBlack);
  frontBumper.position.set(0, 0.45, -2.35);
  chassisGroup.add(frontBumper);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.16), trimBlack);
  rearBumper.position.set(0, 0.45, 2.34);
  chassisGroup.add(rearBumper);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.24, 0.06), trimBlack);
  grille.position.set(0, 0.84, -2.32);
  chassisGroup.add(grille);

  // Twin rectangular headlights
  for (const sx of [-0.67, 0.67]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.06), headlightMat);
    hl.position.set(sx, 0.84, -2.32);
    chassisGroup.add(hl);

    // Tall vertical HiAce taillights
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.06), brakeLightsMat);
    tl.position.set(sx * 1.08, 0.86, 2.31);
    chassisGroup.add(tl);
  }

  // Code-3 Addis Taxi plates (front door + rear)
  const frontDoorPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.14), plateMat);
  frontDoorPlate.rotation.y = Math.PI / 2;
  frontDoorPlate.position.set(0.892, 0.98, -1.45);
  chassisGroup.add(frontDoorPlate);

  const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.15), plateMat);
  rearPlate.position.set(0, 0.68, 2.32);
  chassisGroup.add(rearPlate);

  const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.14), plateMat);
  frontPlate.rotation.y = Math.PI;
  frontPlate.position.set(0, 0.52, -2.445);
  chassisGroup.add(frontPlate);

  // Side Wing Mirrors on A-pillars (high visibility for tight streets!)
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.03), trimBlack);
    arm.position.set(sx * 0.94, 1.32, -1.96);
    chassisGroup.add(arm);

    const mirrorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.12), trimBlack);
    mirrorHousing.position.set(sx * 1.02, 1.34, -1.96);
    chassisGroup.add(mirrorHousing);

    const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.18), chromeMat);
    mirrorGlass.rotation.y = sx > 0 ? 0.15 : -0.15;
    mirrorGlass.position.set(sx * 1.01, 1.34, -1.895);
    chassisGroup.add(mirrorGlass);
  }

  // Interior Rear-View Mirror + Dashboard + Steering Wheel (for Driver's-Seat Camera!)
  const interiorMirror = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.03), trimBlack);
  interiorMirror.position.set(0, 1.76, -1.82);
  chassisGroup.add(interiorMirror);

  const dashboard = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.26, 0.42), dashMat);
  dashboard.position.set(0, 1.08, -1.88);
  chassisGroup.add(dashboard);

  const dashHood = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.24), trimBlack);
  dashHood.position.set(-0.42, 1.24, -1.86);
  chassisGroup.add(dashHood);

  const steeringWheel = new THREE.Group();
  steeringWheel.position.set(-0.42, 1.22, -1.56);
  steeringWheel.rotation.x = -0.55;
  const swRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 8, 20), trimBlack);
  steeringWheel.add(swRim);
  const swBar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.02), trimBlack);
  steeringWheel.add(swBar);
  chassisGroup.add(steeringWheel);

  // Interior passenger benches (4 rows inside cabin)
  for (const bz of [-0.55, 0.2, 0.95, 1.72]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.14, 0.42), interiorSeatMat);
    bench.position.set(-0.08, 0.68, bz);
    chassisGroup.add(bench);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.44, 0.1), interiorSeatMat);
    backrest.position.set(-0.08, 0.94, bz + 0.16);
    chassisGroup.add(backrest);
  }

  // 12 Seated passenger meshes inside cabin (toggled by onboard count)
  const seatCoords: [number, number][] = [
    [-0.5, -0.55], [0.0, -0.55], [0.45, -0.55],
    [-0.5, 0.2], [0.0, 0.2], [0.45, 0.2],
    [-0.5, 0.95], [0.0, 0.95], [0.45, 0.95],
    [-0.5, 1.72], [0.0, 1.72], [0.45, 1.72],
  ];
  const shirtColors = [0xd97706, 0x2563eb, 0x059669, 0xe11d48, 0xf3f4f6, 0x7c3aed, 0x0d9488, 0xca8a04];
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x6f4632, roughness: 0.78 });
  const passengerMeshes: THREE.Group[] = seatCoords.map(([sx, sz], idx) => {
    const p = createSeatedPassenger(shirtColors[idx % shirtColors.length], skinMat);
    p.position.set(sx, 0.75, sz);
    p.visible = false;
    chassisGroup.add(p);
    return p;
  });

  // 6. Wheels
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1c1f, roughness: 0.88, metalness: 0.05 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xadb5bd, roughness: 0.35, metalness: 0.65 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x2d3238, roughness: 0.45, metalness: 0.5 });

  const flPivot = new THREE.Group();
  flPivot.position.set(-0.78, 0.34, -1.46);
  const flSpin = createWheel(tireMat, rimMat, hubMat);
  flPivot.add(flSpin);
  root.add(flPivot);

  const frPivot = new THREE.Group();
  frPivot.position.set(0.78, 0.34, -1.46);
  const frSpin = createWheel(tireMat, rimMat, hubMat);
  frPivot.add(frSpin);
  root.add(frPivot);

  const rlSpin = createWheel(tireMat, rimMat, hubMat);
  rlSpin.position.set(-0.78, 0.34, 1.38);
  root.add(rlSpin);

  const rrSpin = createWheel(tireMat, rimMat, hubMat);
  rrSpin.position.set(0.78, 0.34, 1.38);
  root.add(rrSpin);

  return {
    root,
    chassisGroup,
    slidingDoor,
    wheels: { flPivot, frPivot, flSpin, frSpin, rlSpin, rrSpin },
    steeringWheel,
    brakeLightsMat,
    passengerMeshes,
    setDoorOpen: (ratio: number) => {
      const clamped = Math.max(0, Math.min(1, ratio));
      // Slide backward along +Z and kick outward slightly on rail
      slidingDoor.position.z = -0.05 + clamped * 1.12;
      slidingDoor.position.x = 0.87 + Math.sin(Math.min(1, clamped * 3) * (Math.PI / 2)) * 0.08;
    },
    setOnboardCount: (count: number) => {
      for (let i = 0; i < passengerMeshes.length; i++) {
        passengerMeshes[i].visible = i < count;
      }
    },
    updateMotion: (wheelSpinDelta, steerAngleRad, pitchRad, rollRad, isBraking) => {
      flSpin.rotation.x -= wheelSpinDelta;
      frSpin.rotation.x -= wheelSpinDelta;
      rlSpin.rotation.x -= wheelSpinDelta;
      rrSpin.rotation.x -= wheelSpinDelta;
      flPivot.rotation.y = steerAngleRad;
      frPivot.rotation.y = steerAngleRad;
      steeringWheel.rotation.z = -steerAngleRad * 3.2;
      chassisGroup.rotation.x = pitchRad;
      chassisGroup.rotation.z = rollRad;
      brakeLightsMat.emissiveIntensity = isBraking ? 1.85 : 0.25;
    },
  };
}
