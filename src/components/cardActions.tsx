import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SAVINGS_ACCOUNT, type ScenarioId } from '../data/cardsData';
import { formatINR } from '../lib/format';
import { getSafeToSpend, useApp, type Action } from '../state/appState';
import { PrimaryButton, Sheet } from './ui';

/** Seed Paytm HDFC Select statement; live `statementDue` drops to 0 once paid. */
export const HDFC_STATEMENT = 18450;
export const DINERS_SIM_AMOUNT = 12500;

export function goCheckout(dispatch: (a: Action) => void, scenario: ScenarioId) {
  dispatch({ type: 'SET_SCENARIO', scenario });
  dispatch({ type: 'SET_TAB', tab: 'checkout' });
}

export function goVault(dispatch: (a: Action) => void) {
  dispatch({ type: 'SET_TAB', tab: 'vault' });
  dispatch({ type: 'SET_CONCIERGE_VIEW', view: 'vault' });
}

/** Simulate a Diners spend, then fast-forward its T+3 settlement. Shared by Urgent Actions and Card Detail. */
export function useDinersFlow() {
  const { dispatch } = useApp();
  const [settling, setSettling] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return {
    settling,
    simulate: () => dispatch({ type: 'SIMULATE_DINERS', amount: DINERS_SIM_AMOUNT }),
    settle: () => {
      setSettling(true);
      timer.current = window.setTimeout(() => {
        dispatch({ type: 'SETTLE_DINERS' });
        setSettling(false);
      }, 1200);
    },
  };
}

/** BBPS 1-tap UPI payment of the Paytm HDFC Select statement. */
export function BillPaySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const [step, setStep] = useState<'confirm' | 'processing' | 'done'>('confirm');
  const { safe } = getSafeToSpend(state);

  const pay = () => {
    setStep('processing');
    window.setTimeout(() => {
      dispatch({ type: 'PAY_BILL' });
      setStep('done');
    }, 1300);
  };
  const close = () => {
    onClose();
    window.setTimeout(() => setStep('confirm'), 200);
  };

  return (
    <Sheet open={open} onClose={close} title={step === 'done' ? undefined : 'Confirm bill payment'}>
      {step === 'done' ? (
        <div className="flex flex-col items-center py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#16A34A] text-white animate-pop">
            <CheckCircle2 size={34} />
          </div>
          <p className="mt-3 text-[17px] font-extrabold text-[#002E6E]">Bill Paid • {formatINR(HDFC_STATEMENT)}</p>
          <p className="mt-1 text-[12px] text-slate-500">BBPS Ref BBPS2603271847 • Credited to HDFC Bank instantly</p>
          <p className="mt-2 text-[11.5px] text-slate-500">
            AA balance now <b className="tabular text-[#002E6E]">{formatINR(state.bankBalance)}</b> • Safe-to-Spend unchanged at{' '}
            <b className="tabular text-[#002E6E]">{safe === null ? '—' : formatINR(safe)}</b>
          </p>
          <PrimaryButton className="mt-5 w-full" onClick={close}>
            Done
          </PrimaryButton>
        </div>
      ) : (
        <div>
          <div className="rounded-2xl border border-[#E2E8F0] p-3">
            <Row k="Biller" v="HDFC Bank Credit Card (BBPS)" />
            <Row k="Card" v="Paytm HDFC Select •••• 4821" />
            <Row k="Amount" v={formatINR(HDFC_STATEMENT)} bold />
            <Row k="Pay from" v={`HDFC Savings ${SAVINGS_ACCOUNT.masked} • UPI`} />
            <Row k="Convenience fee" v="₹0" />
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck size={13} className="mt-0.5 shrink-0 text-[#16A34A]" />
            Paying now keeps your interest-free period. Even if delayed, no late fee applies until 3 days past due (RBI MD Para 23(5)).
          </p>
          <p className="mt-1.5 text-[10.5px] text-slate-400">
            Safe-to-Spend stays at {safe === null ? '—' : formatINR(safe)}. This bill is already reserved in it, so paying lowers “AA balance” and “Bill due” by the same amount.
          </p>
          <PrimaryButton tone="emerald" className="mt-4 w-full py-3 text-[13px]" onClick={pay} disabled={step === 'processing' || state.billPaid}>
            {step === 'processing' ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Authorising UPI…
              </>
            ) : (
              <>Pay {formatINR(HDFC_STATEMENT)} via UPI</>
            )}
          </PrimaryButton>
        </div>
      )}
    </Sheet>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-[12px]">
      <span className="text-slate-500">{k}</span>
      <span className={`tabular text-right text-[#002E6E] ${bold ? 'text-[14px] font-extrabold' : 'font-semibold'}`}>{v}</span>
    </div>
  );
}
