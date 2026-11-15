import {
  ArrowRightLeft,
  Bell,
  BookOpen,
  Building2,
  Bus,
  ChevronRight,
  Clapperboard,
  Inbox,
  Laptop,
  LayoutGrid,
  Lightbulb,
  Menu,
  PlayCircle,
  Plus,
  QrCode,
  ScanLine,
  Search,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  SmartphoneNfc,
  Sparkles,
  Store,
  Train,
  TrendingUp,
  Tv,
  Zap,
  Home as HomeIcon,
  type LucideIcon,
} from 'lucide-react';
import { TourBar, useTourTarget } from '../components/Tour';
import { PaytmLogo } from '../components/ui';
import { useApp } from '../state/appState';

const DEMO_TOAST = 'Demo: not part of this prototype';

const QUICK: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'Pay', icon: ScanLine },
  { label: 'UPI Money Transfer', icon: ArrowRightLeft },
  { label: 'Passbook', icon: BookOpen },
  { label: 'Add Money', icon: Plus },
];

const SERVICES: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'Mobile Prepaid', icon: Smartphone },
  { label: 'Mobile Postpaid', icon: SmartphoneNfc },
  { label: 'Laptops', icon: Laptop },
  { label: 'Electricity', icon: Lightbulb },
  { label: 'Movie Tickets', icon: Clapperboard },
  { label: 'Train Tickets', icon: Train },
  { label: 'Bus', icon: Bus },
  { label: 'Mobiles', icon: Smartphone },
  { label: 'Grocery', icon: ShoppingBasket },
  { label: 'Electronics', icon: Tv },
  { label: 'Shopping', icon: ShoppingBag },
  { label: 'More', icon: LayoutGrid },
];

const NAV: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'Home', icon: HomeIcon },
  { label: 'Mall', icon: Store },
  { label: 'Scan', icon: QrCode },
  { label: 'Bank', icon: Building2 },
  { label: 'Inbox', icon: Inbox },
];

/**
 * Recreated Paytm home screen. Every tile except CardSense AI is non-functional and shows a demo toast.
 * `compact`: running full-bleed on a real phone (no fake status bar above).
 */
