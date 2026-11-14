import { InspectorPanel } from './components/InspectorPanel';
import { PhoneFrame } from './components/PhoneFrame';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { ConciergeScreen } from './screens/ConciergeScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { PrivacyScreen } from './screens/PrivacyScreen';
import { useApp } from './state/appState';

export default function App() {
  const { state } = useApp();
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-6 px-4 py-6 lg:flex-row lg:items-start lg:justify-center lg:gap-10 lg:py-10">
        <div className="flex w-full max-w-[420px] flex-col items-center">
          <div className="mb-4 w-full px-1 text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00B9F1]">Interactive prototype</p>
            <h1 className="text-[22px] font-extrabold tracking-tight text-[#002E6E]">Paytm CardSense AI</h1>
            <p className="text-[12.5px] text-slate-500">Spend analyzer • Benefit optimizer • Pre-swipe checkout router</p>
          </div>
          <PhoneFrame>
            {state.tab === 'overview' && <OverviewScreen />}
            {state.tab === 'checkout' && <CheckoutScreen />}
            {state.tab === 'concierge' && <ConciergeScreen />}
            {state.tab === 'privacy' && <PrivacyScreen />}
          </PhoneFrame>
        </div>
        <div className="w-full max-w-[420px] lg:mt-[84px] lg:w-auto lg:max-w-none">
          <InspectorPanel />
        </div>
      </div>
    </div>
  );
}
