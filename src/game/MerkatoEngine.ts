import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getMerkatoWorld, type MerkatoWorldData } from '../data/merkatoRoutes';
import { MerkatoAudioEngine } from './audio';
import { MissionDirector, MAX_SEATS, type MissionSnapshot } from './mission';
import { createLivingMarket, type LivingMarketSystem, type TrafficDensity } from './models/livingMarket';
import { buildMerkatoWorldScene, type MerkatoSceneAssets } from './models/landmarks';
import { createEthiopianMinibus, type MinibusRig } from './models/minibus';
import {
  createInitialPhysics,
  recoverToNearestRoute,
  stepMinibusPhysics,
  type DrivingInput,
  type MinibusPhysicsState,
} from './physics';
import { createMerkatoTextures, type TextureBundle } from './textures';

export class MerkatoEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private world: MerkatoWorldData;
  private textures: TextureBundle;
  private worldAssets: MerkatoSceneAssets;
  private minibus: MinibusRig;
  private market: LivingMarketSystem;
  private audio: MerkatoAudioEngine;
  private physics: MinibusPhysicsState;
  private mission: MissionDirector;

  private phase: 'title' | 'playing' | 'paused' | 'completed' = 'title';
  private cameraMode: 'driver' | 'chase' = 'chase';
  private trafficDensity: TrafficDensity = 'normal';

  private keysHeld = new Set<string>();
  private touchInput: DrivingInput = { throttle: false, brake: false, left: false, right: false };

  private frameId = 0;
  private lastTimeMs = performance.now();
  private elapsed = 0;
  private hitstopTimer = 0;
  private shakeStrength = 0;
  private lastSnapshotEmit = 0;
  private transientNotice: { text: string; until: number } | null = null;

  private camPos = new THREE.Vector3();
  private camTarget = new THREE.Vector3();
  private _vecA = new THREE.Vector3();
  private _vecB = new THREE.Vector3();
  private sunLight: THREE.DirectionalLight;

  private onSnapshot: (snap: MissionSnapshot) => void;
  private onNotice?: (msg: string | null) => void;
  private disposed = false;

  constructor(
    container: HTMLElement,
    onSnapshot: (snap: MissionSnapshot) => void,
    onNotice?: (msg: string | null) => void
  ) {
    this.container = container;
    this.onSnapshot = onSnapshot;
    this.onNotice = onNotice;

    // Software WebGL guard from Three.js skill
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !this.isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    // Scene + Addis Ababa high-altitude warm sunlight sky & horizon fog
    const scene = new THREE.Scene();
    const skyColor = 0xc9dff2;
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.Fog(skyColor, 180, 720);
    this.scene = scene;

    // Mandatory studio environment map via PMREMGenerator + RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Camera
    const aspect = (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.12, 1600);

    // Warm/cool 3-point outdoor daylight rig
    const hemi = new THREE.HemisphereLight(0xbbe0ff, 0x9b7e5c, 0.72);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff4dd, 1.55);
    sun.position.set(80, 120, 60);
    sun.castShadow = !this.isSoftwareGl;
    sun.shadow.mapSize.set(1024, 1024);
    const d = 85;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 300;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    scene.add(sun.target);
    this.sunLight = sun;

    const rim = new THREE.DirectionalLight(0xc2dcff, 0.45);
    rim.position.set(-70, 55, -80);
    scene.add(rim);

    // Build bundled Merkato world, textures, minibus, and living market
    this.world = getMerkatoWorld();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    this.textures = createMerkatoTextures(maxAniso);
    this.worldAssets = buildMerkatoWorldScene(this.world, this.textures);
    scene.add(this.worldAssets.worldGroup);

    this.minibus = createEthiopianMinibus(this.textures);
    scene.add(this.minibus.root);

    this.market = createLivingMarket(this.world, this.textures);
    scene.add(this.market.group);

    this.audio = new MerkatoAudioEngine();
    this.physics = createInitialPhysics(this.world);
    this.mission = new MissionDirector(this.world);

    this.syncMinibusTransform();
    this.initTitleCamera();

    if (!this.isSoftwareGl) {
      renderer.compile(scene, this.camera);
    }

    this.bindEvents();
    this.emitSnapshot(true);
    this.tick();
  }

  public getWorldData(): MerkatoWorldData {
    return this.world;
  }

  private initTitleCamera(): void {
    // Stage live flyover around Anwar Mosque & Kenya St
    this.camPos.set(170, 48, 70);
    this.camTarget.set(45, 10, -25);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
  }

  private syncMinibusTransform(): void {
    this.minibus.root.position.set(this.physics.x, 0, this.physics.z);
    this.minibus.root.rotation.y = -this.physics.heading;
    this.minibus.setDoorOpen(this.mission.doorOpenRatio);
    this.minibus.setOnboardCount(this.mission.onboard.length);
  }

  public startMission(): void {
    this.audio.start();
    this.physics = createInitialPhysics(this.world);
    this.mission.reset();
    this.phase = 'playing';
    this.cameraMode = 'driver'; // Start right in driver's-seat or allow toggle with C!
    this.syncMinibusTransform();
    // Snap camera immediately to driver's seat on mission start
    this.snapCameraImmediate();
    this.showNotice('Stop 1: Autobis Tera — Press E to open sliding door and board passengers!', 4.2);
    this.emitSnapshot(true);
  }

  public togglePause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.keysHeld.clear();
      this.emitSnapshot(true);
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.lastTimeMs = performance.now();
      this.emitSnapshot(true);
    }
  }

  public toggleCamera(): void {
    this.cameraMode = this.cameraMode === 'driver' ? 'chase' : 'driver';
    this.snapCameraImmediate();
    this.emitSnapshot(true);
  }

  public toggleDoor(): void {
    if (this.phase !== 'playing') return;
    this.audio.start();
    const stop = this.mission.getCurrentStop();
    const dist = Math.hypot(this.physics.x - stop.curbX, this.physics.z - stop.curbZ);
    const inBay = dist <= 7.2;
    const isStopped = Math.abs(this.physics.speed) < 0.85;

    const res = this.mission.tryToggleDoor(inBay, isStopped, (opening) => {
      this.audio.playDoorSlide(opening);
    });
    if (!res.ok && res.reason) {
      this.showNotice(res.reason, 2.4);
    } else if (res.advancedStop) {
      const next = this.mission.getCurrentStop();
      this.showNotice(`Next stop: ${next.name} (${next.nameAm})`, 3.2);
    }
    this.emitSnapshot(true);
  }

  public triggerHorn(): void {
    this.audio.playHorn();
    this.market.triggerHornReaction(this.physics.x, this.physics.z);
  }

  public recoverTaxi(): void {
    if (this.phase !== 'playing') return;
    if (this.mission.doorOpen) {
      this.mission.doorOpen = false;
      this.mission.doorOpenRatio = 0;
    }
    recoverToNearestRoute(this.physics, this.world);
    this.syncMinibusTransform();
    this.snapCameraImmediate();
    this.showNotice('Recovered to nearest clear point on route.', 2.4);
    this.emitSnapshot(true);
  }

  public setTrafficDensity(density: TrafficDensity): void {
    this.trafficDensity = density;
    this.market.setDensity(density);
  }

  public setMuted(m: boolean): void {
    this.audio.setMuted(m);
  }

  public setTouchInput(partial: Partial<DrivingInput>): void {
    Object.assign(this.touchInput, partial);
  }

  private showNotice(text: string, durationSec: number): void {
    this.transientNotice = { text, until: this.elapsed + durationSec };
    this.onNotice?.(text);
  }

  private snapCameraImmediate(): void {
    const fwdX = Math.sin(this.physics.heading);
    const fwdZ = -Math.cos(this.physics.heading);
    const rightX = Math.cos(this.physics.heading);
    const rightZ = Math.sin(this.physics.heading);

    if (this.cameraMode === 'driver') {
      // High enough inside cab (y = 1.62m) to clearly judge both front corners in tight streets
      this.camPos.set(
        this.physics.x - rightX * 0.42 + fwdX * 1.15,
        1.62,
        this.physics.z - rightZ * 0.42 + fwdZ * 1.15
      );
      this.camTarget.set(
        this.physics.x - rightX * 0.2 + fwdX * 18,
        1.32,
        this.physics.z - rightZ * 0.2 + fwdZ * 18
      );
    } else {
      this.camPos.set(
        this.physics.x - fwdX * 7.6,
        3.55,
        this.physics.z - fwdZ * 7.6
      );
      this.camTarget.set(
        this.physics.x + fwdX * 5.0,
        1.45,
        this.physics.z + fwdZ * 5.0
      );
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('resize', this.handleResize);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      e.preventDefault();
    }
    if (this.phase === 'title') {
      if (code === 'Enter' || code === 'Space') {
        this.startMission();
      }
      return;
    }

    if (code === 'Escape') {
      this.togglePause();
      return;
    }

    if (this.phase !== 'playing') return;

    if (!this.keysHeld.has(code)) {
      // Edge-triggered actions
      if (code === 'KeyE') this.toggleDoor();
      else if (code === 'KeyH') this.triggerHorn();
      else if (code === 'KeyC') this.toggleCamera();
      else if (code === 'KeyR') this.recoverTaxi();
    }
    this.keysHeld.add(code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysHeld.delete(e.code);
  };

  private handleBlur = (): void => {
    this.keysHeld.clear();
    this.touchInput = { throttle: false, brake: false, left: false, right: false };
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private getDrivingInput(): DrivingInput {
    return {
      throttle: this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp') || this.touchInput.throttle,
      brake: this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown') || this.touchInput.brake,
      left: this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft') || this.touchInput.left,
      right: this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight') || this.touchInput.right,
    };
  }

  private tick = (): void => {
    if (this.disposed) return;

    const nowMs = performance.now();
    const rawDt = Math.max(0.001, (nowMs - this.lastTimeMs) / 1000);
    this.lastTimeMs = nowMs;
    const dt = Math.min(rawDt, 0.05);

    this.elapsed += dt;

    if (this.transientNotice && this.elapsed > this.transientNotice.until) {
      this.transientNotice = null;
      this.onNotice?.(null);
    }

    if (this.phase === 'title') {
      // Atmospheric slow orbit over Anwar Grand Mosque & Kenya Street
      const ang = this.elapsed * 0.14;
      const cx = 65;
      const cz = -20;
      this.camera.position.set(cx + Math.cos(ang) * 145, 42 + Math.sin(ang * 0.7) * 8, cz + Math.sin(ang) * 145);
      this.camera.lookAt(45, 8, -22);
      this.market.update(dt, 9999, 9999, 0, this.elapsed);
      this.audio.updateEngine(0, 0, false);
    } else if (this.phase === 'playing') {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      } else {
        const input = this.getDrivingInput();
        const stepRes = stepMinibusPhysics(
          this.physics,
          input,
          dt,
          this.world,
          this.market.aiVehicles,
          this.market.parkedColliders,
          this.mission.doorOpen || this.mission.doorOpenRatio > 0.15,
          this.worldAssets.roadblockColliders,
          this.market.pedestrians
        );
        const col = stepRes.collision;
        if (col) {
          this.audio.playBump(col.severity);
          this.mission.recordCollision(col.severity);
          this.hitstopTimer = 0.04;
          this.shakeStrength = Math.min(0.42, 0.12 + col.severity * 0.3);
          this.showNotice(
            col.kind === 'roadblock'
              ? 'District boundary roadblock — stay inside Merkato!'
              : col.kind === 'traffic'
                ? 'Careful! Bumped market traffic.'
                : 'Watch the tight Merkato curb!',
            2.2
          );
        }

        if (stepRes.pedImpacts.length > 0) {
          for (const imp of stepRes.pedImpacts) {
            this.market.knockPedestrian(imp.ped, imp.vx, imp.vz, imp.impactSpeed);
            this.mission.recordPedestrianHit();
          }
          this.audio.playPedestrianHit();
          this.mission.pushCustomSubtitle(
            'ኧረ ተጠንቀቅ!',
            'Ere tetenkek!',
            'Hey, watch where you are driving!',
            'Pedestrian',
            this.mission.elapsedSec
          );
          this.hitstopTimer = 0.045;
          this.shakeStrength = Math.max(this.shakeStrength, 0.28);
          this.showNotice('Watch out for pedestrians! (-15% Safety)', 2.4);
        }

        let missionCompletedNow = false;
        const mState = this.mission.update(
          dt,
          this.physics.x,
          this.physics.z,
          this.physics.heading,
          this.physics.speed,
          this.physics.routeS,
          (earnedBirr, isFinish) => {
            this.audio.playStopBell(earnedBirr > 0);
            if (isFinish) {
              this.phase = 'completed';
              missionCompletedNow = true;
              this.keysHeld.clear();
            } else {
              const earnedText = earnedBirr > 0 ? ` (+${earnedBirr} ETB fares)` : '';
              this.showNotice(`Boarding complete${earnedText} — Press E to close door!`, 3.5);
            }
          }
        );

        this.market.update(dt, this.physics.x, this.physics.z, this.physics.speed, this.elapsed);
        this.syncMinibusTransform();
        this.minibus.updateMotion(
          this.physics.wheelSpinAccum,
          this.physics.steerAngle,
          this.physics.pitch,
          this.physics.roll,
          this.physics.isBraking || this.mission.doorOpen
        );
        this.audio.updateEngine(this.physics.speed * 3.6, input.throttle ? 1 : 0, true);

        // Pulse GTA roadblock amber beacons
        const beaconOn = Math.sin(this.elapsed * 6.5) > 0;
        for (const bMesh of this.worldAssets.roadblockBeacons) {
          bMesh.visible = beaconOn;
        }

        // Update stop bay highlights & waiting passenger clusters
        const activeStop = this.mission.getCurrentStop();
        for (const [id, vis] of this.worldAssets.stopVisuals) {
          const isCurrent = id === activeStop.id;
          vis.bayMat.opacity = isCurrent ? 0.55 + Math.sin(this.elapsed * 4) * 0.18 : 0.16;
          vis.beaconMesh.visible = isCurrent;
          if (isCurrent) {
            vis.beaconMesh.position.y = 3.9 + Math.sin(this.elapsed * 3.5) * 0.25;
          }
        }
        for (const [id, cluster] of this.market.stopClusters) {
          const waitingCount = this.mission.waitingByStop.get(id)?.length ?? 0;
          cluster.setVisibleCount(waitingCount);
          if (id === activeStop.id && this.mission.doorOpen && mState.inStopBay) {
            cluster.setBoardingProgress(Math.min(1, this.mission.boardingTimer / 1.85));
          } else {
            cluster.setBoardingProgress(0);
          }
        }

        // Update sun shadow frustum around minibus
        this.sunLight.position.set(this.physics.x + 80, 120, this.physics.z + 60);
        this.sunLight.target.position.set(this.physics.x, 0, this.physics.z);

        // Update Camera with smooth exponential damping
        this.updateActiveCamera(dt);

        if (this.elapsed - this.lastSnapshotEmit > 0.08 || missionCompletedNow) {
          this.emitSnapshot(false);
          this.lastSnapshotEmit = this.elapsed;
        }
      }
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateActiveCamera(dt: number): void {
    const fwdX = Math.sin(this.physics.heading);
    const fwdZ = -Math.cos(this.physics.heading);
    const rightX = Math.cos(this.physics.heading);
    const rightZ = Math.sin(this.physics.heading);

    if (this.shakeStrength > 0) {
      this.shakeStrength = Math.max(0, this.shakeStrength - dt * 1.4);
    }
    const sx = (Math.random() - 0.5) * this.shakeStrength;
    const sy = (Math.random() - 0.5) * this.shakeStrength * 0.7;

    if (this.cameraMode === 'driver') {
      // Locked tightly to driver eye height (1.62m) looking over cab corners
      this._vecA.set(
        this.physics.x - rightX * 0.42 + fwdX * 1.15 + sx * 0.3,
        1.62 + sy * 0.3,
        this.physics.z - rightZ * 0.42 + fwdZ * 1.15
      );
      this._vecB.set(
        this.physics.x - rightX * 0.15 + fwdX * 20,
        1.32,
        this.physics.z - rightZ * 0.15 + fwdZ * 20
      );
      this.camPos.copy(this._vecA);
      this.camTarget.copy(this._vecB);
    } else {
      this._vecA.set(
        this.physics.x - fwdX * 7.6 + sx,
        3.55 + sy,
        this.physics.z - fwdZ * 7.6
      );
      this._vecB.set(
        this.physics.x + fwdX * 5.2,
        1.45,
        this.physics.z + fwdZ * 5.2
      );
      const posAlpha = 1 - Math.exp(-8.5 * dt);
      const tgtAlpha = 1 - Math.exp(-12.0 * dt);
      this.camPos.lerp(this._vecA, posAlpha);
      this.camTarget.lerp(this._vecB, tgtAlpha);
    }

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
  }

  private emitSnapshot(force: boolean): void {
    void force;
    const stop = this.mission.getCurrentStop();
    const distToBay = Math.hypot(this.physics.x - stop.curbX, this.physics.z - stop.curbZ);
    const inStopBay = distToBay <= 7.2;
    const isStoppedForBay = Math.abs(this.physics.speed) < 0.85;
    const boardingProgress = Math.min(1, this.mission.boardingTimer / 1.85);

    let doorStage: MissionSnapshot['doorStage'] = 'approach';
    if (this.mission.doorOpen) {
      doorStage = this.mission.stopServed ? 'ready_to_close' : 'boarding';
    } else if (inStopBay && !this.mission.stopServed) {
      doorStage = isStoppedForBay ? 'ready_to_open' : 'approach';
    } else if (this.mission.stopServed) {
      doorStage = 'departing';
    }

    this.onSnapshot({
      phase: this.phase,
      currentStopIndex: this.mission.currentStopIndex,
      currentStop: stop,
      nextStopDistM: Math.round(distToBay),
      inStopBay,
      isStoppedForBay,
      doorOpen: this.mission.doorOpen,
      doorBusy: this.mission.doorOpen && !this.mission.stopServed,
      boardingProgress,
      doorStage,
      onboard: [...this.mission.onboard],
      maxSeats: MAX_SEATS,
      waitingAtCurrentStop: this.mission.waitingByStop.get(stop.id)?.length ?? 0,
      passengersDelivered: this.mission.passengersDelivered,
      faresBirr: this.mission.faresBirr,
      safetyScore: Math.round(this.mission.safetyScore),
      smoothBrakingScore: Math.round(this.mission.smoothBrakingScore),
      stopAccuracyScore: this.mission.getStopAccuracyAverage(),
      totalScore: this.mission.getTotalScore(),
      speedKmh: Math.round(Math.abs(this.physics.speed * 3.6)),
      isReversing: this.physics.speed < -0.25,
      cameraMode: this.cameraMode,
      nextTurnCue: this.mission.getNextTurnCue(this.physics.routeS),
      offRouteWarning: this.physics.offRouteDist > 18,
      subtitle: this.mission.subtitle,
      elapsedSec: Math.round(this.mission.elapsedSec),
      routeProgressPct: Math.min(100, Math.round((this.physics.routeS / this.world.totalRouteLength) * 100)),
      playerX: this.physics.x,
      playerZ: this.physics.z,
      playerHeading: this.physics.heading,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('resize', this.handleResize);
    this.audio.dispose();
    this.worldAssets.dispose();
    this.textures.dispose();
    this.market.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
