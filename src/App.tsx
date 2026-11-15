import { PhoneFrame } from './components/PhoneFrame';
import { useMediaQuery } from './lib/motion';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { PrivacyScreen } from './screens/PrivacyScreen';
import { VoucherVaultScreen } from './screens/VoucherVaultScreen';
import { useApp } from './state/appState';

function ActiveScreen() {
  const { state } = useApp();
  return (
    <>
      {state.tab === 'overview' && <OverviewScreen />}
      {state.tab === 'checkout' && <CheckoutScreen />}
      {state.tab === 'vault' && <VoucherVaultScreen />}
      {state.tab === 'privacy' && <PrivacyScreen />}
    </>
  );
}

export default function App() {
  // Below 500px the visitor is on a real phone: drop the device frame and render the app full-bleed.
  const compact = useMediaQuery('(max-width: 499px)');
  if (compact) {
    return (
      <PhoneFrame compact>
        <ActiveScreen />
      </PhoneFrame>
    );
  }
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div className="mx-auto flex max-w-[420px] flex-col items-center gap-3 px-4 py-5 [@media(max-height:720px)]:gap-2 [@media(max-height:720px)]:py-2">
        <div className="w-full px-1 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00B9F1] [@media(max-height:720px)]:hidden">Interactive prototype</p>
          <h1 className="text-[22px] font-extrabold tracking-tight text-[#002E6E]">Paytm CardSense AI</h1>
          <p className="text-[12.5px] text-slate-500 [@media(max-height:720px)]:hidden">Spend analyzer • Benefit optimizer • Pre-swipe checkout router</p>
        </div>
        <PhoneFrame>
          <ActiveScreen />
        </PhoneFrame>
      </div>
    </div>
  );
}
