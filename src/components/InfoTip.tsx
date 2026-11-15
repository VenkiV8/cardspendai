import { Info } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useMediaQuery } from '../lib/motion';
import { Sheet } from './ui';

/**
 * Small circular "i" button that reveals long-form detail.
 * Mouse / trackpad: opens on hover or keyboard focus as a popover; click pins it.
 * Touch: opens on tap as a bottom sheet inside the phone frame.
 * Closes on outside tap or Esc in both modes.
 */
export function InfoTip({ label, title, children, tone = 'light' }: { label: string; title: string; children: ReactNode; tone?: 'light' | 'dark' }) {
  const hover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const id = useId();

  const close = () => {
    setOpen(false);
    setPinned(false);
  };

  useEffect(() => {
    if (!open || !hover) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) close();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, hover]);

  const btnTone =
    tone === 'dark'
      ? 'border-white/30 text-white/80 hover:bg-white/10'
      : 'border-slate-300 bg-white text-slate-500 hover:border-[#00B9F1] hover:text-[#002E6E]';
  const button = (extra: Record<string, unknown>) => (
    <button
      type="button"
      aria-label={label}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B9F1] ${btnTone}`}
      {...extra}
    >
      <Info size={13} strokeWidth={2.4} />
    </button>
  );

  if (!hover) {
    return (
      <>
        {button({ onClick: () => setOpen(true), 'aria-haspopup': 'dialog' })}
        <Sheet open={open} onClose={close} title={title}>
          <div className="thin-scrollbar max-h-[55vh] overflow-y-auto text-[12px] leading-relaxed text-slate-600">{children}</div>
        </Sheet>
      </>
    );
  }

  return (
    <div ref={wrap} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => !pinned && setOpen(false)}>
      {button({
        onFocus: () => setOpen(true),
        onBlur: () => !pinned && setOpen(false),
        onClick: () => {
          setPinned((p) => !p);
          setOpen(true);
        },
        'aria-expanded': open,
        'aria-describedby': open ? id : undefined,
      })}
      {open && (
        // pt (not mt) keeps the pointer inside the wrapper while moving from the button to the popover.
        <div className="absolute right-0 top-full z-30 w-[272px] max-w-[calc(100vw-48px)] pt-1.5">
          <div
            id={id}
            role="tooltip"
            className="rounded-2xl border border-[#E2E8F0] bg-white p-3 text-left text-[11.5px] leading-relaxed text-slate-600 shadow-[0_16px_40px_-12px_rgba(0,46,110,0.35)] animate-fadeIn"
          >
            <p className="mb-1.5 text-[12px] font-bold text-[#002E6E]">{title}</p>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
