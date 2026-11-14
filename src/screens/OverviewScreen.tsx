import {
  AlertTriangle,
  Armchair,
  CheckCircle2,
  ChevronDown,
  Clock,
  FastForward,
  Info,
  Loader2,
  Lock,
  Plane,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTourTarget } from '../components/Tour';
import { CardArt, Badge, Card, Meter, PrimaryButton, SectionTitle, Sheet } from '../components/ui';
import { CARDS, CARD_ORDER, DEMO_DATE, SAVINGS_ACCOUNT, SCENARIOS, USER, type CardId } from '../data/cardsData';
import { formatINR, pct } from '../lib/format';
import { dinersStatus, totalBilledDue, utilityCapStatus } from '../lib/routingEngine';
import { getSafeToSpend, useApp, type AppState } from '../state/appState';

export function OverviewScreen() {
  return (
    <div className="space-y-5 px-4 pb-6 pt-4">
      <Greeting />
      <SafeToSpendHero />
      <UrgentActions />
      <PortfolioStack />
    </div>
  );
}

function Greeting() {
  return (
    <div className="flex items-end justify-between gap-2 px-1">
      <div>
        <p className="text-[11px] font-medium text-slate-500">{DEMO_DATE.label}</p>
        <h2 className="text-[18px] font-extrabold tracking-tight text-[#002E6E]">Hi {USER.firstName} 👋</h2>
      </div>
      <Badge tone="navy">
        <Sparkles size={11} /> {USER.persona}
      </Badge>
    </div>
  );
}

