import {
  AlertTriangle,
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
import { CardArt, Badge, Card, Meter, PrimaryButton, SectionTitle, Sheet } from '../components/ui';
import { CARDS, CARD_ORDER, DEMO_DATE, SAVINGS_ACCOUNT, USER, type CardId } from '../data/cardsData';
import { formatINR, pct } from '../lib/format';
import { dinersStatus, totalLiability, utilityCapStatus } from '../lib/routingEngine';
import { useApp } from '../state/appState';

export function OverviewScreen() {
  return (
    <div className="space-y-5 px-4 pb-6 pt-4">
      <Greeting />
      <SafeToSpendHero />
      <AlertsCarousel />
      <PortfolioStack />
    </div>
  );
}

function Greeting() {
  return (
    <div className="flex items-end justify-between px-1">
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
  const liability = totalLiability(state.cards);
  const balance = state.bankBalance;
  const safe = balance - liability;
  const aa = state.consents.aa;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#001F4D] via-[#002E6E] to-[#0A4FA3] p-5 text-white shadow-[0_18px_40px_-18px_rgba(0,46,110,0.8)]">
      <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#00B9F1]/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7FDBFF]">Safe-to-Spend Balance</p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] font-semibold text-white/80">Live • AA + Card sync</span>
        </div>

        {aa ? (
          <>
            <p key={safe} className={`tabular mt-1 text-[38px] font-extrabold leading-tight animate-fadeIn ${safe < 0 ? 'text-[#FF8FAA]' : 'text-white'}`}>
              {formatINR(safe)}
            </p>
            <p className="text-[11.5px] text-white/70">
              {safe < 0 ? (
                <span className="font-semibold text-[#FF8FAA]">Over-committed: unbilled card spends exceed your bank balance — avoid revolving at ~42% p.a.</span>
              ) : (
                'after all unbilled credit card & RuPay-UPI spends'
              )}
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-[#00B9F1] transition-all duration-700" style={{ width: `${pct(Math.max(0, safe), balance)}%` }} />
                <div
                  className="h-full bg-[#EC184A] transition-all duration-700"
                  style={{
                    width: `${pct(Math.min(liability, balance), balance)}%`,
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.25) 0 5px, transparent 5px 10px)',
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#00B9F1]" />
                  <span className="text-white/70">AA Bank Balance</span>
                  <span className="tabular font-bold">{formatINR(balance)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#EC184A]" />
                  <span className="tabular font-bold">{formatINR(liability)}</span>
                  <span className="text-white/70">Unbilled</span>
                </span>
              </div>
              <p className="text-[10px] text-white/50">
                {SAVINGS_ACCOUNT.bank} {SAVINGS_ACCOUNT.masked} via {SAVINGS_ACCOUNT.aaPartner} • Unbilled CC &amp; RuPay-UPI = {CARD_ORDER.filter((id) => state.cards[id].unbilled > 0).map((id) => formatINR(state.cards[id].unbilled)).join(' + ')}
              </p>
            </div>
          </>
        ) : (
          <div className="mt-2 rounded-2xl bg-white/10 p-4">
            <p className="flex items-center gap-2 text-[14px] font-bold">
              <Lock size={16} /> AA consent revoked
            </p>
            <p className="mt-1 text-[11.5px] text-white/70">
              Bank balance is no longer shared, so Safe-to-Spend is paused. Unbilled liability tracked: <b className="tabular text-white">{formatINR(liability)}</b>
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
          <div className="mt-2 rounded-2xl bg-white/10 p-3 text-[11.5px] leading-relaxed text-white/85 animate-fadeIn">
            When you scan a UPI QR with a <b>RuPay credit card</b>, the payment looks like a normal UPI debit — but the money is borrowed, and
            your savings balance doesn't move. Across 4 cards that hidden liability adds up fast. CardSense nets it off your AA-linked balance so
            you never mistake credit for cash and roll over into <b className="text-[#FF8FAA]">~42% p.a. revolving interest</b>.
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AlertsCarousel() {
  return (
    <section>
      <SectionTitle right={<span className="text-[10.5px] font-semibold text-slate-400">Swipe →</span>}>Urgent Actions</SectionTitle>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        <SettlementAlert />
        <BillAlert />
        <CapAlert />
      </div>
    </section>
  );
}

function AlertShell({ tone, children }: { tone: 'amber' | 'emerald' | 'crimson'; children: ReactNode }) {
  const border = { amber: 'border-[#D97706]/35', emerald: 'border-[#16A34A]/35', crimson: 'border-[#EC184A]/35' }[tone];
  const stripe = { amber: 'bg-[#D97706]', emerald: 'bg-[#16A34A]', crimson: 'bg-[#EC184A]' }[tone];
  return (
    <div className={`relative w-[86%] shrink-0 snap-center overflow-hidden rounded-2xl border bg-white p-4 ${border}`}>
      <div className={`absolute inset-y-0 left-0 w-1 ${stripe}`} />
      {children}
    </div>
  );
}

function SettlementAlert() {
  const { state, dispatch } = useApp();
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
    <AlertShell tone={d.unlocked ? 'emerald' : 'amber'}>
      <div className="flex items-center justify-between">
        <Badge tone={d.unlocked ? 'emerald' : 'amber'}>
          {d.unlocked ? <CheckCircle2 size={11} /> : <Clock size={11} />}
          {d.unlocked ? 'Milestone Unlocked' : '72-Hour Settlement Buffer'}
        </Badge>
        <span className="text-[10px] font-semibold text-slate-400">HDFC Diners Black •••9014</span>
      </div>
      <p className="mt-2 text-[12.5px] font-semibold leading-snug text-[#002E6E]">
        {d.unlocked ? (
          <>₹4,00,000 crossed on settlement date. Your ₹10,000 Marriott/flight voucher is in the Vault.</>
        ) : d.pending > 0 ? (
          <>{formatINR(d.pending)} authorised — awaiting T+1…T+3 merchant settlement. Bank counts the settlement date, not the swipe date.</>
        ) : (
          <>
            Spend {formatINR(d.settledGap)} by March 28 (3 days before Mar 31 cutoff) so T+3 merchant settlement clears in time for your ₹10,000 milestone
            voucher.
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
      <div className="mt-3">
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
          <PrimaryButton tone="emerald" onClick={() => { dispatch({ type: 'SET_TAB', tab: 'concierge' }); dispatch({ type: 'SET_CONCIERGE_VIEW', view: 'vault' }); }} className="w-full">
            <Plane size={13} /> View voucher in Vault
          </PrimaryButton>
        )}
      </div>
    </AlertShell>
  );
}

function BillAlert() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'confirm' | 'processing' | 'done'>('confirm');
  const due = 18450;

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
    <AlertShell tone="emerald">
      <div className="flex items-center justify-between">
        <Badge tone="emerald">
          <ShieldCheck size={11} /> RBI Grace Shield
        </Badge>
        <span className="text-[10px] font-semibold text-slate-400">BBPS • Paytm HDFC Select</span>
      </div>
      {state.billPaid ? (
        <p className="mt-2 text-[12.5px] font-semibold leading-snug text-[#002E6E]">
          Statement of {formatINR(due)} paid via BBPS. Next statement generates on 15 Apr.
        </p>
      ) : (
        <p className="mt-2 text-[12.5px] font-semibold leading-snug text-[#002E6E]">
          Paytm HDFC Select: {formatINR(due)} due in 2 days. Covered by RBI Master Direction Para 23(5) mandatory 3-day grace window.
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
              AA balance now <b className="tabular text-[#002E6E]">{formatINR(state.bankBalance)}</b>
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
              Paying now avoids losing the interest-free period. Even if delayed, no late fee applies until 3 days past due (RBI MD Para 23(5)).
            </p>
            <p className="mt-1.5 text-[10.5px] text-slate-400">
              Safe-to-Spend will drop by {formatINR(due)}: this billed statement sits outside the unbilled pool, so paying it reduces your AA balance.
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

function CapAlert() {
  const { state, dispatch } = useApp();
  const cap = utilityCapStatus(state.cards);
  const exhausted = cap.remaining <= 0.5;
  return (
    <AlertShell tone="crimson">
      <div className="flex items-center justify-between">
        <Badge tone="crimson">
          <AlertTriangle size={11} /> {exhausted ? 'Cap Exhausted' : `Cap ${Math.round(cap.pct)}% Full`}
        </Badge>
        <span className="text-[10px] font-semibold text-slate-400">Paytm HDFC Select •••4821</span>
      </div>
      <p className="mt-2 text-[12.5px] font-semibold leading-snug text-[#002E6E]">
        {exhausted ? (
          <>March's 3% Utility/Recharge cap is fully used. CardSense now routes utility bills to the AU ₹150 coupon until 1 Apr.</>
        ) : (
          <>
            Paytm HDFC 3% Monthly Cap {Math.round(cap.pct)}% Full — only {formatINR(cap.remaining)} cashback capacity ({formatINR(cap.remainingSpend)} spend) left in
            March's calendar-month 3% Utility/Recharge cap.
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
      <PrimaryButton tone="crimson" className="mt-3 w-full" onClick={() => { dispatch({ type: 'SET_SCENARIO', scenario: 'A' }); dispatch({ type: 'SET_TAB', tab: 'checkout' }); }}>
        See smart routing for next bill
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
          <p className="text-[10.5px] text-slate-500">
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
                {o.label}
              </Badge>
            ))}
            {id === 'scapia' && <Badge tone="navy">UPI {card.upiHandle}</Badge>}
          </div>
        </div>
      )}
    </Card>
  );
}

function MeterRow({ label, value, max, tone, right, segments }: { label: string; value?: number; max: number; tone?: 'navy' | 'cyan' | 'crimson' | 'amber' | 'emerald'; right: string; segments?: Array<{ value: number; tone: 'navy' | 'amber' | 'emerald' | 'cyan' | 'crimson'; striped?: boolean }> }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-semibold text-[#002E6E]">{label}</span>
        <span className="tabular text-slate-500">{right}</span>
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
        <p className="text-[10.5px] text-slate-500">
          {short ? `${formatINR(short)} short of unlocking April's unlimited domestic lounge access.` : 'April lounge access unlocked ✓'}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-[#F4F7FA] px-3 py-2 text-[11px] text-slate-600">
      <b className="text-[#16A34A]">Active Paytm offer:</b> 12% Instant Discount up to ₹5,000 on Paytm Domestic Flights (min txn ₹10,000). Rewards add-on not activated.
    </div>
  );
}
