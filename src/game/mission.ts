import type { MerkatoWorldData, TaxiStop, TurnCue } from '../data/merkatoRoutes';

export interface PassengerRecord {
  id: string;
  originStopId: string;
  destStopId: string;
  destName: string;
  fareBirr: number;
}

export interface SubtitleCue {
  amharic: string;
  translit: string;
  english: string;
  speaker: string;
  expiresAt: number;
}

export interface MissionSnapshot {
  phase: 'title' | 'playing' | 'paused' | 'completed';
  currentStopIndex: number;
  currentStop: TaxiStop;
  nextStopDistM: number;
  inStopBay: boolean;
  isStoppedForBay: boolean;
  doorOpen: boolean;
  doorBusy: boolean;
  boardingProgress: number; // 0..1
  doorStage: 'approach' | 'ready_to_open' | 'boarding' | 'ready_to_close' | 'departing';
  onboard: PassengerRecord[];
  maxSeats: number;
  waitingAtCurrentStop: number;
  passengersDelivered: number;
  faresBirr: number;
  safetyScore: number; // 0..100
  smoothBrakingScore: number; // 0..100
  stopAccuracyScore: number; // 0..100
  totalScore: number;
  speedKmh: number;
  isReversing: boolean;
  cameraMode: 'driver' | 'chase';
  nextTurnCue: TurnCue | null;
  offRouteWarning: boolean;
  subtitle: SubtitleCue | null;
  elapsedSec: number;
  routeProgressPct: number;
  playerX: number;
  playerZ: number;
  playerHeading: number;
}

export const MAX_SEATS = 12;

// Verified everyday Addis Ababa minibus taxi Amharic phrases
const STOP_CALLOUTS: Record<string, { am: string; tr: string; en: string }> = {
  autobis_start: {
    am: 'ጤና ይስጥልኝ! ወደ መርካቶ እንሂድ',
    tr: 'Tena yistilign! Wede Merkato enhid',
    en: 'Hello! Let us head into Merkato',
  },
  raguel_kenya: {
    am: 'ወራጅ አለ! ቅዱስ ራጉኤል ጋር ያቁሙ',
    tr: 'Weraj ale! Kidus Raguel gar yakumu',
    en: 'Passenger getting off! Stop by St. Raguel Church',
  },
  cinema_ras: {
    am: 'ሲኒማ ራስ ወራጅ አለ!',
    tr: 'Cinema Ras weraj ale!',
    en: 'Someone is getting off at Cinema Ras!',
  },
  anwar_east: {
    am: 'ታላቁ አንዋር መስጊድ ጋር ያቁሙ!',
    tr: 'Talaku Anwar Mesgid gar yakumu!',
    en: 'Please stop at Anwar Grand Mosque!',
  },
  raguel_north: {
    am: 'ራጉኤል ሰሜን ወራጅ አለ!',
    tr: 'Raguel Semen weraj ale!',
    en: 'Dropping off at Raguel North (Habte Giorgis)!',
  },
  gojam_berenda: {
    am: 'ጎጃም በረንዳ ይውረዱ!',
    tr: 'Gojam Berenda yiwredu!',
    en: 'Stop here for Gojam Berenda!',
  },
  autobis_end: {
    am: 'አውቶቢስ ተራ ደርሰናል! እናመሰግናለን',
    tr: 'Autobis Tera dersenal! Enamesegnalen',
    en: 'We reached Autobis Tera! Thank you',
  },
};

