import { BatteryFull, Bot, CreditCard, LayoutGrid, PlayCircle, RotateCcw, ShieldCheck, Signal, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp, type TabId } from '../state/appState';
import { TourBar } from './Tour';
import { PHONE_PORTAL_ID, PaytmLogo } from './ui';

const TABS: Array<{ id: TabId; label: string; icon: typeof LayoutGrid }> = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'checkout', label: 'Smart Checkout', icon: CreditCard },
  { id: 'concierge', label: 'AI Concierge', icon: Bot },
  { id: 'privacy', label: 'Data & Privacy', icon: ShieldCheck },
];

function StatusBar() {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between bg-white px-7 pt-1 text-[12px] font-semibold text-[#002E6E]">
      <span className="tabular">9:41</span>
      <div className="absolute left-1/2 top-2.5 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-black" aria-hidden />
      <div className="flex items-center gap-1.5">
        <Signal size={14} strokeWidth={2.5} />
        <span className="text-[10px] font-bold">5G</span>
        <Wifi size={14} strokeWidth={2.5} />
        <BatteryFull size={18} strokeWidth={2} />
      </div>
    </div>
  );
}

function AppHeader() {
  const { state, dispatch } = useApp();
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E2E8F0] bg-white px-4 pb-2.5 pt-1">
      <div className="flex items-center gap-2">
        <PaytmLogo className="text-[19px] min-[400px]:text-[22px]" />
        <span className="shrink-0 whitespace-nowrap rounded-md bg-gradient-to-r from-[#002E6E] to-[#00B9F1] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          CardSense AI
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div
          role="img"
          aria-label="Zero Gmail Access, DPDP Compliant"
          className="flex items-center gap-1 rounded-full border border-[#16A34A]/25 bg-[#16A34A]/10 px-2 py-1 text-[9px] font-semibold leading-tight text-[#15803D]"
          title="Zero Gmail Access • DPDP Compliant"
        >
          <ShieldCheck size={13} className="shrink-0" />
          <span className="hidden min-[380px]:inline" aria-hidden>
            Zero Gmail
            <br />
            DPDP ✓
          </span>
        </div>
        <button
          onClick={() => dispatch({ type: state.tour === null ? 'TOUR_START' : 'TOUR_END' })}
          className={`flex h-8 items-center gap-1 rounded-full px-2 text-[10px] font-bold transition ${
            state.tour === null ? 'bg-[#00B9F1] text-white hover:bg-[#00A5D8]' : 'bg-[#00B9F1]/10 text-[#0089B3]'
          }`}
          aria-label={state.tour === null ? 'Start guided tour' : 'Exit guided tour'}
        >
          <PlayCircle size={14} /> <span className="hidden min-[400px]:inline">{state.tour === null ? 'Tour' : 'Exit'}</span>
        </button>
        <button
          onClick={() => dispatch({ type: 'RESET' })}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] text-slate-500 transition hover:border-[#00B9F1] hover:text-[#002E6E]"
          aria-label="Reset demo state"
          title="Reset demo state"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </header>
  );
}

function BottomNav({ compact }: { compact: boolean }) {
  const { state, dispatch } = useApp();
  return (
    <nav
      className={`relative flex shrink-0 items-stretch justify-around border-t border-[#E2E8F0] bg-white px-2 pt-1.5 ${compact ? 'pb-[max(env(safe-area-inset-bottom),6px)]' : 'pb-5'}`}
      aria-label="Primary"
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = state.tab === id;
        return (
          <button
            key={id}
            onClick={() => dispatch({ type: 'SET_TAB', tab: id })}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold transition ${
              active ? 'text-[#00B9F1]' : 'text-slate-400 hover:text-[#002E6E]'
            }`}
          >
            <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${active ? 'bg-[#00B9F1]/10' : ''}`}>
              <Icon size={19} strokeWidth={active ? 2.5 : 2} />
            </span>
            {label}
          </button>
        );
      })}
      {!compact && <div className="absolute bottom-1.5 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-[#002E6E]/80" aria-hidden />}
    </nav>
  );
}

/**
 * `compact` (viewport < 500px): the real phone is the device, so the bezel, fake status bar and
 * notch are dropped and the app fills the screen. Otherwise the frame is sized to the viewport height.
 */
export function PhoneFrame({ children, overlay, compact = false }: { children: ReactNode; overlay?: ReactNode; compact?: boolean }) {
  if (compact) {
    return (
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#F4F7FA]">
        <div className="h-[env(safe-area-inset-top)] shrink-0 bg-white" />
        <AppHeader />
        <Screen>{children}</Screen>
        <TourBar />
        <BottomNav compact />
        <div id={PHONE_PORTAL_ID} />
        {overlay}
        <Toast />
      </div>
    );
  }
  return (
    <div className="w-full max-w-[420px] shrink-0 rounded-[44px] bg-[#0B1220] p-[10px] shadow-[0_30px_80px_-20px_rgba(0,46,110,0.45)]">
      <div className="relative flex h-[clamp(620px,calc(100dvh-48px),840px)] flex-col overflow-hidden rounded-[36px] bg-[#F4F7FA]">
        <StatusBar />
        <AppHeader />
        <Screen>{children}</Screen>
        <TourBar />
        <BottomNav compact={false} />
        {/* Unpositioned on purpose: portalled sheets resolve `absolute inset-0` against the phone screen. */}
        <div id={PHONE_PORTAL_ID} />
        {overlay}
        <Toast />
      </div>
    </div>
  );
}

function Screen({ children }: { children: ReactNode }) {
  const { state } = useApp();
  return (
    <main key={state.tab} className="thin-scrollbar flex-1 overflow-y-auto overflow-x-hidden animate-fade">
      {children}
    </main>
  );
}

function Toast() {
  const { state } = useApp();
  if (!state.toast) return null;
  return (
    <div role="status" className="pointer-events-none absolute inset-x-4 top-24 z-50 animate-slideUp rounded-xl bg-[#002E6E] px-4 py-3 text-center text-[12px] font-semibold text-white shadow-xl">
      {state.toast}
    </div>
  );
}