function SafeToSpendHero() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const { safe, balance, unbilled, billedDue, blind } = getSafeToSpend(state);
  const dueDays = state.cards.hdfcSelect.dueInDays;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#001F4D] via-[#002E6E] to-[#0A4FA3] p-5 text-white shadow-[0_18px_40px_-18px_rgba(0,46,110,0.8)]">
      <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#00B9F1]/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7FDBFF]">Safe-to-Spend Balance</p>
          <span className="whitespace-nowrap rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] font-semibold text-white/80">Live • AA + Card sync</span>
        </div>

        {safe !== null ? (
          <>
            <p key={safe} className={`tabular mt-1 text-[38px] font-extrabold leading-tight animate-fadeIn ${safe < 0 ? 'text-[#FF8FAA]' : 'text-white'}`}>
              {formatINR(safe)}
            </p>
            <p className="text-[11.5px] text-white/70">
              {safe < 0 ? (
                <span className="font-semibold text-[#FF8FAA]">Over-committed: card dues exceed your bank balance. Avoid revolving at ~42% p.a.</span>
              ) : (
                'after unbilled spends and bills due'
              )}
            </p>

            <div className="mt-4 space-y-2">
              <div
                className="flex h-3 w-full overflow-hidden rounded-full bg-white/10"
                role="img"
                aria-label={`AA balance ${formatINR(balance)}: ${formatINR(unbilled)} unbilled, ${formatINR(billedDue)} bills due, ${formatINR(Math.max(0, safe))} safe to spend`}
              >
                <div className="h-full bg-[#00B9F1] transition-all duration-700" style={{ width: `${pct(Math.max(0, safe), balance)}%` }} />
                <div
                  className="h-full bg-[#EC184A] transition-all duration-700"
                  style={{
                    width: `${pct(Math.min(unbilled, balance), balance)}%`,
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.25) 0 5px, transparent 5px 10px)',
                  }}
                />
                <div className="h-full bg-[#F59E0B] transition-all duration-700" style={{ width: `${pct(Math.min(billedDue, Math.max(0, balance - unbilled)), balance)}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[10.5px]">
                <Legend dot="bg-[#00B9F1]" label="AA balance" value={formatINR(balance)} />
                <Legend dot="bg-[#EC184A]" label="Unbilled" value={`−${formatINR(unbilled)}`} />
                <Legend
                  dot="bg-[#F59E0B]"
                  label={billedDue > 0 && dueDays !== null ? `Bill due in ${dueDays} days` : 'Bills due'}
                  value={billedDue > 0 ? `−${formatINR(billedDue)}` : '₹0 ✓'}
                />
              </div>
              <p className="text-[10px] text-white/50">
                {SAVINGS_ACCOUNT.bank} {SAVINGS_ACCOUNT.masked} via {SAVINGS_ACCOUNT.aaPartner}
                {billedDue > 0 && <> • Bill due = Paytm HDFC Select statement via BBPS</>}
              </p>
              {blind.map((x) => (
                <p key={x.source} className="flex items-start gap-1.5 rounded-lg bg-[#F59E0B]/20 px-2 py-1 text-[10.5px] font-semibold text-[#FCD34D]">
                  <AlertTriangle size={12} className="mt-[1px] shrink-0" />
                  Overstated by up to {formatINR(x.amount)}: {x.source === 'sms' ? 'SMS sandbox' : 'BBPS bill fetch'} is revoked, so {x.label} aren't counted.
                </p>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-2 rounded-2xl bg-white/10 p-4">
            <p className="flex items-center gap-2 text-[14px] font-bold">
              <Lock size={16} /> AA consent revoked
            </p>
            <p className="mt-1 text-[11.5px] text-white/70">
              Bank balance is no longer shared, so Safe-to-Spend is paused. Card dues still tracked: <b className="tabular text-white">{formatINR(unbilled + billedDue)}</b>
            </p>
            <button
              onClick={() => dispatch({ type: 'SET_TAB', tab: 'privacy' })}
              className="mt-3 rounded-lg bg-[#00B9F1] px-3 py-1.5 text-[11.5px] font-bold text-white"
            >
              Re-grant in Data &amp; Privacy
            </button>
          </div>
        )}

        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-[#7FDBFF] hover:bg-white/15"
          aria-expanded={open}
        >
          <Info size={12} /> Why this matters <ChevronDown size={12} className={`transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="mt-2 space-y-1.5 rounded-2xl bg-white/10 p-3 text-[11.5px] leading-relaxed text-white/85 animate-fadeIn">
            <p className="font-semibold text-white">Safe-to-Spend = AA balance − unbilled spends − unpaid billed dues</p>
            <p>
              When you scan a UPI QR with a <b>RuPay credit card</b>, it looks like a normal UPI debit, but the money is borrowed and your savings balance doesn't move. Add a statement that's
              billed but unpaid, and your balance overstates what's really yours. CardSense nets both off so you never roll into{' '}
              <b className="text-[#FF8FAA]">~42% p.a. revolving interest</b>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="flex items-center gap-1 text-white/70">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <span className="truncate">{label}</span>
      </span>
      <span className="tabular block font-bold">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type AlertId = 'diners' | 'bill' | 'lounge' | 'cap';

/** Days until each alert's deadline from the demo date (Infinity once resolved). */
function alertDeadlines(state: AppState): Record<AlertId, number> {
  const today = DEMO_DATE.day;
  const monthLeft = DEMO_DATE.daysInMonth - today + 1; // incl. today
  const d = dinersStatus(state.cards);
  const gate = CARDS.scapia.loungeGate!;
  const cap = utilityCapStatus(state.cards);
  return {
    // Spend must land by 28 Mar so T+3 settlement clears by 31 Mar; once authorised the deadline is the 31st.
    diners: d.unlocked ? Infinity : d.pending > 0 ? DEMO_DATE.daysInMonth - today : 28 - today,
    bill: totalBilledDue(state.cards) > 0 ? (state.cards.hdfcSelect.dueInDays ?? 0) : Infinity,
    lounge: state.cards.scapia.monthSpend >= gate.monthlyTarget ? Infinity : monthLeft,
    cap: cap.remaining <= 0.5 ? Infinity : monthLeft,
  };
}

function deadlineLabel(days: number): string {
  if (!Number.isFinite(days)) return 'Done';
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days left`;
}

/** Stacked (not swiped) so no card is missed; sorted by deadline, resolved items sink to the bottom. */
function UrgentActions() {
  const { state } = useApp();
  const tour = useTourTarget<HTMLElement>('alerts');
  const deadlines = alertDeadlines(state);
  // Stable tiebreak: money-at-risk before perks when deadlines match.
  const priority: AlertId[] = ['bill', 'diners', 'cap', 'lounge'];
  const order = [...priority].sort((x, y) => {
    const dx = deadlines[x];
    const dy = deadlines[y];
    if (dx === dy) return 0;
    return dx < dy ? -1 : 1;
  });
  const open = order.filter((id) => Number.isFinite(deadlines[id])).length;
  const render: Record<AlertId, ReactNode> = {
    diners: <SettlementAlert days={deadlines.diners} />,
    bill: <BillAlert days={deadlines.bill} />,
    lounge: <LoungeAlert days={deadlines.lounge} />,
    cap: <CapAlert days={deadlines.cap} />,
  };
  return (
    <section ref={tour.ref} className={tour.className}>
      <SectionTitle right={<span className="text-[10.5px] font-semibold text-slate-400">{open} open • soonest first</span>}>Urgent Actions</SectionTitle>
      <div className="space-y-2.5">
        {order.map((id) => (
          <div key={id}>{render[id]}</div>
        ))}
      </div>
    </section>
  );
}

type ShellTone = 'amber' | 'emerald' | 'crimson' | 'cyan';

function AlertShell({ tone, days, children }: { tone: ShellTone; days: number; children: ReactNode }) {
  const border: Record<ShellTone, string> = { amber: 'border-[#D97706]/35', emerald: 'border-[#16A34A]/35', crimson: 'border-[#EC184A]/35', cyan: 'border-[#00B9F1]/40' };
  const stripe: Record<ShellTone, string> = { amber: 'bg-[#D97706]', emerald: 'bg-[#16A34A]', crimson: 'bg-[#EC184A]', cyan: 'bg-[#00B9F1]' };
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-white p-4 ${border[tone]} ${Number.isFinite(days) ? '' : 'opacity-85'}`}>
      <div className={`absolute inset-y-0 left-0 w-1 ${stripe[tone]}`} />
      {children}
    </div>
  );
}