export function createStopWaitingManifest(): Map<string, PassengerRecord[]> {
  const m = new Map<string, PassengerRecord[]>();

  // Stop 0: Autobis Tera (Kenya St) -> 4 initial passengers going to varied stops
  m.set('autobis_start', [
    { id: 'p1', originStopId: 'autobis_start', destStopId: 'raguel_kenya', destName: 'St. Raguel Church', fareBirr: 10 },
    { id: 'p2', originStopId: 'autobis_start', destStopId: 'anwar_east', destName: 'Anwar Grand Mosque', fareBirr: 15 },
    { id: 'p3', originStopId: 'autobis_start', destStopId: 'gojam_berenda', destName: 'Gojam Berenda', fareBirr: 20 },
    { id: 'p4', originStopId: 'autobis_start', destStopId: 'autobis_end', destName: 'Autobis Tera', fareBirr: 25 },
  ]);

  // Stop 1: St. Raguel Church (Kenya St) -> 3 boarding
  m.set('raguel_kenya', [
    { id: 'p5', originStopId: 'raguel_kenya', destStopId: 'cinema_ras', destName: 'Cinema Ras', fareBirr: 10 },
    { id: 'p6', originStopId: 'raguel_kenya', destStopId: 'anwar_east', destName: 'Anwar Grand Mosque', fareBirr: 12 },
    { id: 'p7', originStopId: 'raguel_kenya', destStopId: 'autobis_end', destName: 'Autobis Tera', fareBirr: 20 },
  ]);

  // Stop 2: Cinema Ras -> 3 boarding
  m.set('cinema_ras', [
    { id: 'p8', originStopId: 'cinema_ras', destStopId: 'raguel_north', destName: 'Raguel North', fareBirr: 12 },
    { id: 'p9', originStopId: 'cinema_ras', destStopId: 'gojam_berenda', destName: 'Gojam Berenda', fareBirr: 15 },
    { id: 'p10', originStopId: 'cinema_ras', destStopId: 'autobis_end', destName: 'Autobis Tera', fareBirr: 20 },
  ]);

  // Stop 3: Anwar Grand Mosque -> 4 boarding
  m.set('anwar_east', [
    { id: 'p11', originStopId: 'anwar_east', destStopId: 'raguel_north', destName: 'Raguel North', fareBirr: 10 },
    { id: 'p12', originStopId: 'anwar_east', destStopId: 'gojam_berenda', destName: 'Gojam Berenda', fareBirr: 12 },
    { id: 'p13', originStopId: 'anwar_east', destStopId: 'autobis_end', destName: 'Autobis Tera', fareBirr: 18 },
    { id: 'p14', originStopId: 'anwar_east', destStopId: 'autobis_end', destName: 'Autobis Tera', fareBirr: 18 },
  ]);

  // Stop 4: Raguel North -> 3 boarding
  m.set('raguel_north', [
    { id: 'p15', originStopId: 'raguel_north', destStopId: 'gojam_berenda', destName: 'Gojam Berenda', fareBirr: 10 },
    { id: 'p16', originStopId: 'raguel_north', destStopId: 'autobis_end', destName: 'Autobis Tera', fareBirr: 15 },
    { id: 'p17', originStopId: 'raguel_north', destStopId: 'autobis_end', destName: 'Autobis Tera', fareBirr: 15 },
  ]);

  // Stop 5: Gojam Berenda -> 3 boarding for terminal
  m.set('gojam_berenda', [
    { id: 'p18', originStopId: 'gojam_berenda', destStopId: 'autobis_end', destName: 'Autobis Tera', fareBirr: 12 },
    { id: 'p19', originStopId: 'gojam_berenda', destStopId: 'autobis_end', destName: 'Autobis Tera', fareBirr: 12 },
    { id: 'p20', originStopId: 'gojam_berenda', destStopId: 'autobis_end', destName: 'Autobis Tera', fareBirr: 12 },
  ]);

  m.set('autobis_end', []);
  return m;
}

export class MissionDirector {
  public world: MerkatoWorldData;
  public currentStopIndex = 0;
  public onboard: PassengerRecord[] = [];
  public waitingByStop: Map<string, PassengerRecord[]>;
  public doorOpen = false;
  public doorOpenRatio = 0;
  public boardingTimer = 0;
  public stopServed = false;
  public passengersDelivered = 0;
  public faresBirr = 0;
  public safetyScore = 100;
  public smoothBrakingScore = 100;
  public stopAccuracyAccumulator = 0;
  public stopsCompletedCount = 0;
  public subtitle: SubtitleCue | null = null;
  public elapsedSec = 0;
  private announcedStopApproach = new Set<string>();
  private lastSpeedMs = 0;

