import {
  AlertTriangle,
  Armchair,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FastForward,
  Info,
  Loader2,
  Lock,
  Plane,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { BillPaySheet, DINERS_SIM_AMOUNT, HDFC_STATEMENT, goCheckout, goVault, useDinersFlow } from '../components/cardActions';
import { InfoTip } from '../components/InfoTip';
import { useTourTarget } from '../components/Tour';
import { CardArt, Meter, PrimaryButton, SectionTitle } from '../components/ui';
import { CARDS, CARD_ORDER, DEMO_DATE, SAVINGS_ACCOUNT, USER, type CardId } from '../data/cardsData';
import { formatINR, pct } from '../lib/format';
import { dinersStatus, totalBilledDue, utilityCapStatus } from '../lib/routingEngine';
import { getSafeToSpend, useApp, type AppState } from '../state/appState';

export function OverviewScreen() {
  return (
    <div>
      <PrivacyBanner />
      <div className="space-y-5 px-4 pb-6 pt-4">
        <Greeting />
        <SafeToSpendHero />
        <UrgentActions />
        <PortfolioStack />
      </div>
    </div>
  );
}

/** Slim, dismissible trust strip. Full detail lives on the Data & Privacy tab. */
function PrivacyBanner() {
  const { state, dispatch } = useApp();
  if (state.bannerDismissed) return null;
  return (
    <div className="flex h-7 items-center gap-1.5 bg-[#001F4D] pl-3 pr-1 text-white">
      <ShieldCheck size={12} className="shrink-0 text-[#7FDBFF]" aria-hidden />
      <button
        onClick={() => dispatch({ type: 'SET_TAB', tab: 'privacy' })}
        className="min-w-0 flex-1 truncate text-left text-[10px] font-semibold tracking-wide hover:underline"
        title="Open Data & Privacy"
      >
        Zero Gmail access · DPDP compliant · Your data stays on your device
      </button>
      <button
        onClick={() => dispatch({ type: 'DISMISS_BANNER' })}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
        aria-label="Dismiss privacy banner"
      >
        <X size={13} />
      </button>
    </div>
  );
}

function Greeting() {
  return (
    <div className="px-1">
      <p className="text-[11px] font-medium text-slate-500">{DEMO_DATE.label}</p>
      <h2 className="text-[18px] font-extrabold tracking-tight text-[#002E6E]">Hi {USER.firstName}</h2>
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
  return `${days} days`;
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

const SHELL: Record<ShellTone, { border: string; stripe: string; icon: string }> = {
  amber: { border: 'border-[#D97706]/35', stripe: 'bg-[#D97706]', icon: 'bg-[#D97706]/10 text-[#B45309]' },
  emerald: { border: 'border-[#16A34A]/35', stripe: 'bg-[#16A34A]', icon: 'bg-[#16A34A]/10 text-[#15803D]' },
  crimson: { border: 'border-[#EC184A]/35', stripe: 'bg-[#EC184A]', icon: 'bg-[#EC184A]/10 text-[#C8103C]' },
  cyan: { border: 'border-[#00B9F1]/40', stripe: 'bg-[#00B9F1]', icon: 'bg-[#00B9F1]/10 text-[#0089B3]' },
};

/** Minimal alert: icon + short title, urgency chip, one headline, one button, and an "i" for the detail. */
function AlertCard({
  tone,
  days,
  icon,
  title,
  headline,
  info,
  children,
}: {
  tone: ShellTone;
  days: number;
  icon: ReactNode;
  title: string;
  headline: string;
  info: ReactNode;
  children: ReactNode;
}) {
  const resolved = !Number.isFinite(days);
  const s = SHELL[tone];
  return (
    <div className={`relative rounded-2xl border bg-white p-3.5 pl-4 ${s.border} ${resolved ? 'opacity-85' : ''}`}>
      <div className={`absolute bottom-3 left-0 top-3 w-1 rounded-r-full ${s.stripe}`} aria-hidden />
      <div className="flex items-start gap-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.icon}`} aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[11.5px] font-bold text-slate-500">{title}</p>
            <span
              className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${
                resolved ? 'bg-[#16A34A]/10 text-[#15803D]' : days <= 2 ? 'bg-[#EC184A] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {deadlineLabel(days)}
            </span>
          </div>
          <p className="tabular mt-0.5 text-[14.5px] font-extrabold leading-snug text-[#002E6E]">{headline}</p>
        </div>
        <InfoTip label={`More about ${title}`} title={title}>
          {info}
        </InfoTip>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function InfoList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-1.5">
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#00B9F1]" aria-hidden />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function SettlementAlert({ days }: { days: number }) {
  const { state, dispatch } = useApp();
  const tour = useTourTarget('simulate');
  const d = dinersStatus(state.cards);
  const { simulate, settle, settling } = useDinersFlow();

  const headline = d.unlocked ? '₹10,000 voucher unlocked' : d.pending > 0 ? `${formatINR(d.pending)} settling by 31 Mar` : `Spend ${formatINR(d.settledGap)} by 28 Mar`;

  return (
    <AlertCard
      tone={d.unlocked ? 'emerald' : 'amber'}
      days={days}
      icon={d.unlocked ? <CheckCircle2 size={18} /> : <Clock size={18} />}
      title="72-Hour Settlement Buffer"
      headline={headline}
      info={
        <>
          <InfoList
            items={[
              <>HDFC Diners Black counts the merchant settlement date (T+1 to T+3), not the swipe date.</>,
              <>The Q4 milestone quarter closes on 31 Mar, so spend must land by 28 Mar to settle in time.</>,
              <>
                Settled <b className="tabular text-[#002E6E]">{formatINR(d.settled)}</b> of <b className="tabular text-[#002E6E]">{formatINR(d.target)}</b>
                {d.pending > 0 && (
                  <>
                    , with <b className="tabular text-[#D97706]">{formatINR(d.pending)}</b> pending settlement
                  </>
                )}
                .
              </>,
              <>
                At stake: the <b className="text-[#002E6E]">₹10,000 Marriott / flight voucher</b>.
              </>,
            ]}
          />
          <div className="mt-2.5">
            <Meter
              max={d.target}
              height="h-2"
              segments={[
                { value: d.settled, tone: d.unlocked ? 'emerald' : 'navy' },
                { value: d.pending, tone: 'amber', striped: true },
              ]}
            />
            <p className="tabular mt-1 text-[10.5px] text-slate-500">
              {formatINR(d.settled + d.pending)} / {formatINR(d.target)}
              {d.pending > 0 ? ' • striped = pending settlement' : ''}
            </p>
          </div>
        </>
      }
    >
      <div ref={tour.ref} className={tour.className}>
        {!state.dinersSimulated ? (
          <PrimaryButton tone="amber" onClick={simulate} className="w-full">
            <Zap size={13} /> Simulate {formatINR(DINERS_SIM_AMOUNT)} spend
          </PrimaryButton>
        ) : d.pending > 0 ? (
          <PrimaryButton tone="navy" onClick={settle} disabled={settling} className="w-full">
            {settling ? <Loader2 size={13} className="animate-spin" /> : <FastForward size={13} />}
            {settling ? 'Posting settlement…' : 'Fast-forward T+3 settlement'}
          </PrimaryButton>
        ) : (
          <PrimaryButton tone="emerald" onClick={() => goVault(dispatch)} className="w-full">
            <Plane size={13} /> View voucher in Vault
          </PrimaryButton>
        )}
      </div>
    </AlertCard>
  );
}

function BillAlert({ days }: { days: number }) {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <AlertCard
      tone="emerald"
      days={days}
      icon={<ShieldCheck size={18} />}
      title="RBI Grace Shield"
      headline={state.billPaid ? `${formatINR(HDFC_STATEMENT)} paid via BBPS` : `${formatINR(HDFC_STATEMENT)} due 29 Mar`}
      info={
        <>
          <div className="mb-2 grid grid-cols-3 gap-1.5 text-center">
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
          <InfoList
            items={[
              <>Paytm HDFC Select statement of {formatINR(HDFC_STATEMENT)} is due on 29 Mar.</>,
              <>RBI Master Direction Para 23(5) gives a 3-day grace window: no late fee or bureau report until 1 Apr.</>,
              <>
                Missing the due date still breaks the <b className="text-[#002E6E]">interest-free period</b>, so interest (~42% p.a.) runs from each purchase date.
              </>,
            ]}
          />
          {state.billPaid && <p className="mt-2 font-semibold text-[#15803D]">Paid via BBPS. Next statement generates on 15 Apr.</p>}
        </>
      }
    >
      <PrimaryButton tone="emerald" className="w-full" onClick={() => setOpen(true)} disabled={state.billPaid}>
        {state.billPaid ? (
          <>
            <CheckCircle2 size={13} /> Paid
          </>
        ) : (
          <>
            <Zap size={13} /> Pay via UPI
          </>
        )}
      </PrimaryButton>
      <BillPaySheet open={open} onClose={() => setOpen(false)} />
    </AlertCard>
  );
}

function CapAlert({ days }: { days: number }) {
  const { state, dispatch } = useApp();
  const cap = utilityCapStatus(state.cards);
  const exhausted = cap.remaining <= 0.5;
  return (
    <AlertCard
      tone="crimson"
      days={days}
      icon={<AlertTriangle size={18} />}
      title="Cap alert • HDFC Select"
      headline={exhausted ? '3% cap fully used' : `3% cap ${Math.round(cap.pct)}% used`}
      info={
        <>
          <InfoList
            items={[
              <>
                <b className="tabular text-[#002E6E]">{formatINR(cap.used)}</b> of {formatINR(cap.cap)} Utility/Recharge cashback used this month.
              </>,
              exhausted ? (
                <>The cap is full. CardSense routes utility bills to the next-best card until it resets.</>
              ) : (
                <>
                  Only <b className="tabular text-[#002E6E]">{formatINR(cap.remainingSpend)}</b> of spend left at 3% in March.
                </>
              ),
              <>It is a calendar-month cap, so it resets on 1 Apr (not on the statement date).</>,
            ]}
          />
          <div className="mt-2.5">
            <Meter max={cap.cap} height="h-2" segments={[{ value: cap.used, tone: 'crimson' }]} />
          </div>
        </>
      }
    >
      <PrimaryButton tone="crimson" className="w-full" onClick={() => goCheckout(dispatch, 'A')}>
        See smart routing
      </PrimaryButton>
    </AlertCard>
  );
}

function LoungeAlert({ days }: { days: number }) {
  const { state, dispatch } = useApp();
  const gate = CARDS.scapia.loungeGate!;
  const spend = state.cards.scapia.monthSpend;
  const short = Math.max(0, gate.monthlyTarget - spend);
  const excluded = CARDS.scapia.exclusions.map((e) => e.label.toLowerCase());
  return (
    <AlertCard
      tone={short ? 'cyan' : 'emerald'}
      days={days}
      icon={short ? <Armchair size={18} /> : <CheckCircle2 size={18} />}
      title="Lounge gate • Scapia"
      headline={short ? `${formatINR(short)} short for lounge` : 'April lounge unlocked'}
      info={
        <>
          <InfoList
            items={[
              <>
                <b className="tabular text-[#002E6E]">{formatINR(spend)}</b> of {formatINR(gate.monthlyTarget)} eligible March spend on Scapia RuPay.
              </>,
              short ? <>{Number.isFinite(days) ? days : 0} days left: eligible spend must land by 31 Mar.</> : <>{gate.perk} is unlocked.</>,
              <>
                {excluded.slice(0, -1).join(', ')} and {excluded[excluded.length - 1]} do not count toward the gate.
              </>,
            ]}
          />
          <div className="mt-2.5">
            <Meter max={gate.monthlyTarget} height="h-2" segments={[{ value: spend, tone: short ? 'cyan' : 'emerald' }]} />
          </div>
        </>
      }
    >
      <PrimaryButton tone="cyan" className="w-full" disabled={!short} onClick={() => goCheckout(dispatch, 'B')}>
        {!short ? (
          <>
            <CheckCircle2 size={13} /> Unlocked
          </>
        ) : state.paid.B ? (
          'Open Smart Checkout'
        ) : (
          'Route a QR to Scapia'
        )}
      </PrimaryButton>
    </AlertCard>
  );
}

/* ------------------------------------------------------------------ */

function PortfolioStack() {
  return (
    <section>
      <SectionTitle right={<span className="text-[10.5px] font-semibold text-slate-400">4 cards • tap for details</span>}>Portfolio</SectionTitle>
      <div className="space-y-2">
        {CARD_ORDER.map((id) => (
          <PortfolioRow key={id} id={id} />
        ))}
      </div>
    </section>
  );
}

function PortfolioRow({ id }: { id: CardId }) {
  const { state, dispatch } = useApp();
  const card = CARDS[id];
  const live = state.cards[id];
  return (
    <button
      onClick={() => dispatch({ type: 'OPEN_CARD', card: id })}
      className="group flex w-full items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3 text-left transition hover:border-[#00B9F1]/60 hover:bg-[#F8FBFD] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B9F1]"
      aria-label={`Open ${card.shortName} card details`}
    >
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
      <ChevronRight size={16} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#00B9F1]" />
    </button>
  );
}