function AlertHeader({ badge, meta, days }: { badge: ReactNode; meta: string; days: number }) {
  const resolved = !Number.isFinite(days);
  return (
    <div className="flex items-center justify-between gap-2">
      {badge}
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[10px] font-semibold text-slate-400">{meta}</span>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${
            resolved ? 'bg-[#16A34A]/10 text-[#15803D]' : days <= 2 ? 'bg-[#EC184A] text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {deadlineLabel(days)}
        </span>
      </span>
    </div>
  );
}

function SettlementAlert({ days }: { days: number }) {
  const { state, dispatch } = useApp();
  const tour = useTourTarget('simulate');
  const d = dinersStatus(state.cards);
  const [settling, setSettling] = useState(false);
  const simAmount = 12500;

  const settle = () => {
    setSettling(true);
    window.setTimeout(() => {
      dispatch({ type: 'SETTLE_DINERS' });
      setSettling(false);
    }, 1200);
  };

  return (
    <AlertShell tone={d.unlocked ? 'emerald' : 'amber'} days={days}>
      <AlertHeader
        days={days}
        meta="Diners Black •••9014"
        badge={
          <Badge tone={d.unlocked ? 'emerald' : 'amber'}>
            {d.unlocked ? <CheckCircle2 size={11} /> : <Clock size={11} />}
            {d.unlocked ? 'Milestone Unlocked' : '72-Hr Settlement Buffer'}
          </Badge>
        }
      />
      <p className="mt-2 text-[12.5px] font-semibold leading-snug text-[#002E6E]">
        {d.unlocked ? (
          <>₹4,00,000 crossed on settlement date. Your ₹10,000 Marriott/flight voucher is in the Vault.</>
        ) : d.pending > 0 ? (
          <>{formatINR(d.pending)} authorised and awaiting T+1…T+3 merchant settlement. The bank counts the settlement date, not the swipe date.</>
        ) : (
          <>
            Spend {formatINR(d.settledGap)} by March 28 (3 days before the Mar 31 cutoff) so T+3 merchant settlement clears in time for your ₹10,000 milestone voucher.
          </>
        )}
      </p>
      <div className="mt-3">
        <Meter
          max={d.target}
          height="h-2.5"
          segments={[
            { value: d.settled, tone: d.unlocked ? 'emerald' : 'navy' },
            { value: d.pending, tone: 'amber', striped: true },
          ]}
        />
        <div className="mt-1.5 flex justify-between text-[10.5px]">
          <span className="text-slate-500">
            Settled <b className="tabular text-[#002E6E]">{formatINR(d.settled)}</b>
            {d.pending > 0 && (
              <>
                {' '}
                • Pending <b className="tabular text-[#D97706]">{formatINR(d.pending)}</b>
              </>
            )}
          </span>
          <span className="tabular font-semibold text-slate-500">/ {formatINR(d.target)}</span>
        </div>
      </div>
      <div ref={tour.ref} className={`mt-3 ${tour.className}`}>
        {!state.dinersSimulated ? (
          <PrimaryButton tone="amber" onClick={() => dispatch({ type: 'SIMULATE_DINERS', amount: simAmount })} className="w-full">
            <Zap size={13} /> Simulate {formatINR(simAmount)} Spend
          </PrimaryButton>
        ) : d.pending > 0 ? (
          <PrimaryButton tone="navy" onClick={settle} disabled={settling} className="w-full">
            {settling ? <Loader2 size={13} className="animate-spin" /> : <FastForward size={13} />}
            {settling ? 'Posting settlement…' : 'Fast-forward T+3 settlement (31 Mar)'}
          </PrimaryButton>
        ) : (
          <PrimaryButton
            tone="emerald"
            onClick={() => {
              dispatch({ type: 'SET_TAB', tab: 'concierge' });
              dispatch({ type: 'SET_CONCIERGE_VIEW', view: 'vault' });
            }}
            className="w-full"
          >
            <Plane size={13} /> View voucher in Vault
          </PrimaryButton>
        )}
      </div>
    </AlertShell>
  );
}