  constructor(world: MerkatoWorldData) {
    this.world = world;
    this.waitingByStop = createStopWaitingManifest();
  }

  public reset(): void {
    this.currentStopIndex = 0;
    this.onboard = [];
    this.waitingByStop = createStopWaitingManifest();
    this.doorOpen = false;
    this.doorOpenRatio = 0;
    this.boardingTimer = 0;
    this.stopServed = false;
    this.passengersDelivered = 0;
    this.faresBirr = 0;
    this.safetyScore = 100;
    this.smoothBrakingScore = 100;
    this.stopAccuracyAccumulator = 0;
    this.stopsCompletedCount = 0;
    this.subtitle = null;
    this.elapsedSec = 0;
    this.announcedStopApproach.clear();
    this.lastSpeedMs = 0;
  }

  public getCurrentStop(): TaxiStop {
    return this.world.stops[Math.min(this.world.stops.length - 1, this.currentStopIndex)];
  }

  public pushSubtitle(stopId: string, nowSec: number, speaker = 'Passenger'): void {
    const c = STOP_CALLOUTS[stopId];
    if (!c) return;
    this.subtitle = {
      amharic: c.am,
      translit: c.tr,
      english: c.en,
      speaker,
      expiresAt: nowSec + 4.5,
    };
  }

  public pushCustomSubtitle(amharic: string, translit: string, english: string, speaker: string, nowSec: number): void {
    this.subtitle = {
      amharic,
      translit,
      english,
      speaker,
      expiresAt: nowSec + 3.2,
    };
  }

  public recordCollision(severity: number): void {
    this.safetyScore = Math.max(20, this.safetyScore - Math.round(4 + severity * 10));
  }