export function PaytmHomeScreen({ compact }: { compact: boolean }) {
  const { state, dispatch } = useApp();
  const demo = () => dispatch({ type: 'TOAST', message: DEMO_TOAST });

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#F4F7FA]">
      <main className="thin-scrollbar flex-1 overflow-y-auto overflow-x-hidden">
        {/* Blue header */}
        <div className="bg-gradient-to-b from-[#00B9F1] via-[#0091E0] to-[#0A5BC4] px-3 pb-5 pt-2 text-white">
          <div className="flex items-center gap-2">
            <button onClick={demo} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10" aria-label="Menu">
              <Menu size={21} />
            </button>
            <button onClick={demo} className="flex h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-full bg-white px-3 shadow-sm" aria-label="Search Paytm">
              <PaytmLogo className="text-[18px]" />
              <Search size={16} className="shrink-0 text-slate-400" />
            </button>
            <button onClick={demo} className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10" aria-label="Notifications">
              <Bell size={20} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#EC184A] ring-2 ring-[#00A7EA]" />
            </button>
            <button onClick={demo} className="shrink-0 whitespace-nowrap rounded-full bg-[#FFD84D] px-2.5 py-1 text-[11px] font-extrabold text-[#002E6E] shadow-sm">
              Cashback
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-1">
            {QUICK.map(({ label, icon: Icon }) => (
              <button key={label} onClick={demo} className="flex flex-col items-center gap-1.5 rounded-xl px-0.5 py-1 hover:bg-white/10">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#002E6E] shadow-sm">
                  <Icon size={21} strokeWidth={2.2} />
                </span>
                <span className="text-center text-[10.5px] font-semibold leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="-mt-3 space-y-3 px-3 pb-24">
          {/* Paytm Money strip */}
          <button onClick={demo} className="flex w-full items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 text-left shadow-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#16A34A]/10 text-[#16A34A]">
              <TrendingUp size={16} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#002E6E]">
              <b>Paytm Money</b> – Start an SIP at Rs.100
            </span>
            <ChevronRight size={16} className="shrink-0 text-slate-400" />
          </button>

          {/* Service grid */}
          <section className="rounded-2xl bg-white px-2 pb-3 pt-3 shadow-sm">
            <h2 className="mb-2 px-1.5 text-[13px] font-bold text-[#002E6E]">Recharge, Bills &amp; More</h2>
            <div className="grid grid-cols-4 gap-y-3">
              <CardSenseTile onOpen={() => dispatch({ type: 'OPEN_CARDSENSE' })} coach={state.tour === 0 || state.tour === null} />
              {SERVICES.map(({ label, icon: Icon }) => (
                <button key={label} onClick={demo} className="flex flex-col items-center gap-1 rounded-xl px-0.5 py-1 hover:bg-slate-50">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00B9F1]/10 text-[#0077C8]">
                    <Icon size={20} />
                  </span>
                  <span className="text-center text-[10px] font-semibold leading-tight text-[#002E6E]">{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Promo banner */}
          <button onClick={demo} className="flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#002E6E] to-[#0A5BC4] p-3.5 text-left text-white shadow-sm">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFD84D] text-[#002E6E]">
              <Zap size={22} />
            </span>
            <span className="text-[12.5px] font-bold leading-snug">
              Get up to <span className="text-[#FFD84D]">₹25 cashback</span> on your 1st Electricity Bill payment
            </span>
          </button>
        </div>
      </main>

      {state.tour === null && (
        <button
          onClick={() => dispatch({ type: 'TOUR_START' })}
          className="absolute bottom-[76px] right-3 z-20 flex items-center gap-1 rounded-full bg-[#002E6E] px-3 py-1.5 text-[11px] font-bold text-white shadow-lg hover:bg-[#0A3D80]"
          aria-label="Start guided tour"
        >
          <PlayCircle size={14} /> Guided tour
        </button>
      )}

      <TourBar />
      <HomeNav compact={compact} onTap={demo} />
    </div>
  );
}

function CardSenseTile({ onOpen, coach }: { onOpen: () => void; coach: boolean }) {
  const tour = useTourTarget<HTMLDivElement>('tile');
  return (
    <div ref={tour.ref} className={`relative flex justify-center ${tour.className}`}>
      <button onClick={onOpen} className="flex flex-col items-center gap-1 rounded-xl px-0.5 py-1" aria-label="Open CardSense AI: optimise your credit cards">
        <span className="relative flex h-11 w-11 items-center justify-center">
          {/* Expanding ring ripple behind the icon */}
          <span className="absolute inset-0 rounded-2xl border-2 border-[#00B9F1] opacity-0 motion-safe:animate-tileRipple" aria-hidden />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00B9F1] to-[#002E6E] text-white shadow-[0_0_0_0_rgba(0,185,241,0.6)] motion-safe:animate-tileBeat">
            <Sparkles size={20} />
          </span>
          <span className="absolute -right-2.5 -top-1.5 rounded-full bg-[#EC184A] px-1 py-px text-[8px] font-extrabold uppercase tracking-wide text-white ring-2 ring-white">New</span>
        </span>
        <span className="text-center text-[10px] font-extrabold leading-tight text-[#002E6E]">CardSense AI</span>
      </button>
      {coach && (
        <div className="pointer-events-none absolute left-0 top-full z-10 mt-1 w-[150px] rounded-xl bg-[#002E6E] px-2.5 py-1.5 text-[10.5px] font-semibold leading-snug text-white shadow-lg animate-fadeIn">
          <span className="absolute -top-1 left-7 h-2.5 w-2.5 rotate-45 bg-[#002E6E]" aria-hidden />
          Tap to optimise your credit cards
        </div>
      )}
    </div>
  );
}

function HomeNav({ compact, onTap }: { compact: boolean; onTap: () => void }) {
  return (
    <nav
      className={`relative flex shrink-0 items-end justify-around border-t border-[#E2E8F0] bg-white px-2 pt-1.5 ${compact ? 'pb-[max(env(safe-area-inset-bottom),6px)]' : 'pb-5'}`}
      aria-label="Paytm"
    >
      {NAV.map(({ label, icon: Icon }) => {
        const scan = label === 'Scan';
        const active = label === 'Home';
        return (
          <button
            key={label}
            onClick={onTap}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-semibold ${active ? 'text-[#00B9F1]' : 'text-slate-500'}`}
          >
            {scan ? (
              <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#00B9F1] to-[#0A5BC4] text-white shadow-lg ring-4 ring-white">
                <Icon size={22} />
              </span>
            ) : (
              <span className="flex h-7 items-center">
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              </span>
            )}
            {label}
          </button>
        );
      })}
      {!compact && <div className="absolute bottom-1.5 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-[#002E6E]/80" aria-hidden />}
    </nav>
  );
}
