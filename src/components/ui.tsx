import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CardDefinition } from '../data/cardsData';

export type Tone = 'navy' | 'cyan' | 'crimson' | 'emerald' | 'amber' | 'slate';

const toneBadge: Record<Tone, string> = {
  navy: 'bg-navy/10 text-navy border-navy/15',
  cyan: 'bg-[#00B9F1]/10 text-[#0089B3] border-[#00B9F1]/25',
  crimson: 'bg-[#EC184A]/10 text-[#C8103C] border-[#EC184A]/25',
  emerald: 'bg-[#16A34A]/10 text-[#15803D] border-[#16A34A]/25',
  amber: 'bg-[#D97706]/10 text-[#B45309] border-[#D97706]/25',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const toneBar: Record<Tone, string> = {
  navy: 'bg-[#002E6E]',
  cyan: 'bg-[#00B9F1]',
  crimson: 'bg-[#EC184A]',
  emerald: 'bg-[#16A34A]',
  amber: 'bg-[#D97706]',
  slate: 'bg-slate-400',
};

export const toneText: Record<Tone, string> = {
  navy: 'text-[#002E6E]',
  cyan: 'text-[#0089B3]',
  crimson: 'text-[#EC184A]',
  emerald: 'text-[#16A34A]',
  amber: 'text-[#D97706]',
  slate: 'text-slate-500',
};

export function Badge({ tone = 'slate', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-4 ${toneBadge[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[#E2E8F0] bg-white ${className}`}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <h3 className="text-[13px] font-bold tracking-tight text-[#002E6E]">{children}</h3>
      {right}
    </div>
  );
}

export interface MeterSegment {
  value: number;
  tone: Tone;
  striped?: boolean;
}

/** Multi-segment progress bar. Segments are stacked left → right against `max`. */
export function Meter({ segments, max, height = 'h-2', marker }: { segments: MeterSegment[]; max: number; height?: string; marker?: number }) {
  return (
    <div className={`relative w-full overflow-hidden rounded-full bg-slate-100 ${height}`}>
      <div className="flex h-full w-full">
        {segments.map((s, i) => (
          <div
            key={i}
            className={`h-full transition-all duration-700 ease-out ${toneBar[s.tone]}`}
            style={{
              width: `${Math.max(0, Math.min(100, (s.value / max) * 100))}%`,
              backgroundImage: s.striped
                ? 'repeating-linear-gradient(45deg, rgba(255,255,255,.35) 0 6px, transparent 6px 12px)'
                : undefined,
            }}
          />
        ))}
      </div>
      {marker !== undefined && (
        <div className="absolute top-0 h-full w-0.5 bg-[#002E6E]" style={{ left: `${Math.min(100, (marker / max) * 100)}%` }} />
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B9F1] ${
        checked ? 'bg-[#16A34A]' : 'bg-slate-300'
      }`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

/** Bottom-sheet modal rendered inside the phone frame (parent must be `relative`). */
export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const sheet = (
    <div className="absolute inset-0 z-40 flex items-end bg-[#001F4D]/50 backdrop-blur-[2px] animate-fade" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full rounded-t-[28px] bg-white px-5 pb-7 pt-3 shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-[#002E6E]">{title}</h3>
            <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
  // Portal to the phone-level layer so sheets cover the whole device regardless of where they are declared.
  const target = typeof document !== 'undefined' ? document.getElementById(PHONE_PORTAL_ID) : null;
  return target ? createPortal(sheet, target) : sheet;
}

export const PHONE_PORTAL_ID = 'phone-portal';

export function PaytmLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`select-none font-extrabold tracking-tight ${className}`} aria-label="Paytm">
      <span className="text-[#002E6E]">pay</span>
      <span className="text-[#00B9F1]">tm</span>
    </span>
  );
}

export function CardArt({ card, compact = false }: { card: CardDefinition; compact?: boolean }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg bg-gradient-to-br ${card.art} text-white shadow-sm ${
        compact ? 'h-9 w-14' : 'h-[120px] w-full rounded-2xl p-4'
      }`}
    >
      <div className="absolute -right-4 -top-6 h-16 w-16 rounded-full bg-white/10" />
      {compact ? (
        <span className="absolute bottom-1 right-1.5 text-[8px] font-bold opacity-90">{card.last4}</span>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold opacity-90">{card.bank}</span>
            <span className="text-[10px] font-bold italic opacity-90">{card.network}</span>
          </div>
          <div className="mt-3 h-6 w-8 rounded bg-gradient-to-br from-yellow-200 to-yellow-500 opacity-90" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <span className="text-[12px] font-semibold">{card.shortName}</span>
            <span className="tabular text-[12px] tracking-widest">•••• {card.last4}</span>
          </div>
        </>
      )}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  tone = 'cyan',
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'cyan' | 'navy' | 'emerald' | 'amber' | 'crimson';
  className?: string;
  type?: 'button' | 'submit';
}) {
  const tones = {
    cyan: 'bg-[#00B9F1] hover:bg-[#00A5D8] text-white',
    navy: 'bg-[#002E6E] hover:bg-[#0A3D80] text-white',
    emerald: 'bg-[#16A34A] hover:bg-[#15803D] text-white',
    amber: 'bg-[#D97706] hover:bg-[#B45309] text-white',
    crimson: 'bg-[#EC184A] hover:bg-[#C8103C] text-white',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}
