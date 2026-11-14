import { Gauge, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { InspectorPanel } from './components/InspectorPanel';
import { PhoneFrame } from './components/PhoneFrame';
import { useMediaQuery } from './lib/motion';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { ConciergeScreen } from './screens/ConciergeScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { PrivacyScreen } from './screens/PrivacyScreen';
import { useApp } from './state/appState';

function ActiveScreen() {
  const { state } = useApp();
  return (
    <>
      {state.tab === 'overview' && <OverviewScreen />}
      {state.tab === 'checkout' && <CheckoutScreen />}
      {state.tab === 'concierge' && <ConciergeScreen />}
      {state.tab === 'privacy' && <PrivacyScreen />}
    </>
  );
}

function Title() {
  return (
    <div className="w-full px-1 text-left">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00B9F1]">Interactive prototype</p>
      <h1 className="text-[22px] font-extrabold tracking-tight text-[#002E6E]">Paytm CardSense AI</h1>
      <p className="text-[12.5px] text-slate-500">Spend analyzer • Benefit optimizer • Pre-swipe checkout router</p>
    </div>
  );
}

export default function App() {
  // Below 500px the visitor is on a real phone: drop the device frame and move the evaluator panel into a sheet.
  const compact = useMediaQuery('(max-width: 499px)');
  return compact ? <CompactLayout /> : <FramedLayout />;
}

function FramedLayout() {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-6 px-4 py-6 lg:flex-row lg:items-start lg:justify-center lg:gap-10">
        <div className="flex w-full max-w-[420px] flex-col items-center gap-4">
          <div className="w-full lg:hidden">
            <Title />
          </div>
          <PhoneFrame>
            <ActiveScreen />
          </PhoneFrame>
        </div>
        <div className="flex w-full max-w-[420px] flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-48px)] lg:w-[380px] lg:max-w-none">
          <div className="hidden lg:block">
            <Title />
          </div>
          <div className="thin-scrollbar min-h-0 lg:overflow-y-auto lg:rounded-3xl">
            <InspectorPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactLayout() {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="bg-[#F4F7FA]">
      <PhoneFrame
        compact
        overlay={
          state.tour === null && (
          <button
            onClick={() => setOpen(true)}
            className="absolute bottom-[68px] right-3 z-30 flex items-center gap-1 rounded-full bg-[#002E6E] px-2.5 py-1.5 text-[10.5px] font-bold text-white shadow-lg"
            aria-label="Open PM Evaluator Inspector"
          >
            <Gauge size={13} /> PM Inspector
          </button>
          )
        }
      >
        <ActiveScreen />
      </PhoneFrame>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end bg-[#001F4D]/50 animate-fade" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="PM Evaluator Inspector Panel"
            className="thin-scrollbar max-h-[85dvh] w-full overflow-y-auto rounded-t-[28px] bg-[#F1F5F9] p-3 pb-[max(env(safe-area-inset-bottom),12px)] animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="mx-auto h-1 w-10 rounded-full bg-slate-300" />
            </div>
            <div className="relative">
              <button
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 z-10 rounded-full bg-white/15 p-1.5 text-white hover:bg-white/25"
                aria-label="Close inspector"
              >
                <X size={16} />
              </button>
              <InspectorPanel alwaysOpen />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