  public recordPedestrianHit(): void {
    this.safetyScore = Math.max(0, this.safetyScore - 15);
  }

  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    playerHeading: number,
    speedMs: number,
    routeS: number,
    onStopComplete: (earnedBirr: number, isFinish: boolean) => void
  ): { inStopBay: boolean; isStopped: boolean; isCompleted: boolean } {
    this.elapsedSec += dt;

    // Evaluate braking smoothness when slowing down above 3 m/s
    const decel = (this.lastSpeedMs - speedMs) / Math.max(0.01, dt);
    if (decel > 9.8 && this.lastSpeedMs > 4.0) {
      this.smoothBrakingScore = Math.max(40, this.smoothBrakingScore - dt * 14);
    } else if (speedMs > 1.0 && decel > 1.5 && decel <= 7.5) {
      this.smoothBrakingScore = Math.min(100, this.smoothBrakingScore + dt * 0.8);
    }
    this.lastSpeedMs = speedMs;

    if (this.subtitle && this.elapsedSec > this.subtitle.expiresAt) {
      this.subtitle = null;
    }

    // Animate door ratio smoothly
    const targetDoor = this.doorOpen ? 1 : 0;
    this.doorOpenRatio += (targetDoor - this.doorOpenRatio) * Math.min(1, 9 * dt);

    const stop = this.getCurrentStop();
    const distToBay = Math.hypot(playerX - stop.curbX, playerZ - stop.curbZ);
    const inStopBay = distToBay <= 7.2;
    const isStopped = Math.abs(speedMs) < 0.85;

    // Announce approach when within 65m
    if (distToBay < 65 && !this.announcedStopApproach.has(stop.id)) {
      this.announcedStopApproach.add(stop.id);
      const hasAlighting = this.onboard.some((p) => p.destStopId === stop.id);
      if (hasAlighting || stop.isStart || stop.isFinish) {
        this.pushSubtitle(stop.id, this.elapsedSec, stop.isStart ? 'Weyala (Assistant)' : 'Passenger');
      }
    }

    // Handle boarding / alighting sequence while door is open inside the bay
    let isCompleted = false;
    if (this.doorOpen && inStopBay && isStopped && !this.stopServed) {
      this.boardingTimer += dt;
      if (this.boardingTimer >= 1.85) {
        this.stopServed = true;
        // 1. Alight passengers destined for this stop
        const remaining: PassengerRecord[] = [];
        let earnedHere = 0;
        let alightedHere = 0;
        for (const p of this.onboard) {
          if (p.destStopId === stop.id || stop.isFinish) {
            earnedHere += p.fareBirr;
            alightedHere += 1;
          } else {
            remaining.push(p);
          }
        }
        this.onboard = remaining;
        this.passengersDelivered += alightedHere;
        this.faresBirr += earnedHere;

        // 2. Board waiting passengers up to MAX_SEATS
        const waiting = this.waitingByStop.get(stop.id) ?? [];
        const freeSeats = MAX_SEATS - this.onboard.length;
        const boarding = waiting.slice(0, freeSeats);
        const leftBehind = waiting.slice(freeSeats);
        this.onboard.push(...boarding);
        this.waitingByStop.set(stop.id, leftBehind);

        // 3. Score stop accuracy (curb distance + alignment)
        const angleDiff = Math.abs(Math.atan2(Math.sin(playerHeading - stop.heading), Math.cos(playerHeading - stop.heading)));
        const accuracy = Math.max(
          55,
          Math.min(100, Math.round(100 - distToBay * 4.5 - (angleDiff * 180) / Math.PI * 0.45))
        );
        this.stopAccuracyAccumulator += accuracy;
        this.stopsCompletedCount += 1;

        if (stop.isStart) {
          this.pushSubtitle('autobis_start', this.elapsedSec, 'Weyala (Assistant)');
        }
        if (stop.isFinish) {
          this.pushSubtitle('autobis_end', this.elapsedSec, 'Weyala (Assistant)');
          isCompleted = true;
        }
        onStopComplete(earnedHere, Boolean(stop.isFinish));
      }
    }

    // Also evaluate next turn cue based on routeS
    void routeS;
    return { inStopBay, isStopped, isCompleted };
  }

  public tryToggleDoor(
    inStopBay: boolean,
    isStopped: boolean,
    onAudioDoor: (opening: boolean) => void
  ): { ok: boolean; reason?: string; advancedStop?: boolean } {
    if (!this.doorOpen) {
      if (!inStopBay) {
        return { ok: false, reason: 'Pull alongside the green stop bay first!' };
      }
      if (!isStopped) {
        return { ok: false, reason: 'Brake fully (0 km/h) before opening the door!' };
      }
      this.doorOpen = true;
      this.boardingTimer = 0;
      onAudioDoor(true);
      return { ok: true };
    } else {
      // Prevent closing while still mid-boarding unless done
      if (inStopBay && !this.stopServed && this.boardingTimer < 1.85) {
        return { ok: false, reason: 'Wait for passengers to finish boarding...' };
      }
      this.doorOpen = false;
      onAudioDoor(false);
      let advancedStop = false;
      if (this.stopServed && this.currentStopIndex < this.world.stops.length - 1) {
        this.currentStopIndex += 1;
        this.stopServed = false;
        this.boardingTimer = 0;
        advancedStop = true;
      }
      return { ok: true, advancedStop };
    }
  }

  public getNextTurnCue(routeS: number): TurnCue | null {
    for (const cue of this.world.turnCues) {
      const d = cue.s - routeS;
      if (d > 4 && d <= 165) {
        return { ...cue, distanceM: Math.round(d) };
      }
    }
    return null;
  }

  public getStopAccuracyAverage(): number {
    if (this.stopsCompletedCount === 0) return 100;
    return Math.round(this.stopAccuracyAccumulator / this.stopsCompletedCount);
  }

  public getTotalScore(): number {
    const acc = this.getStopAccuracyAverage();
    return Math.round((this.safetyScore * 0.4 + this.smoothBrakingScore * 0.3 + acc * 0.3) * 10);
  }
}
