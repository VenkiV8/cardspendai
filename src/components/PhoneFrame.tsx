import { ArrowLeft, BatteryFull, CreditCard, LayoutGrid, PlayCircle, RotateCcw, ShieldCheck, Signal, Ticket, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import { CardDetailScreen } from '../screens/CardDetailScreen';
import { PaytmHomeScreen } from '../screens/PaytmHomeScreen';
import { useApp, type TabId } from '../state/appState';
import { TourBar } from './Tour';
import { PHONE_PORTAL_ID, PaytmLogo } from './ui';

const TABS: Array<{ id: TabId; label: string; icon: typeof LayoutGrid }> = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'checkout', label: 'Smart Checkout', icon: CreditCard },
  { id: 'vault', label: 'Voucher Vault', icon: Ticket },
  { id: 'privacy', label: 'Data & Privacy', icon: ShieldCheck },
];

function StatusBar({ onBlue }: { onBlue: boolean }) {
  return (
    <div className={`flex h-11 shrink-0 items-center justify-between px-7 pt-1 text-[12px] font-semibold ${onBlue ? 'bg-[#00B9F1] text-white' : 'bg-white text-[#002E6E]'}`}>
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
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E2E8F0] bg-white py-2 pl-1.5 pr-3">
      <div className="flex min-w-0 items-center gap-1">
        <button
          onClick={() => dispatch({ type: 'GO_HOME' })}
          className="flex h-9 shrink-0 items-center gap-0.5 rounded-full pl-1.5 pr-2 text-[#002E6E] hover:bg-slate-100"
          aria-label="Back to Paytm home"
        >
          <ArrowLeft size={18} />
          <PaytmLogo className="text-[15px]" />
        </button>
        <span className="shrink-0 whitespace-nowrap rounded-md bg-gradient-to-r from-[#002E6E] to-[#00B9F1] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          CardSense AI
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={() => dispatch({ type: state.tour === null ? 'TOUR_START' : 'TOUR_END' })}
          className={`flex h-8 items-center gap-1 rounded-full px-2 text-[10px] font-bold transition ${
            state.tour === null ? 'bg-[#00B9F1] text-white hover:bg-[#00A5D8]' : 'bg-[#00B9F1]/10 text-[#0089B3]'
          }`}
          aria-label={state.tour === null ? 'Start guided tour' : 'Exit guided tour'}
        >
          <PlayCircle size={14} /> <span className="hidden min-[380px]:inline">{state.tour === null ? 'Tour' : 'Exit'}</span>
        </button>
        <button
          onClick={() => dispatch({ type: 'RESET' })}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] text-slate-500 transition hover:border-[#00B9F1] hover:text-[#002E6E]"
          aria-label="Reset demo and return to Paytm home"
          title="Reset demo"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </header>
  );
}

function BottomNav({ compact }: { compact: boolean }) {
  const { state, dispatch } = useApp();
  const expiring = state.vouchers.filter((v) => v.expiresInDays <= 7);
  const urgent = expiring.some((v) => v.expiresInDays <= 4);
  return (
    <nav
      className={`relative flex shrink-0 items-stretch justify-around border-t border-[#E2E8F0] bg-white px-2 pt-1.5 ${compact ? 'pb-[max(env(safe-area-inset-bottom),6px)]' : 'pb-5'}`}
      aria-label="CardSense"
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
            <span className={`relative flex h-7 w-12 items-center justify-center rounded-full transition ${active ? 'bg-[#00B9F1]/10' : ''}`}>
              <Icon size={19} strokeWidth={active ? 2.5 : 2} />
              {id === 'vault' && expiring.length > 0 && (
                <span
                  className={`absolute -top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ring-2 ring-white ${urgent ? 'bg-[#EC184A]' : 'bg-[#D97706]'}`}
                  aria-label={`${expiring.length} vouchers expiring within 7 days`}
                >
                  {expiring.length}
                </span>
              )}
            </span>
            {label}
          </button>
        );
      })}
      {!compact && <div className="absolute bottom-1.5 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-[#002E6E]/80" aria-hidden />}
    </nav>
  );
}

/** The CardSense app: header, active tab (or a pushed Card Detail page), tour bar and tab bar. */
function CardSenseApp({ children, compact }: { children: ReactNode; compact: boolean }) {
  const { state } = useApp();
  return (
    <div className="flex min-h-0 flex-1 flex-col animate-slideIn">
      {state.cardDetail ? (
        <main key={`card-${state.cardDetail}`} className="thin-scrollbar flex-1 overflow-y-auto overflow-x-hidden animate-slideIn">
          <CardDetailScreen id={state.cardDetail} />
        </main>
      ) : (
        <>
          <AppHeader />
          <main key={state.tab} className="thin-scrollbar flex-1 overflow-y-auto overflow-x-hidden animate-fade">
            {children}
          </main>
        </>
      )}
      <TourBar />
      {!state.cardDetail && <BottomNav compact={compact} />}
    </div>
  );
}

/**
 * `compact` (viewport < 500px): the real phone is the device, so the bezel, fake status bar and
 * notch are dropped and the app fills the screen. Otherwise the frame is sized to the viewport height.
 */
export function PhoneFrame({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const { state } = useApp();
  const home = state.surface === 'home';
  const surface = home ? (
    <div key="home" className="flex min-h-0 flex-1 flex-col animate-fade">
      <PaytmHomeScreen compact={compact} />
    </div>
  ) : (
    <CardSenseApp key="cardsense" compact={compact}>
      {children}
    </CardSenseApp>
  );

  if (compact) {
    return (
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#F4F7FA]">
        <div className={`h-[env(safe-area-inset-top)] shrink-0 ${home ? 'bg-[#00B9F1]' : 'bg-white'}`} />
        {surface}
        <div id={PHONE_PORTAL_ID} />
        <Toast />
      </div>
    );
  }
  return (
    <div className="w-full max-w-[420px] shrink-0 rounded-[44px] bg-[#0B1220] p-[10px] shadow-[0_30px_80px_-20px_rgba(0,46,110,0.45)]">
      <div className="relative flex h-[clamp(600px,calc(100dvh-148px),840px)] flex-col overflow-hidden rounded-[36px] bg-[#F4F7FA]">
        <StatusBar onBlue={home} />
        {surface}
        {/* Unpositioned on purpose: portalled sheets resolve `absolute inset-0` against the phone screen. */}
        <div id={PHONE_PORTAL_ID} />
        <Toast />
      </div>
    </div>
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
