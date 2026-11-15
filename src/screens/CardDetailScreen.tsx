import {
  AlertTriangle,
  ArrowLeft,
  Armchair,
  BadgePercent,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FastForward,
  Gauge,
  Gift,
  KeyRound,
  Lightbulb,
  ListChecks,
  Loader2,
  PieChart,
  Receipt,
  Trophy,
  Zap,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { BillPaySheet, DINERS_SIM_AMOUNT, HDFC_STATEMENT, goCheckout, goVault, useDinersFlow } from '../components/cardActions';
import { Badge, CardArt, Meter, PrimaryButton, type Tone } from '../components/ui';
import { CARD_PROFILES, CATEGORY_ORDER, LATE_FEE_SLABS, toSpendCategory, type SpendCategory } from '../data/cardProfiles';
import { CARDS, initialLiveCards, type CardId } from '../data/cardsData';
import { formatINR, pct } from '../lib/format';
import { dinersStatus, utilityCapStatus } from '../lib/routingEngine';
import { useApp, type Action, type AppState } from '../state/appState';

const CATEGORY_COLOR: Record<SpendCategory, string> = {
  Utilities: '#00B9F1',
  Groceries: '#16A34A',
  Travel: '#7C3AED',
  Dining: '#F59E0B',
  Fuel: '#EC184A',
  Rent: '#64748B',
  Others: '#002E6E',
};

interface TodoItem {
  tone: 'amber' | 'cyan';
  text: string;
  button?: { label: ReactNode; onClick: () => void; disabled?: boolean };
}

/** Full-screen Card Detail page. One component for all four cards, driven by the central store. */
export function CardDetailScreen({ id }: { id: CardId }) {
  const { state, dispatch } = useApp();
  const [billOpen, setBillOpen] = useState(false);
  const diners = useDinersFlow();
  const card = CARDS[id];
  const live = state.cards[id];
  const prof = CARD_PROFILES[id];

  const liveTxns = state.transactions.filter((t) => t.instrument === id);
  const split: Partial<Record<SpendCategory, number>> = { ...prof.split };
  for (const t of liveTxns) {
    const c = toSpendCategory(t.category);
    split[c] = (split[c] ?? 0) + t.amount;
  }
  const outstanding = live.unbilled + live.statementDue;
  const util = pct(outstanding, prof.limit);
  const seedEarned = CATEGORY_ORDER.reduce((s, c) => s + (prof.split[c] ?? 0) * prof.rates[c], 0);
  const earnedValue = Math.round(seedEarned + liveTxns.reduce((s, t) => s + t.reward, 0));
  const missed = prof.transactions.filter((t) => t.thisMonth && t.better).map((t) => ({ ...t, gap: t.better!.value - t.earned }));
  const missedTotal = missed.reduce((s, t) => s + t.gap, 0);

  const todos = buildTodos(id, state, dispatch, { openBill: () => setBillOpen(true), diners, util });
  const status = statusChip(id, state);

  return (
    <div className="flex min-h-full flex-col bg-[#F4F7FA]">
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-[#E2E8F0] bg-white/95 px-2 py-2 backdrop-blur">
        <button
          onClick={() => dispatch({ type: 'CLOSE_CARD' })}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#002E6E] hover:bg-slate-100"
          aria-label="Back to Overview"
        >
          <ArrowLeft size={19} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-extrabold text-[#002E6E]">{card.shortName}</p>
          <p className="text-[10.5px] text-slate-500">
            {card.network} •••• {card.last4}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-6 pt-3">
        {/* 1. Header */}
        <div className="space-y-2.5">
          <CardArt card={card} />
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={status.tone}>{status.label}</Badge>
            <Badge tone="slate">{card.bank}</Badge>
            <Badge tone="slate">
              {card.network} •••• {card.last4}
            </Badge>
            {card.coBranded && <Badge tone="cyan">Paytm co-brand</Badge>}
          </div>
        </div>

        {/* 2. What you need to do */}
        <Section icon={<ListChecks size={15} />} title="What you need to do" note={todos.length ? 'Do these first. Everything below is the detail behind them.' : 'This card needs nothing from you right now.'}>
          {todos.length === 0 ? (
            <p className="flex items-center gap-2 rounded-xl bg-[#16A34A]/10 px-3 py-2.5 text-[12px] font-bold text-[#15803D]">
              <CheckCircle2 size={15} /> Nothing needed
            </p>
          ) : (
            <div className="space-y-2">
              {todos.map((t) => (
                <div key={t.text} className={`rounded-xl border px-3 py-2.5 ${t.tone === 'amber' ? 'border-[#D97706]/30 bg-[#D97706]/[0.07]' : 'border-[#00B9F1]/30 bg-[#00B9F1]/[0.07]'}`}>
                  <p className={`flex items-start gap-1.5 text-[12px] font-bold leading-snug ${t.tone === 'amber' ? 'text-[#92400E]' : 'text-[#0369A1]'}`}>
                    {t.tone === 'amber' ? <AlertTriangle size={13} className="mt-[2px] shrink-0" /> : <Lightbulb size={13} className="mt-[2px] shrink-0" />} {t.text}
                  </p>
                  {t.button && (
                    <PrimaryButton tone={t.tone === 'amber' ? 'amber' : 'cyan'} className="mt-2 w-full" onClick={t.button.onClick} disabled={t.button.disabled}>
                      {t.button.label}
                    </PrimaryButton>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 3. Billing */}
        <Section icon={<CalendarClock size={15} />} title="Billing" note={billingNote(id, state)}>
          <KV
            rows={[
              [`Statement (${prof.lastStatement.date})`, id === 'hdfcSelect' ? (live.statementDue > 0 ? formatINR(HDFC_STATEMENT) : `${formatINR(HDFC_STATEMENT)} • Paid ✓`) : `${formatINR(prof.lastStatement.amount)} • Paid ✓`],
              ['Minimum due', formatINR(id === 'hdfcSelect' && live.statementDue > 0 ? prof.lastStatement.minDue : 0)],
              ['Due date', prof.lastStatement.dueDate],
              ['Grace until (RBI 3-day)', prof.lastStatement.graceUntil],
              ['Billed (unpaid)', formatINR(live.statementDue)],
              ['Unbilled this cycle', formatINR(live.unbilled)],
              ['Billing cycle', `${prof.cycle.start} – ${prof.cycle.end} • ${prof.cycle.daysLeft} days left`],
              ['Interest-free for a purchase today', `${prof.interestFreeDays} days (due ${prof.nextDueDate})`],
              ['Auto-pay', prof.autopay.label],
            ]}
          />
        </Section>

        {/* 4. Credit limit */}
        <Section
          icon={<Gauge size={15} />}
          title="Credit limit & utilisation"
          note={
            util > 30
              ? `At ${Math.round(util)}% you are above the 30% mark that credit scores penalise. Paying down ${formatINR(outstanding - prof.limit * 0.3)} brings it back under.`
              : `You are using ${Math.round(util)}% of this limit. Under 30% keeps your credit score healthy.`
          }
        >
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Limit" value={formatINR(prof.limit)} />
            <Stat label="Used" value={`${Math.round(util)}%`} tone={util > 30 ? 'text-[#EC184A]' : 'text-[#002E6E]'} />
            <Stat label="Available" value={formatINR(prof.limit - outstanding)} />
          </div>
          <div className="mt-2.5">
            <Meter max={100} marker={30} segments={[{ value: util, tone: util > 30 ? 'crimson' : 'cyan' }]} />
            <p className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span className="tabular">{formatINR(outstanding)} outstanding</span>
              <span>30% mark</span>
            </p>
          </div>
          {util > 30 && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-[#EC184A]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#C8103C]">
              <AlertTriangle size={13} className="mt-[1px] shrink-0" /> Utilisation above 30% can lower your credit score.
            </p>
          )}
        </Section>

        {/* 5. Spend split */}
        <SpendSplit id={id} split={split} />

        {/* 6. Caps */}
        <Caps id={id} />

        {/* 7. Rewards */}
        <Section
          icon={<Gift size={15} />}
          title="Rewards"
          note={
            missedTotal > 0
              ? `You left ${formatINR(missedTotal)} on the table this month. Pre-Swipe Check at Paytm checkout catches these before you pay.`
              : 'No rewards missed this month on this card.'
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Earned this cycle"
              value={formatINR(earnedValue)}
              sub={prof.rewards.rupeePerUnit && earnedValue ? `${Math.round(earnedValue / prof.rewards.rupeePerUnit).toLocaleString('en-IN')} ${prof.rewards.unit}` : prof.rewards.unit}
            />
            <Stat
              label="Lifetime"
              value={formatINR(prof.rewards.lifetimeUnits * prof.rewards.rupeePerUnit)}
              sub={`${prof.rewards.lifetimeUnits.toLocaleString('en-IN')} ${prof.rewards.unit}`}
            />
          </div>
          <p className="mt-1.5 text-[10.5px] text-slate-400">{prof.rewards.note}</p>
          <Expiring id={id} />
          <div className="mt-2.5 rounded-xl border border-[#E2E8F0] p-2.5">
            <p className="flex items-center justify-between text-[11px] font-bold text-[#002E6E]">
              Rewards missed this month <span className={`tabular ${missedTotal ? 'text-[#EC184A]' : 'text-[#15803D]'}`}>{formatINR(missedTotal)}</span>
            </p>
            {missed.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-[10.5px] text-slate-500">
                {missed.map((t) => (
                  <li key={t.merchant} className="flex justify-between gap-2">
                    <span className="truncate">
                      {t.merchant}: {t.better!.card} ({t.better!.reason})
                    </span>
                    <span className="tabular shrink-0">−{formatINR(t.gap)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-0.5 text-[10.5px] text-slate-500">Every recent spend went to the best card.</p>
            )}
          </div>
        </Section>

        {/* 8. Milestones & lounge */}
        <Milestones id={id} />

        {/* 9. Fees */}
        <Fees id={id} />

        {/* 10. Recent transactions */}
        <Section icon={<Receipt size={15} />} title="Recent transactions" note={missed.length ? 'Flagged rows would have earned more on another card in your wallet.' : 'No better card was available for these spends.'}>
          <ul className="divide-y divide-[#E2E8F0]">
            {[
              ...liveTxns.map((t) => ({ key: t.id, date: t.date, merchant: t.merchant, mcc: t.mcc, amount: t.amount, earned: t.reward, better: undefined as undefined | { card: string; value: number }, live: true })),
              ...prof.transactions.map((t) => ({ key: t.merchant + t.date, date: t.date, merchant: t.merchant, mcc: t.mcc, amount: t.amount, earned: t.earned, better: t.better, live: false })),
            ]
              .slice(0, 5)
              .map((t) => (
                <li key={t.key} className="flex items-start justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-[#002E6E]">{t.merchant}</p>
                    <p className="text-[10px] text-slate-400">
                      {t.date} • MCC {t.mcc}
                      {t.live && <span className="ml-1 font-bold text-[#0089B3]">• new</span>}
                    </p>
                    {t.better && (
                      <span className="mt-0.5 inline-block rounded bg-[#D97706]/10 px-1.5 py-px text-[9.5px] font-bold text-[#B45309]">
                        Better card: {t.better.card} (+{formatINR(t.better.value - t.earned)})
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-[12px] font-bold text-[#002E6E]">{formatINR(t.amount)}</p>
                    <p className={`tabular text-[10px] font-semibold ${t.earned ? 'text-[#15803D]' : 'text-slate-400'}`}>{t.earned ? `+${formatINR(t.earned)} earned` : '₹0 earned'}</p>
                  </div>
                </li>
              ))}
          </ul>
        </Section>

        {/* 11. Controls */}
        <Section icon={<KeyRound size={15} />} title="Controls" note="CardSense is read-only: it never changes limits, blocks cards or moves money without your tap.">
          <button
            onClick={() => dispatch({ type: 'TOAST', message: 'Demo: not part of this prototype' })}
            className="flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-[12px] font-bold text-[#002E6E] hover:border-[#00B9F1]"
          >
            Manage in {card.bank} app <ExternalLink size={14} className="text-[#00B9F1]" />
          </button>
          <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-[#F4F7FA] px-3 py-2 text-[11px] text-slate-600">
            <KeyRound size={13} className="mt-[1px] shrink-0 text-slate-400" />
            <span>
              <b className="text-[#002E6E]">Tokenisation (read-only):</b> {prof.token}
            </span>
          </p>
        </Section>

        <p className="px-1 text-center text-[10px] font-semibold text-slate-400">
          Demo data: limits, cycles, categories, points, fees and transactions are illustrative.
        </p>
      </div>
      {id === 'hdfcSelect' && <BillPaySheet open={billOpen} onClose={() => setBillOpen(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function buildTodos(
  id: CardId,
  state: AppState,
  dispatch: (a: Action) => void,
  ctx: { openBill: () => void; diners: ReturnType<typeof useDinersFlow>; util: number },
): TodoItem[] {
  const out: TodoItem[] = [];
  const live = state.cards[id];
  if (id === 'hdfcSelect') {
    if (live.statementDue > 0) out.push({ tone: 'amber', text: `Pay ${formatINR(HDFC_STATEMENT)} by 29 Mar`, button: { label: <><Zap size={13} /> Pay via UPI</>, onClick: ctx.openBill } });
    const cap = utilityCapStatus(state.cards);
    if (cap.remaining > 0.5 && cap.pct >= 90)
      out.push({ tone: 'amber', text: `3% utility cap ${Math.round(cap.pct)}% used: route the next bill elsewhere`, button: { label: 'See smart routing', onClick: () => goCheckout(dispatch, 'A') } });
  }
  if (id === 'dinersBlack') {
    const d = dinersStatus(state.cards);
    if (!d.unlocked && d.pending === 0)
      out.push({
        tone: 'amber',
        text: `Spend ${formatINR(d.settledGap)} by 28 Mar for the ₹10,000 voucher`,
        button: { label: <><Zap size={13} /> Simulate {formatINR(DINERS_SIM_AMOUNT)} spend</>, onClick: ctx.diners.simulate },
      });
    else if (!d.unlocked)
      out.push({
        tone: 'amber',
        text: `${formatINR(d.pending)} is settling: it must post by 31 Mar`,
        button: {
          label: ctx.diners.settling ? <><Loader2 size={13} className="animate-spin" /> Posting settlement…</> : <><FastForward size={13} /> Fast-forward T+3 settlement</>,
          onClick: ctx.diners.settle,
          disabled: ctx.diners.settling,
        },
      });
  }
  if (id === 'scapia') {
    const short = Math.max(0, CARDS.scapia.loungeGate!.monthlyTarget - live.monthSpend);
    if (short > 0) out.push({ tone: 'amber', text: `Spend ${formatINR(short)} more for April lounge access`, button: { label: 'Route a QR to Scapia', onClick: () => goCheckout(dispatch, 'B') } });
  }
  if (id === 'auLit' && !state.paid.C) {
    out.push({ tone: 'cyan', text: 'Use it for flights: 12% off on Paytm Flights (demo offer)', button: { label: 'Open flight checkout', onClick: () => goCheckout(dispatch, 'C') } });
  }
  if (ctx.util > 30) {
    out.push({
      tone: 'amber',
      text: `Utilisation is ${Math.round(ctx.util)}%: pay down to get under 30%`,
      button: { label: 'Manage in bank app', onClick: () => dispatch({ type: 'TOAST', message: 'Demo: not part of this prototype' }) },
    });
  }
  return out;
}

function statusChip(id: CardId, state: AppState): { tone: Tone; label: string } {
  const live = state.cards[id];
  if (id === 'hdfcSelect') return live.statementDue > 0 ? { tone: 'amber', label: `Bill due in ${live.dueInDays} days` } : { tone: 'emerald', label: 'Bill paid' };
  if (id === 'dinersBlack') {
    const d = dinersStatus(state.cards);
    return d.unlocked ? { tone: 'emerald', label: 'Milestone unlocked' } : d.pending ? { tone: 'amber', label: 'Settlement pending' } : { tone: 'amber', label: 'Milestone at risk' };
  }
  if (id === 'scapia') {
    const short = Math.max(0, CARDS.scapia.loungeGate!.monthlyTarget - live.monthSpend);
    return short ? { tone: 'cyan', label: `${formatINR(short)} to lounge` } : { tone: 'emerald', label: 'Lounge unlocked' };
  }
  return { tone: 'emerald', label: 'Active' };
}

function billingNote(id: CardId, state: AppState): string {
  const prof = CARD_PROFILES[id];
  if (id === 'hdfcSelect' && state.cards.hdfcSelect.statementDue > 0)
    return `Pay ${formatINR(HDFC_STATEMENT)} by ${prof.lastStatement.dueDate}. The grace window till ${prof.lastStatement.graceUntil} only waives the late fee; interest still starts if you miss the due date.`;
  return `Nothing is due. A purchase today stays interest-free for ${prof.interestFreeDays} days.`;
}

/* ------------------------------------------------------------------ */

function SpendSplit({ id, split }: { id: CardId; split: Partial<Record<SpendCategory, number>> }) {
  const prof = CARD_PROFILES[id];
  const rows = CATEGORY_ORDER.filter((c) => (split[c] ?? 0) > 0).map((c) => ({ c, amount: split[c]!, rate: prof.rates[c] }));
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const zero = rows.filter((r) => r.rate === 0).map((r) => r.c);
  const note =
    total === 0
      ? 'No unbilled spends this cycle yet.'
      : zero.length === rows.length
        ? 'Nothing here earns rewards on this card. Spends like these belong on another card.'
        : zero.length
          ? `${zero.join(' and ')} earn${zero.length === 1 ? 's' : ''} 0% on this card. Move ${zero.length === 1 ? 'it' : 'them'} to a card that pays.`
          : 'Every category is earning on this card.';
  return (
    <Section icon={<PieChart size={15} />} title="Spend split (this cycle)" note={note}>
      {total === 0 ? (
        <p className="text-[11.5px] text-slate-500">No spends yet.</p>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={rows.map((r) => `${r.c} ${formatINR(r.amount)}`).join(', ')}>
            {rows.map((r) => (
              <div key={r.c} className="h-full transition-all duration-700" style={{ width: `${(r.amount / total) * 100}%`, background: CATEGORY_COLOR[r.c] }} />
            ))}
          </div>
          <table className="mt-2.5 w-full text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide text-slate-400">
                <th className="pb-1 font-semibold">Category</th>
                <th className="pb-1 text-right font-semibold">Spent</th>
                <th className="pb-1 text-right font-semibold">Rate</th>
                <th className="pb-1 text-right font-semibold">Earned</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {rows.map((r) => (
                <tr key={r.c}>
                  <td className="py-0.5">
                    <span className="flex items-center gap-1.5 font-semibold text-[#002E6E]">
                      <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLOR[r.c] }} />
                      {r.c}
                    </span>
                  </td>
                  <td className="py-0.5 text-right text-[#002E6E]">{formatINR(r.amount)}</td>
                  <td className={`py-0.5 text-right ${r.rate ? 'text-slate-500' : 'font-bold text-[#EC184A]'}`}>{(r.rate * 100).toFixed(r.rate * 100 % 1 ? 1 : 0)}%</td>
                  <td className="py-0.5 text-right text-[#15803D]">{formatINR(r.amount * r.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Section>
  );
}

function Caps({ id }: { id: CardId }) {
  const { state } = useApp();
  const card = CARDS[id];
  const live = state.cards[id];
  const capped = card.rules.filter((r) => r.monthlyCap);
  const resetLabel = card.capCycle === 'Calendar Month' ? 'Calendar month • resets 1 Apr' : `Statement cycle • resets ${CARD_PROFILES[id].cycle.end}`;
  const note =
    id === 'hdfcSelect'
      ? 'Once a cap fills, those spends drop to 1%. CardSense routes them to another card until the reset.'
      : card.exclusions.length
        ? `Avoid this card for ${card.exclusions.map((e) => e.label.toLowerCase()).join(', ')}: they earn nothing.`
        : 'No caps or exclusions to plan around on this card.';
  return (
    <Section icon={<BadgePercent size={15} />} title="Caps & exclusions" note={note}>
      {capped.length > 0 ? (
        <div className="space-y-2.5">
          {capped.map((r) => {
            const used = id === 'hdfcSelect' && r.id === 'utilRecharge' ? utilityCapStatus(state.cards).used : (live.capUsed[r.id] ?? 0);
            const p = pct(used, r.monthlyCap!);
            return (
              <div key={r.id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-[#002E6E]">{r.label}</span>
                  <span className="tabular shrink-0 text-slate-500">
                    {formatINR(used)} / {formatINR(r.monthlyCap!)}
                  </span>
                </div>
                <Meter max={r.monthlyCap!} segments={[{ value: used, tone: p >= 90 ? 'crimson' : 'cyan' }]} />
                <p className="mt-0.5 text-[10px] text-slate-400">{resetLabel}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11.5px] text-slate-600">
          No category caps. {card.baseNote}. <span className="text-slate-400">({resetLabel})</span>
        </p>
      )}
      {card.offers.length > 0 && (
        <p className="mt-2 rounded-lg bg-[#D97706]/10 px-2.5 py-1.5 text-[10.5px] font-semibold text-[#B45309]">
          Flight offer: 12% capped at ₹5,000 per booking, min ₹10,000 • demo offer data
        </p>
      )}
      {card.exclusions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {card.exclusions.map((e) => (
            <Badge key={e.mcc} tone="crimson">
              0% {e.label} {e.mcc}
            </Badge>
          ))}
        </div>
      )}
    </Section>
  );
}

function Expiring({ id }: { id: CardId }) {
  const { state } = useApp();
  const prof = CARD_PROFILES[id];
  const vouchers = state.vouchers.filter((v) => v.cardId === id).sort((a, b) => a.expiresInDays - b.expiresInDays);
  if (!prof.rewards.expiring && vouchers.length === 0) return <p className="mt-2 text-[10.5px] text-slate-500">Nothing expiring.</p>;
  return (
    <ul className="mt-2 space-y-1">
      {prof.rewards.expiring && (
        <li className="flex justify-between gap-2 rounded-lg bg-[#D97706]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#B45309]">
          <span>
            {prof.rewards.expiring.units.toLocaleString('en-IN')} {prof.rewards.unit} expire {prof.rewards.expiring.date}
          </span>
          <span className="tabular">{formatINR(prof.rewards.expiring.units * prof.rewards.rupeePerUnit)}</span>
        </li>
      )}
      {vouchers.map((v) => (
        <li key={v.id} className={`flex justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${v.expiresInDays <= 7 ? 'bg-[#EC184A]/10 text-[#C8103C]' : 'bg-slate-100 text-slate-600'}`}>
          <span className="truncate">
            {v.title} • {v.expiresInDays} days left
          </span>
          <span className="tabular shrink-0">{v.value}</span>
        </li>
      ))}
    </ul>
  );
}

function Milestones({ id }: { id: CardId }) {
  const { state, dispatch } = useApp();
  if (id === 'dinersBlack') {
    const d = dinersStatus(state.cards);
    return (
      <Section
        icon={<Trophy size={15} />}
        title="Milestones & lounge"
        note={d.unlocked ? 'Milestone done: your ₹10,000 voucher is in the Vault.' : 'Only settled spends count. A swipe on 31 Mar may settle in April and miss the quarter.'}
      >
        <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
          <span className="font-semibold text-[#002E6E]">Q4 milestone • ₹10,000 voucher</span>
          <span className="tabular shrink-0 text-slate-500">
            {formatINR(d.settled + d.pending)} / {formatINR(d.target)}
          </span>
        </div>
        <Meter
          max={d.target}
          segments={[
            { value: d.settled, tone: d.unlocked ? 'emerald' : 'navy' },
            { value: d.pending, tone: 'amber', striped: true },
          ]}
        />
        <p className="mt-1 text-[10px] text-slate-400">Counts on merchant settlement date (T+1 to T+3), not swipe date • quarter ends 31 Mar</p>
        {d.unlocked && (
          <PrimaryButton tone="emerald" className="mt-2 w-full" onClick={() => goVault(dispatch)}>
            View voucher in Vault
          </PrimaryButton>
        )}
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600">
          <Armchair size={13} className="text-[#0089B3]" /> Unlimited airport lounge access, no spend gate.
        </p>
      </Section>
    );
  }
  if (id === 'scapia') {
    const gate = CARDS.scapia.loungeGate!;
    const spend = state.cards.scapia.monthSpend;
    const short = Math.max(0, gate.monthlyTarget - spend);
    return (
      <Section
        icon={<Armchair size={15} />}
        title="Milestones & lounge"
        note={short ? `${formatINR(short)} more eligible spend by 31 Mar unlocks lounge access for all of April.` : 'April lounge access is unlocked.'}
      >
        <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
          <span className="font-semibold text-[#002E6E]">Lounge gate • March</span>
          <span className="tabular shrink-0 text-slate-500">
            {formatINR(spend)} / {formatINR(gate.monthlyTarget)}
          </span>
        </div>
        <Meter max={gate.monthlyTarget} segments={[{ value: spend, tone: short ? 'cyan' : 'emerald' }]} />
        <p className="mt-1 text-[10px] text-slate-400">
          {gate.perk} • {CARDS.scapia.exclusions.map((e) => e.label.toLowerCase()).join(', ')} don't count
        </p>
      </Section>
    );
  }
  if (id === 'hdfcSelect')
    return (
      <Section icon={<Trophy size={15} />} title="Milestones & lounge" note="No milestone to chase on this card this quarter.">
        <p className="text-[11.5px] text-slate-600">Q4 spend milestone already earned: ₹500 Uber / BookMyShow voucher (in Vault). No lounge benefit.</p>
      </Section>
    );
  return (
    <Section icon={<Trophy size={15} />} title="Milestones & lounge" note="This card has no milestones or lounge benefits.">
      <p className="text-[11.5px] text-slate-600">No spend milestones. Lounge access needs the paid LIT add-on.</p>
    </Section>
  );
}

function Fees({ id }: { id: CardId }) {
  const { state } = useApp();
  const prof = CARD_PROFILES[id];
  const live = state.cards[id];
  const waiver = prof.fees.waiver;
  const yearSpend = waiver ? waiver.seedYearSpend + (live.unbilled - initialLiveCards[id].unbilled) : 0;
  const due = id === 'hdfcSelect' ? live.statementDue : 0;
  const slab = due > 0 ? LATE_FEE_SLABS.find((s) => due <= s.upTo) : undefined;
  const note = slab
    ? `Late fee is ₹0 until ${prof.lastStatement.graceUntil}. After that it is ${formatINR(slab.fee)} on a ${formatINR(due)} statement.`
    : waiver
      ? yearSpend >= waiver.threshold
        ? 'Fee waiver reached for this card year.'
        : `Spend ${formatINR(waiver.threshold - yearSpend)} more before ${prof.fees.renews} and the ${formatINR(prof.fees.annual)} fee is reversed.`
      : 'No annual fee on this card.';
  return (
    <Section icon={<CircleDollarSign size={15} />} title="Fees" note={note}>
      <KV rows={[['Annual fee', prof.fees.annual ? `${formatINR(prof.fees.annual)} + GST` : '₹0 • lifetime free'], ['Renews', prof.fees.renews]]} />
      {waiver && (
        <div className="mt-2">
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="font-semibold text-[#002E6E]">Fee waiver progress</span>
            <span className="tabular text-slate-500">
              {formatINR(yearSpend)} / {formatINR(waiver.threshold)}
            </span>
          </div>
          <Meter max={waiver.threshold} segments={[{ value: yearSpend, tone: yearSpend >= waiver.threshold ? 'emerald' : 'navy' }]} />
          <p className="mt-0.5 text-[10px] text-slate-400">{prof.fees.note}</p>
        </div>
      )}
      <details className="mt-2 text-[11px]">
        <summary className="cursor-pointer font-semibold text-[#0089B3]">Late-fee slabs (after the 3-day grace)</summary>
        <table className="mt-1 w-full">
          <tbody className="tabular">
            {LATE_FEE_SLABS.map((s) => (
              <tr key={s.label} className={slab === s ? 'font-bold text-[#B45309]' : 'text-slate-600'}>
                <td className="py-0.5">{s.label}</td>
                <td className="py-0.5 text-right">{formatINR(s.fee)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Section>
  );
}

/* ------------------------------------------------------------------ */

function Section({ icon, title, note, children }: { icon: ReactNode; title: string; note: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5">
      <h3 className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold text-[#002E6E]">
        <span className="text-[#00B9F1]">{icon}</span> {title}
      </h3>
      {children}
      <p className="mt-3 rounded-lg bg-[#00B9F1]/[0.08] px-2.5 py-1.5 text-[10.5px] leading-snug text-[#0B4A6F]">
        <b>What this means for you:</b> {note}
      </p>
    </section>
  );
}

function KV({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="divide-y divide-[#F1F5F9]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-3 py-1.5 text-[11.5px]">
          <dt className="text-slate-500">{k}</dt>
          <dd className="tabular text-right font-semibold text-[#002E6E]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Stat({ label, value, sub, tone = 'text-[#002E6E]' }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-[#F4F7FA] px-2 py-2 text-center">
      <p className="text-[9.5px] text-slate-500">{label}</p>
      <p className={`tabular text-[13.5px] font-extrabold ${tone}`}>{value}</p>
      {sub && <p className="text-[9.5px] text-slate-400">{sub}</p>}
    </div>
  );
}
