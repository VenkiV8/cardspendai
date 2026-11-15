import { CheckCircle2, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { TOUR_STEPS, type TourTargetId } from '../lib/tour';
import { useApp } from '../state/appState';
import { prefersReducedMotion } from '../lib/motion';

/** Marker class on the element the current tour step is describing (used to place the tour card). */
const ACTIVE_MARKER = 'tour-active';

/** Highlights one element at a time while the guided tour is on the matching step. */
export function useTourTarget<T extends HTMLElement = HTMLDivElement>(id: TourTargetId) {
  const { state } = useApp();
  const ref = useRef<T>(null);
  const step = state.tour === null ? null : TOUR_STEPS[state.tour];
  const active = step?.target === id && !step.done?.(state);

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => {
      ref.current?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }, 120);
    return () => window.clearTimeout(t);
  }, [active]);

  return {
    ref,
    active,
    className: active ? `${ACTIVE_MARKER} relative z-[1] rounded-2xl ring-[3px] ring-[#00B9F1] ring-offset-2 ring-offset-[#F4F7FA] motion-safe:animate-tourPulse` : '',
  };
}

export type TourDock = 'top' | 'bottom';

/**
 * Decides where the tour card docks so it never covers the highlighted element:
 * element in the lower half of the screen → card at the top, otherwise at the bottom.
 * The card is docked in the layout (not floating), so the content area shrinks rather than being covered.
 * Measured once per step, after the target has scrolled into view, so the card doesn't jump around.
 */
export function useTourDock(screenRef: RefObject<HTMLElement>): TourDock {
  const { state } = useApp();
  const [dock, setDock] = useState<TourDock>('bottom');
  const key = `${state.tour}|${state.surface}|${state.tab}|${state.cardDetail}`;

  useEffect(() => {
    if (state.tour === null) return;
    const measure = () => {
      const screen = screenRef.current;
      const el = screen?.querySelector(`.${ACTIVE_MARKER}`);
      if (!screen || !el) return;
      const s = screen.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setDock(r.top + r.height / 2 > s.top + s.height / 2 ? 'top' : 'bottom');
    };
    const t = window.setTimeout(measure, prefersReducedMotion() ? 200 : 650);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-measure only when the step or screen changes
  }, [key]);

  return dock;
}

export function TourBar({ dock }: { dock: TourDock }) {
  const { state, dispatch } = useApp();
  if (state.tour === null) return null;
  const i = state.tour;
  const step = TOUR_STEPS[i];
  const done = step.done ? step.done(state) : true;
  const last = i === TOUR_STEPS.length - 1;

  const next = () => {
    if (last) return dispatch({ type: 'TOUR_END' });
    // Steps that ask the user to act do it for them when they press Next instead.
    if (!done && step.act) step.act(state).forEach(dispatch);
    dispatch({ type: 'TOUR_GO', step: i + 1 });
  };

  return (
    <div
      className={`shrink-0 bg-[#002E6E] px-4 py-2.5 text-white animate-fade ${dock === 'top' ? 'border-b' : 'border-t'} border-[#00B9F1]/30`}
      role="region"
      aria-label="Guided tour"
      aria-live="polite"
      data-dock={dock}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7FDBFF]">
          Tour • Step {i + 1} of {TOUR_STEPS.length}
        </p>
        <div className="flex items-center gap-1" aria-hidden>
          {TOUR_STEPS.map((_, n) => (
            <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-4 bg-[#00B9F1]' : n < i ? 'w-1.5 bg-[#00B9F1]/70' : 'w-1.5 bg-white/25'}`} />
          ))}
        </div>
        <button onClick={() => dispatch({ type: 'TOUR_END' })} className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Exit tour">
          <X size={14} />
        </button>
      </div>
      <p className="mt-1 text-[12.5px] font-bold leading-snug">{step.title}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-white/75">
        {done && step.doneText ? (
          <span className="inline-flex items-start gap-1 text-[#86EFAC]">
            <CheckCircle2 size={12} className="mt-[1px] shrink-0" /> {step.doneText}
          </span>
        ) : (
          step.body
        )}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          onClick={() => dispatch({ type: 'TOUR_GO', step: i - 1 })}
          disabled={i === 0}
          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-white/70 hover:text-white disabled:invisible"
        >
          Back
        </button>
        <button onClick={next} className="inline-flex items-center gap-1 rounded-lg bg-[#00B9F1] px-3 py-1.5 text-[11.5px] font-bold text-white transition hover:bg-[#00A5D8]">
          {last ? 'Finish' : 'Next'} <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