function BillAlert({ days }: { days: number }) {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'confirm' | 'processing' | 'done'>('confirm');
  const due = 18450; // seed statement; state.cards.hdfcSelect.statementDue drops to 0 once paid
  const { safe } = getSafeToSpend(state);

  const pay = () => {
    setStep('processing');
    window.setTimeout(() => {
      dispatch({ type: 'PAY_BILL' });
      setStep('done');
    }, 1300);
  };

  const close = () => {
    setOpen(false);
    window.setTimeout(() => setStep('confirm'), 200);
  };

  return (
    <AlertShell tone="emerald" days={days}>
      <AlertHeader
        days={days}
        meta="BBPS • HDFC Select"
        badge={
          <Badge tone="emerald">
            <ShieldCheck size={11} /> RBI Grace Shield
          </Badge>
        }
      />
      {state.billPaid ? (
        <p className="mt-2 text-[12.5px] font-semibold leading-snug text-[#002E6E]">Statement of {formatINR(due)} paid via BBPS. Next statement generates on 15 Apr.</p>
      ) : (
        <p className="mt-2 text-[12.5px] font-semibold leading-snug text-[#002E6E]">
          Paytm HDFC Select: {formatINR(due)} due in 2 days. Covered by the mandatory 3-day grace window in RBI Master Direction Para 23(5).
        </p>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          ['Due date', '29 Mar'],
          ['Grace till', '1 Apr'],
          ['Late fee now', '₹0'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-[#F4F7FA] py-1.5">
            <p className="text-[9.5px] text-slate-500">{k}</p>
            <p className="text-[12px] font-bold text-[#002E6E]">{v}</p>
          </div>
        ))}
      </div>
      <PrimaryButton tone="emerald" className="mt-3 w-full" onClick={() => setOpen(true)} disabled={state.billPaid}>
        {state.billPaid ? (
          <>
            <CheckCircle2 size={13} /> Paid
          </>
        ) : (
          <>
            <Zap size={13} /> 1-Tap Pay via UPI
          </>
        )}
      </PrimaryButton>

      <Sheet open={open} onClose={close} title={step === 'done' ? undefined : 'Confirm bill payment'}>
        {step === 'done' ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#16A34A] text-white animate-pop">
              <CheckCircle2 size={34} />
            </div>
            <p className="mt-3 text-[17px] font-extrabold text-[#002E6E]">Bill Paid • {formatINR(due)}</p>
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
              <Row k="Amount" v={formatINR(due)} bold />
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
            <PrimaryButton tone="emerald" className="mt-4 w-full py-3 text-[13px]" onClick={pay} disabled={step === 'processing'}>
              {step === 'processing' ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Authorising UPI…
                </>
              ) : (
                <>Pay {formatINR(due)} via UPI</>
              )}
            </PrimaryButton>
          </div>
        )}
      </Sheet>
    </AlertShell>
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

function CapAlert({ days }: { days: number }) {
  const { state, dispatch } = useApp();
  const cap = utilityCapStatus(state.cards);
  const exhausted = cap.remaining <= 0.5;
  return (
    <AlertShell tone="crimson" days={days}>
      <AlertHeader
        days={days}
        meta="HDFC Select •••4821"
        badge={
          <Badge tone="crimson">
            <AlertTriangle size={11} /> {exhausted ? 'Cap Exhausted' : `Cap ${Math.round(cap.pct)}% Full`}
          </Badge>
        }
      />
      <p className="mt-2 text-[12.5px] font-semibold leading-snug text-[#002E6E]">
        {exhausted ? (
          <>March's 3% Utility/Recharge cap is fully used. CardSense now routes utility bills to the best remaining option until 1 Apr.</>
        ) : (
          <>
            Paytm HDFC 3% monthly cap is {Math.round(cap.pct)}% full. Only {formatINR(cap.remaining)} cashback ({formatINR(cap.remainingSpend)} of spend) is left in March's calendar-month
            Utility/Recharge cap.
          </>
        )}
      </p>
      <div className="mt-3">
        <Meter max={cap.cap} height="h-2.5" segments={[{ value: cap.used, tone: 'crimson' }]} />
        <div className="mt-1.5 flex justify-between text-[10.5px] text-slate-500">
          <span>
            <b className="tabular text-[#EC184A]">{formatINR(cap.used)}</b> / {formatINR(cap.cap)} cashback
          </span>
          <span>Saturates at {formatINR(cap.saturationSpend)} spend</span>
        </div>
      </div>
      <PrimaryButton
        tone="crimson"
        className="mt-3 w-full"
        onClick={() => {
          dispatch({ type: 'SET_SCENARIO', scenario: 'A' });
          dispatch({ type: 'SET_TAB', tab: 'checkout' });
        }}
      >
        See smart routing for next bill
      </PrimaryButton>
    </AlertShell>
  );
}

function LoungeAlert({ days }: { days: number }) {
  const { state, dispatch } = useApp();
  const gate = CARDS.scapia.loungeGate!;
  const spend = state.cards.scapia.monthSpend;
  const short = Math.max(0, gate.monthlyTarget - spend);
  const b = SCENARIOS.B;
  const routed = state.paid.B;
  return (
    <AlertShell tone={short ? 'cyan' : 'emerald'} days={days}>
      <AlertHeader
        days={days}
        meta="Scapia RuPay •••3319"
        badge={
          <Badge tone={short ? 'cyan' : 'emerald'}>
            {short ? <Armchair size={11} /> : <CheckCircle2 size={11} />} {short ? 'Lounge Gate' : 'Lounge Unlocked'}
          </Badge>
        }
      />
      <p className="mt-2 text-[12.5px] font-semibold leading-snug text-[#002E6E]">
        {short ? (
          <>{formatINR(short)} short of April's unlimited domestic lounge access. Eligible Scapia spend must land by 31 Mar.</>
        ) : (
          <>March eligible spend crossed {formatINR(gate.monthlyTarget)}. Unlimited domestic lounge access is unlocked for April.</>
        )}
      </p>
      <div className="mt-3">
        <Meter max={gate.monthlyTarget} height="h-2.5" segments={[{ value: spend, tone: short ? 'cyan' : 'emerald' }]} />
        <div className="mt-1.5 flex justify-between text-[10.5px] text-slate-500">
          <span>
            <b className="tabular text-[#002E6E]">{formatINR(spend)}</b> / {formatINR(gate.monthlyTarget)} March eligible spend
          </span>
          {short > 0 && <span className="tabular font-semibold text-[#0089B3]">Shortfall {formatINR(short)}</span>}
        </div>
      </div>
      <PrimaryButton
        tone="cyan"
        className="mt-3 w-full"
        disabled={!short}
        onClick={() => {
          dispatch({ type: 'SET_SCENARIO', scenario: 'B' });
          dispatch({ type: 'SET_TAB', tab: 'checkout' });
        }}
      >
        {!short ? (
          <>
            <CheckCircle2 size={13} /> Unlocked
          </>
        ) : routed ? (
          'Open Smart Checkout'
        ) : (
          `Route ${b.merchant} QR to Scapia`
        )}
      </PrimaryButton>
    </AlertShell>
  );
}

/* ------------------------------------------------------------------ */

function PortfolioStack() {
  const [openId, setOpenId] = useState<CardId | null>('hdfcSelect');
  return (
    <section>
      <SectionTitle right={<span className="text-[10.5px] font-semibold text-slate-400">4 cards</span>}>Portfolio</SectionTitle>
      <div className="space-y-2.5">
        {CARD_ORDER.map((id) => (
          <PortfolioCard key={id} id={id} open={openId === id} onToggle={() => setOpenId(openId === id ? null : id)} />
        ))}
      </div>
    </section>
  );
}

function PortfolioCard({ id, open, onToggle }: { id: CardId; open: boolean; onToggle: () => void }) {
  const { state } = useApp();
  const card = CARDS[id];
  const live = state.cards[id];

  return (
    <Card className="overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-3 text-left" aria-expanded={open}>
        <CardArt card={card} compact />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-[#002E6E]">{card.shortName}</p>
          <p className="truncate text-[10.5px] text-slate-500">
            {card.network} •••• {card.last4} • {card.capCycle} caps
          </p>
        </div>
        <div className="text-right">
          <p className="tabular text-[13px] font-bold text-[#002E6E]">{formatINR(live.unbilled)}</p>
          <p className="text-[9.5px] text-slate-400">unbilled</p>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-[#E2E8F0] px-3 pb-3.5 pt-3 animate-fadeIn">
          <CardArt card={card} />
          <CardMeters id={id} />
          <div className="flex flex-wrap gap-1.5">
            {card.coBranded && <Badge tone="cyan">Paytm co-brand</Badge>}
            {card.exclusions.map((e) => (
              <Badge key={e.mcc} tone="crimson">
                0% {e.label} ({e.mcc})
              </Badge>
            ))}
            {card.offers.map((o) => (
              <Badge key={o.id} tone="emerald">
                {o.label} • demo
              </Badge>
            ))}
            {id === 'scapia' && <Badge tone="navy">UPI {card.upiHandle}</Badge>}
          </div>
        </div>
      )}
    </Card>
  );
}

type MeterTone = 'navy' | 'cyan' | 'crimson' | 'amber' | 'emerald';

function MeterRow({
  label,
  value,
  max,
  tone,
  right,
  segments,
}: {
  label: string;
  value?: number;
  max: number;
  tone?: MeterTone;
  right: string;
  segments?: Array<{ value: number; tone: MeterTone; striped?: boolean }>;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="font-semibold text-[#002E6E]">{label}</span>
        <span className="tabular shrink-0 text-slate-500">{right}</span>
      </div>
      <Meter max={max} segments={segments ?? [{ value: value ?? 0, tone: tone ?? 'cyan' }]} />
    </div>
  );
}

function CardMeters({ id }: { id: CardId }) {
  const { state } = useApp();
  const card = CARDS[id];
  const live = state.cards[id];

  if (id === 'hdfcSelect') {
    const util = utilityCapStatus(state.cards);
    const travel = card.rules.find((r) => r.id === 'travelMovies')!;
    const tUsed = live.capUsed.travelMovies ?? 0;
    return (
      <div className="space-y-2.5">
        <MeterRow label="Calendar-Month Cap • 3% Utility/Recharge" value={util.used} max={util.cap} tone={util.pct >= 90 ? 'crimson' : 'cyan'} right={`${formatINR(util.used)} / ${formatINR(util.cap)}`} />
        <MeterRow label="Calendar-Month Cap • 5% Travel/Movies" value={tUsed} max={travel.monthlyCap!} tone="cyan" right={`${formatINR(tUsed)} / ${formatINR(travel.monthlyCap!)}`} />
        <div className="flex justify-between rounded-xl bg-[#F4F7FA] px-3 py-2 text-[11px]">
          <span className="text-slate-500">Statement due</span>
          <span className="font-bold text-[#002E6E]">{live.statementDue ? `${formatINR(live.statementDue)} • in ${live.dueInDays} days` : 'Paid ✓'}</span>
        </div>
      </div>
    );
  }
  if (id === 'dinersBlack') {
    const d = dinersStatus(state.cards);
    return (
      <MeterRow
        label="Settled vs. Unsettled Milestone (Q4, ends 31 Mar)"
        max={d.target}
        right={`${formatINR(d.settled + d.pending)} / ${formatINR(d.target)}`}
        segments={[
          { value: d.settled, tone: d.unlocked ? 'emerald' : 'navy' },
          { value: d.pending, tone: 'amber', striped: true },
        ]}
      />
    );
  }
  if (id === 'scapia') {
    const gate = card.loungeGate!;
    const short = Math.max(0, gate.monthlyTarget - live.monthSpend);
    return (
      <div className="space-y-2">
        <MeterRow label="Lounge Spend-Gate Meter (March)" value={live.monthSpend} max={gate.monthlyTarget} tone={short ? 'amber' : 'emerald'} right={`${formatINR(live.monthSpend)} / ${formatINR(gate.monthlyTarget)}`} />
        <p className="text-[10.5px] text-slate-500">{short ? `${formatINR(short)} short of unlocking April's unlimited domestic lounge access.` : 'April lounge access unlocked ✓'}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-[#F4F7FA] px-3 py-2 text-[11px] text-slate-600">
      <b className="text-[#16A34A]">Paytm offer:</b> 12% Instant Discount up to ₹5,000 on Paytm Domestic Flights (min txn ₹10,000). Rewards add-on not activated.
      <span className="mt-1 block text-[10px] font-semibold text-[#B45309]">{CARDS.auLit.offers[0].sourceNote}</span>
    </div>
  );
}
