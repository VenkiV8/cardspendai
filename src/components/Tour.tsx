import { CheckCircle2, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { TOUR_STEPS, type TourTargetId } from '../lib/tour';
import { useApp } from '../state/appState';
import { prefersReducedMotion } from '../lib/motion';

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
    className: active ? 'relative z-[1] rounded-2xl ring-[3px] ring-[#00B9F1] ring-offset-2 ring-offset-[#F4F7FA] motion-safe:animate-tourPulse' : '',
  };
}

/** Docked above the bottom nav (inside the phone) so it never covers content. */
export function TourBar() {
  const { state, dispatch } = useApp();
  if (state.tour === null) return null;
  const i = state.tour;
  const step = TOUR_STEPS[i];
  const done = step.done ? step.done(state) : true;
  const last = i === TOUR_STEPS.length - 1;

  return (
    <div className="shrink-0 border-t border-[#00B9F1]/30 bg-[#002E6E] px-4 py-2.5 text-white animate-fade" role="region" aria-label="Guided tour" aria-live="polite">
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
        <button
          onClick={() => (last ? dispatch({ type: 'TOUR_END' }) : dispatch({ type: 'TOUR_GO', step: i + 1 }))}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition ${
            done ? 'bg-[#00B9F1] text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'
          }`}
        >
          {last ? 'Finish tour' : done ? 'Next' : 'Skip step'} <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
