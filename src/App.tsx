import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Camera,
  CornerUpLeft,
  CornerUpRight,
  DoorOpen,
  Info,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Smartphone,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Minimap } from './components/Minimap';
import { TouchControls } from './components/TouchControls';
import { getMerkatoWorld } from './data/merkatoRoutes';
import { MerkatoEngine } from './game/MerkatoEngine';
import type { MissionSnapshot } from './game/mission';
import type { TrafficDensity } from './game/models/livingMarket';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<MerkatoEngine | null>(null);
  const [world] = useState(() => getMerkatoWorld());
  const [snap, setSnap] = useState<MissionSnapshot | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [density, setDensity] = useState<TrafficDensity>('normal');
  const [showInfo, setShowInfo] = useState(false);
  const [touchVisible, setTouchVisible] = useState(() =>
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const engine = new MerkatoEngine(
      el,
      (nextSnap) => setSnap(nextSnap),
      (msg) => setNotice(msg)
    );
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleDensity = (next: TrafficDensity) => {
    setDensity(next);
    engineRef.current?.setTrafficDensity(next);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    engineRef.current?.setMuted(next);
  };

  const phase = snap?.phase ?? 'title';
  const grade =
    !snap ? 'A' : snap.totalScore >= 900 ? 'S' : snap.totalScore >= 800 ? 'A' : snap.totalScore >= 680 ? 'B' : 'C';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 font-sans">
      {/* Isolated WebGL mount container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* TITLE SCREEN OVERLAY */}
      {phase === 'title' && (
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 bg-gradient-to-r from-stone-950/90 via-stone-950/60 to-transparent">
          <div className="flex items-start justify-between">
            <div className="bg-stone-950/90 border border-stone-700 px-3 py-1.5 rounded text-xs tracking-wide text-stone-300">
              ADDIS ABABA · MERKATO · GAME ROUTE (OSM)
            </div>
            <button
              type="button"
              onClick={() => setShowInfo(true)}
              className="flex items-center gap-1.5 bg-stone-950/90 border border-stone-700 hover:border-sky-500 px-3 py-1.5 rounded text-xs text-stone-200 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-sky-400" />
              Map & Image Credits
            </button>
          </div>

          <div className="max-w-lg space-y-5 my-auto">
            {/* Bespoke SVG Title Lockup */}
            <svg viewBox="0 0 460 120" className="w-full max-w-md drop-shadow-lg" aria-label="Merkato Minibus">
              <rect x="0" y="8" width="128" height="10" rx="2" fill="#1685d8" />
              <rect x="134" y="8" width="54" height="10" rx="2" fill="#10b981" />
              <rect x="194" y="8" width="42" height="10" rx="2" fill="#f59e0b" />
              <text x="0" y="54" fill="#f8fafc" fontSize="42" fontWeight="900" letterSpacing="1.5">
                MERKATO MINIBUS
              </text>
              <text x="2" y="92" fill="#38bdf8" fontSize="26" fontWeight="700">
                መርካቶ ሚኒባስ · ADDIS ABABA
              </text>
            </svg>

            <p className="text-sm sm:text-base text-stone-200 leading-relaxed bg-stone-950/75 border-l-2 border-sky-400 pl-3.5 py-2 rounded-r">
              Drive a blue-and-white Ethiopian share taxi from <strong className="text-white">Autobis Tera</strong> along{' '}
              <strong className="text-white">Kenya Street</strong>, past <strong className="text-white">St. Raguel Church</strong>,{' '}
              <strong className="text-white">Cinema Ras</strong>, <strong className="text-white">Anwar Grand Mosque</strong>, and{' '}
              <strong className="text-white">Gojam Berenda</strong>.
            </p>

            {/* Traffic Density selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-stone-400 mr-1">Market Traffic:</span>
              {(['low', 'normal', 'busy'] as TrafficDensity[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDensity(d)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold capitalize border cursor-pointer ${
                    density === d
                      ? 'bg-sky-600 border-sky-400 text-white'
                      : 'bg-stone-900/90 border-stone-700 text-stone-300 hover:border-stone-500'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => engineRef.current?.startMission()}
                className="flex items-center gap-2.5 bg-sky-500 hover:bg-sky-400 text-stone-950 font-extrabold px-7 py-3.5 rounded-md text-base shadow-lg cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                START SHIFT (ENTER)
              </button>
              <span className="text-xs text-stone-400">
                5–8 min route · 7 stops · 12 passenger seats
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-300 bg-stone-950/85 border border-stone-800 px-4 py-2.5 rounded">
            <span>
              <strong className="text-white">W / Up</strong> Accelerate · <strong className="text-white">S / Down</strong> Brake / Reverse ·{' '}
              <strong className="text-white">A / D</strong> Steer · <strong className="text-white">E</strong> Door ·{' '}
              <strong className="text-white">H</strong> Horn · <strong className="text-white">C</strong> Camera ·{' '}
              <strong className="text-white">R</strong> Recover
            </span>
            <span className="text-stone-400">© OpenStreetMap contributors</span>
          </div>
        </div>
      )}

      {/* DRIVING HUD OVERLAY (>= 85% unobstructed center playfield, zero backdrop-filter) */}
      {(phase === 'playing' || phase === 'paused') && snap && (
        <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
          {/* TOP BAR */}
          <div className="flex items-start justify-between gap-3">
            {/* Top-Left: Next Stop + Next Turn Cue */}
            <div className="flex flex-col gap-2 max-w-[290px] sm:max-w-[330px]">
              <div className="bg-stone-950/92 border border-stone-700/90 rounded-md px-3 py-2 shadow-lg">
                <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-sky-400 font-semibold">
                  <span>Game Route · Stop {snap.currentStopIndex + 1}/{world.stops.length}</span>
                  <span className="tabular-nums text-stone-300">{snap.routeProgressPct}%</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm font-bold text-white truncate">{snap.currentStop.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-300 mt-0.5">
                  <span className="truncate text-amber-300/90">{snap.currentStop.nameAm}</span>
                  <span className="tabular-nums font-bold text-emerald-300 ml-2 shrink-0">
                    {snap.nextStopDistM} m
                  </span>
                </div>
              </div>

              {snap.nextTurnCue && (
                <div className="bg-amber-950/95 border border-amber-500/80 rounded-md px-3 py-2 flex items-center gap-2.5 shadow-lg">
                  {snap.nextTurnCue.direction === 'left' && <CornerUpLeft className="w-5 h-5 text-amber-300 shrink-0" />}
                  {snap.nextTurnCue.direction === 'right' && <CornerUpRight className="w-5 h-5 text-amber-300 shrink-0" />}
                  {snap.nextTurnCue.direction === 'uturn' && <RotateCcw className="w-5 h-5 text-amber-300 shrink-0" />}
                  {snap.nextTurnCue.direction === 'straight' && <ArrowUp className="w-5 h-5 text-amber-300 shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-amber-200 uppercase tracking-wide tabular-nums">
                      {snap.nextTurnCue.direction === 'uturn' ? 'U-Turn' : `Turn ${snap.nextTurnCue.direction}`} in{' '}
                      {snap.nextTurnCue.distanceM} m
                    </div>
                    <div className="text-[11px] text-amber-100/90 truncate">{snap.nextTurnCue.streetName}</div>
                  </div>
                </div>
              )}

              {snap.offRouteWarning && (
                <div className="bg-rose-950/95 border border-rose-500 rounded-md px-3 py-1.5 text-xs font-semibold text-rose-100">
                  Off mapped route — follow blue line or press R to recover.
                </div>
              )}
            </div>

            {/* Top-Right: Minimap + Compact Utility Buttons */}
            <div className="flex flex-col items-end gap-2">
              <div className="pointer-events-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => engineRef.current?.toggleCamera()}
                  className="flex items-center gap-1 bg-stone-950/92 border border-stone-700 hover:border-sky-400 px-2.5 py-1.5 rounded text-xs text-stone-100 cursor-pointer"
                  title="Switch Camera (C)"
                >
                  <Camera className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">{snap.cameraMode === 'driver' ? 'Driver' : 'Chase'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => engineRef.current?.recoverTaxi()}
                  className="bg-stone-950/92 border border-stone-700 hover:border-amber-400 px-2.5 py-1.5 rounded text-xs text-stone-100 cursor-pointer"
                  title="Recover to Route (R)"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="bg-stone-950/92 border border-stone-700 hover:border-sky-400 px-2.5 py-1.5 rounded text-xs text-stone-100 cursor-pointer"
                  title="Toggle Sound"
                >
                  {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setTouchVisible((v) => !v)}
                  className={`bg-stone-950/92 border px-2.5 py-1.5 rounded text-xs cursor-pointer ${
                    touchVisible ? 'border-sky-400 text-sky-300' : 'border-stone-700 text-stone-300'
                  }`}
                  title="Toggle Touch Controls"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowInfo(true)}
                  className="bg-stone-950/92 border border-stone-700 hover:border-sky-400 px-2.5 py-1.5 rounded text-xs text-stone-100 cursor-pointer"
                  title="Credits & Map Info"
                >
                  <Info className="w-3.5 h-3.5 text-stone-300" />
                </button>
                <button
                  type="button"
                  onClick={() => engineRef.current?.togglePause()}
                  className="bg-stone-950/92 border border-stone-700 hover:border-sky-400 px-2.5 py-1.5 rounded text-xs text-stone-100 cursor-pointer"
                  title="Pause (Esc)"
                >
                  <Pause className="w-3.5 h-3.5 text-stone-200" />
                </button>
              </div>

              <Minimap
                world={world}
                playerX={snap.playerX}
                playerZ={snap.playerZ}
                playerHeading={snap.playerHeading}
                currentStopIndex={snap.currentStopIndex}
              />
            </div>
          </div>

          {/* CENTER-BOTTOM PASSENGER SUBTITLES & STOP DOOR CUES */}
          <div className={`flex flex-col items-center gap-2 ${touchVisible ? 'mb-20' : 'mb-1'}`}>
            {snap.subtitle && (
              <div className="bg-stone-950/95 border border-sky-500/80 rounded-md px-4 py-2 text-center max-w-md shadow-xl">
                <div className="text-[11px] uppercase tracking-wider text-sky-400 font-bold">
                  {snap.subtitle.speaker}
                </div>
                <div className="text-sm sm:text-base font-bold text-white mt-0.5">{snap.subtitle.amharic}</div>
                <div className="text-xs text-amber-200/90 italic">{snap.subtitle.translit}</div>
                <div className="text-xs text-stone-200 mt-0.5">“{snap.subtitle.english}”</div>
              </div>
            )}

            {notice && (
              <div className="bg-stone-900/95 border border-amber-400/70 rounded px-3.5 py-1.5 text-xs font-semibold text-amber-200 shadow">
                {notice}
              </div>
            )}

            {snap.inStopBay && snap.doorStage !== 'departing' && (
              <div className="bg-emerald-950/95 border border-emerald-400 rounded-md px-4 py-2 text-xs sm:text-sm font-bold text-emerald-100 shadow-lg flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-emerald-300 shrink-0" />
                {snap.doorStage === 'approach' && 'Brake fully (0 km/h) to open the passenger door.'}
                {snap.doorStage === 'ready_to_open' && 'Stopped at bay! Press E to open sliding door.'}
                {snap.doorStage === 'boarding' &&
                  `Passengers boarding / alighting... ${Math.round(snap.boardingProgress * 100)}%`}
                {snap.doorStage === 'ready_to_close' && 'Done! Press E to close door and rejoin traffic.'}
              </div>
            )}
          </div>

          {/* BOTTOM-LEFT TELEMETRY CLUSTER (Speed, Seats, Door, Fares, Safety) */}
          <div className={`flex items-end justify-between ${touchVisible ? 'hidden sm:flex sm:mb-20' : ''}`}>
            <div className="bg-stone-950/92 border border-stone-700/90 rounded-md px-3.5 py-2.5 flex items-center gap-4 shadow-lg">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400">Speed</div>
                <div className="text-2xl font-black text-white tabular-nums leading-none mt-0.5">
                  {snap.speedKmh}{' '}
                  <span className="text-xs font-semibold text-stone-400">
                    {snap.isReversing ? 'REV' : 'km/h'}
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-stone-800" />

              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400">Passengers</div>
                <div className="flex items-center gap-1.5 text-lg font-extrabold text-sky-300 tabular-nums leading-none mt-0.5">
                  <Users className="w-4 h-4" />
                  {snap.onboard.length}/{snap.maxSeats}
                  <span className="text-[11px] font-normal text-stone-400">
                    ({snap.maxSeats - snap.onboard.length} free)
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-stone-800" />

              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400">Door (E)</div>
                <div
                  className={`text-xs font-extrabold uppercase mt-1 ${
                    snap.doorOpen ? 'text-emerald-400' : 'text-stone-300'
                  }`}
                >
                  {snap.doorOpen ? 'OPEN' : 'CLOSED'}
                </div>
              </div>

              <div className="h-8 w-px bg-stone-800 hidden sm:block" />

              <div className="hidden sm:block">
                <div className="text-[10px] uppercase tracking-wider text-stone-400">Fares</div>
                <div className="text-lg font-extrabold text-amber-300 tabular-nums leading-none mt-0.5">
                  {snap.faresBirr} <span className="text-xs">ETB</span>
                </div>
              </div>

              <div className="h-8 w-px bg-stone-800 hidden md:block" />

              <div className="hidden md:block">
                <div className="text-[10px] uppercase tracking-wider text-stone-400">Safe Score</div>
                <div className="text-lg font-extrabold text-emerald-300 tabular-nums leading-none mt-0.5">
                  {snap.safetyScore}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOUCH CONTROLS */}
      {phase === 'playing' && touchVisible && snap && (
        <TouchControls
          onInput={(partial) => engineRef.current?.setTouchInput(partial)}
          onDoor={() => engineRef.current?.toggleDoor()}
          onHorn={() => engineRef.current?.triggerHorn()}
          onCamera={() => engineRef.current?.toggleCamera()}
          doorOpen={snap.doorOpen}
        />
      )}

      {/* PAUSE MODAL */}
      {phase === 'paused' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/85 p-4">
          <div className="w-full max-w-sm bg-stone-900 border border-stone-700 rounded-lg p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-extrabold text-white">Shift Paused</h2>
            <div className="space-y-2">
              <div className="text-xs text-stone-400 uppercase tracking-wider">Traffic Density</div>
              <div className="flex gap-2">
                {(['low', 'normal', 'busy'] as TrafficDensity[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDensity(d)}
                    className={`flex-1 py-1.5 rounded text-xs font-semibold capitalize border cursor-pointer ${
                      density === d
                        ? 'bg-sky-600 border-sky-400 text-white'
                        : 'bg-stone-800 border-stone-700 text-stone-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => engineRef.current?.togglePause()}
                className="w-full py-2.5 rounded bg-sky-500 hover:bg-sky-400 text-stone-950 font-bold text-sm cursor-pointer"
              >
                Resume Driving
              </button>
              <button
                type="button"
                onClick={() => engineRef.current?.startMission()}
                className="w-full py-2.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-sm border border-stone-700 cursor-pointer"
              >
                Restart Mission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MISSION COMPLETED SUMMARY MODAL */}
      {phase === 'completed' && snap && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/90 p-4">
          <div className="w-full max-w-md bg-stone-900 border border-stone-700 rounded-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-emerald-400 font-bold">Route Completed</div>
                <h2 className="text-2xl font-black text-white mt-0.5">Merkato Shift Summary</h2>
              </div>
              <div className="w-14 h-14 rounded-lg bg-sky-500/20 border border-sky-400 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase text-sky-300 font-bold">Grade</span>
                <span className="text-2xl font-black text-white leading-none">{grade}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-stone-950 border border-stone-800 rounded p-3">
                <div className="text-xs text-stone-400">Passengers Delivered</div>
                <div className="text-2xl font-black text-sky-300 tabular-nums mt-0.5">{snap.passengersDelivered}</div>
              </div>
              <div className="bg-stone-950 border border-stone-800 rounded p-3">
                <div className="text-xs text-stone-400">Fares Earned</div>
                <div className="text-2xl font-black text-amber-300 tabular-nums mt-0.5">{snap.faresBirr} ETB</div>
              </div>
            </div>

            <div className="bg-stone-950 border border-stone-800 rounded p-3.5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-300">Safe Driving</span>
                <span className="font-bold text-emerald-300 tabular-nums">{snap.safetyScore}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-300">Smooth Braking</span>
                <span className="font-bold text-emerald-300 tabular-nums">{snap.smoothBrakingScore}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-300">Accurate Curb Stops</span>
                <span className="font-bold text-emerald-300 tabular-nums">{snap.stopAccuracyScore}%</span>
              </div>
              <div className="border-t border-stone-800 pt-2 flex justify-between text-base">
                <span className="font-bold text-white">Total Driving Score</span>
                <span className="font-black text-sky-300 tabular-nums">{snap.totalScore} / 1000</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => engineRef.current?.startMission()}
              className="w-full py-3 rounded-md bg-sky-500 hover:bg-sky-400 text-stone-950 font-extrabold text-sm cursor-pointer"
            >
              Drive Another Shift
            </button>
          </div>
        </div>
      )}

      {/* ATTRIBUTION & VERIFIED REFERENCE MODAL */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 p-4">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-stone-900 border border-stone-700 rounded-lg p-6 space-y-4 text-xs sm:text-sm text-stone-200 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-white">Map Data, References & Image Credits</h2>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="px-2.5 py-1 rounded bg-stone-800 text-stone-200 hover:bg-stone-700 cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="space-y-2 leading-relaxed">
              <p>
                <strong className="text-white">Map Geometry:</strong> Bundled offline from{' '}
                <span className="text-sky-300">OpenStreetMap (© OpenStreetMap contributors, ODbL)</span> around{' '}
                9.0322°N, 38.7400°E. Includes verified street names (Kenya St, Tesema Aba Kemaw St, Fitawrari
                Habte Giorgis St), one-way carriageways, building footprints, Anwar Grand Mosque (way 42656246), St.
                Raguel Church (way 42656245), and Addis Ababa Transport Bureau share-taxi stop platforms.
              </p>
              <p>
                <strong className="text-white">Visual Reference Study:</strong> Facades, awnings, and minibus livery
                were studied from openly licensed Wikimedia Commons photographs:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-stone-300">
                <li>
                  <em>Anwar Grand Mosque.jpg</em> by Gangaddis (CC BY-SA 4.0) &amp;{' '}
                  <em>Anwar mosque (25070187162).jpg</em> by Francisco Anzola (CC BY 2.0)
                </li>
                <li>
                  <em>Addis Mercato, 2024-01-19, DD 27 &amp; DD 28</em> by Diego Delso (CC BY-SA 4.0)
                </li>
                <li>
                  <em>Merkato streets.jpg</em> by Abpics234 (CC BY-SA 4.0)
                </li>
                <li>
                  <em>Minibus taxi in Addis Ababa.jpg</em> by Radosław Botev (CC BY 3.0 PL)
                </li>
              </ul>
              <p className="text-stone-400">
                Note: All 3D textures and audio are procedurally generated in-browser from these studies for offline
                reliability. Because St. Raguel Church exterior street-level photos are limited in open repositories, its
                facade uses a traditional Ethiopian Orthodox octagonal stone approximation aligned to its real OSM
                footprint.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
