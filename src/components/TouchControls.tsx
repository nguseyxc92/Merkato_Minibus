import type { DrivingInput } from '../game/physics';

interface TouchControlsProps {
  onInput: (partial: Partial<DrivingInput>) => void;
  onDoor: () => void;
  onHorn: () => void;
  onCamera: () => void;
  doorOpen: boolean;
}

export function TouchControls({ onInput, onDoor, onHorn, onCamera, doorOpen }: TouchControlsProps) {
  const bindHold = (field: keyof DrivingInput) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      onInput({ [field]: true });
    },
    onPointerUp: () => onInput({ [field]: false }),
    onPointerLeave: () => onInput({ [field]: false }),
    onPointerCancel: () => onInput({ [field]: false }),
  });

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 px-4 flex items-end justify-between z-30">
      {/* Left/Right Steering */}
      <div className="pointer-events-auto flex gap-2.5">
        <button
          type="button"
          {...bindHold('left')}
          className="w-16 h-16 rounded-lg bg-stone-900/90 border border-stone-600 text-stone-100 font-bold text-xl active:bg-sky-700 touch-none"
          aria-label="Steer Left"
        >
          ◀
        </button>
        <button
          type="button"
          {...bindHold('right')}
          className="w-16 h-16 rounded-lg bg-stone-900/90 border border-stone-600 text-stone-100 font-bold text-xl active:bg-sky-700 touch-none"
          aria-label="Steer Right"
        >
          ▶
        </button>
      </div>

      {/* Center Action Buttons */}
      <div className="pointer-events-auto flex gap-2 pb-1">
        <button
          type="button"
          onClick={onDoor}
          className={`px-3.5 py-2.5 rounded-lg border text-xs font-bold tracking-wide touch-none ${
            doorOpen
              ? 'bg-emerald-600 border-emerald-400 text-white'
              : 'bg-stone-900/90 border-stone-600 text-stone-100'
          }`}
        >
          DOOR (E)
        </button>
        <button
          type="button"
          onClick={onHorn}
          className="px-3.5 py-2.5 rounded-lg bg-amber-600/95 border border-amber-400 text-stone-950 text-xs font-bold tracking-wide touch-none"
        >
          HORN (H)
        </button>
        <button
          type="button"
          onClick={onCamera}
          className="px-3 py-2.5 rounded-lg bg-stone-900/90 border border-stone-600 text-stone-100 text-xs font-bold tracking-wide touch-none"
        >
          CAM (C)
        </button>
      </div>

      {/* Brake / Gas Pedals */}
      <div className="pointer-events-auto flex gap-2.5">
        <button
          type="button"
          {...bindHold('brake')}
          className="w-16 h-16 rounded-lg bg-rose-950/90 border border-rose-500/80 text-rose-100 font-bold text-xs active:bg-rose-700 touch-none"
        >
          BRAKE
          <br />
          REV
        </button>
        <button
          type="button"
          {...bindHold('throttle')}
          className="w-16 h-16 rounded-lg bg-sky-900/90 border border-sky-400/80 text-sky-50 font-bold text-xs active:bg-sky-600 touch-none"
        >
          GAS
        </button>
      </div>
    </div>
  );
}
