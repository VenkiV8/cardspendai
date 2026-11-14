import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Landmark,
  Loader2,
  Plane,
  RotateCcw,
  ScanLine,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTourTarget } from '../components/Tour';
import { Badge, Card, CardArt, PHONE_PORTAL_ID, PrimaryButton, Sheet } from '../components/ui';
import { CARDS, DEMO_OFFER_NOTE, SCENARIOS, SCENARIO_ORDER, type InstrumentId, type ScenarioId } from '../data/cardsData';
import { formatINR } from '../lib/format';
import { INSTRUMENT_COUNT_LABEL, evaluate, formatMs, routeTransaction, type Note, type RouteResult } from '../lib/routingEngine';
import { sessionSaved, useApp } from '../state/appState';

const SCENARIO_ICON: Record<ScenarioId, typeof Zap> = { A: Zap, B: ScanLine, C: Plane };


export function CheckoutScreen() {
  const { state, dispatch } = useApp();
  const sc = SCENARIOS[state.scenario];
  const txn = useMemo(() => ({ amount: sc.amount, mcc: sc.mcc, channel: sc.channel }), [sc]);
  const decision = useMemo(() => routeTransaction(txn, state.cards), [txn, state.cards]);
  const selectedId = state.selection[sc.id];
  const selected = useMemo(() => evaluate(selectedId, txn, state.cards), [selectedId, txn, state.cards]);
  const isDefault = selectedId === sc.defaultInstrument;
  const recommendations = decision.ranked.filter((r) => r.instrument !== selectedId && r.totalValue > selected.totalValue).slice(0, 2);
  const paid = state.paid[sc.id];

  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<RouteResult | null>(null);
  const [picker, setPicker] = useState(false);
  const [delta, setDelta] = useState<{ key: number; amount: number } | null>(null);
  const deltaTimer = useRef<number | undefined>(undefined);
  const switchTour = useTourTarget('switch');

  useEffect(() => () => window.clearTimeout(deltaTimer.current), []);

  const apply = (r: RouteResult) => {
    const gain = r.totalValue - selected.totalValue;
    dispatch({ type: 'APPLY_SWITCH', scenario: sc.id, result: r });
    if (gain > 0.5) {
      window.clearTimeout(deltaTimer.current);
      setDelta({ key: Date.now(), amount: gain });
      deltaTimer.current = window.setTimeout(() => setDelta(null), 2200);
    }
  };

  const pay = () => {
    setPaying(true);
    const snapshot = selected;
    window.setTimeout(() => {
      dispatch({ type: 'PAY_SCENARIO', scenario: sc.id, result: snapshot });
      setPaying(false);
      setReceipt(snapshot);
    }, 1400);
  };

  const Icon = SCENARIO_ICON[sc.id];

  return (
    <div className="space-y-4 px-4 pb-6 pt-4">
      {/* Session counter */}
      <div className="relative flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#16A34A] to-[#22C55E] px-4 py-3 text-white shadow-sm">
        {delta && <DeltaChip key={delta.key} amount={delta.amount} />}
        <div className="flex items-center gap-2">
          <TrendingUp size={18} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80">Total Rewards Saved This Session</p>
            <p key={sessionSaved(state)} className="tabular text-[22px] font-extrabold leading-tight animate-pop">
              {formatINR(sessionSaved(state))}
            </p>
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-white/20 px-2 py-1 text-[10px] font-bold">via CardSense</span>
      </div>

      {/* Scenario segmented control: three equal segments, nothing clips */}
      <div role="tablist" aria-label="Checkout scenario" className="grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 shadow-[inset_0_0_0_1px_#E2E8F0]">
        {SCENARIO_ORDER.map((id) => {
          const s = SCENARIOS[id];
          const I = SCENARIO_ICON[id];
          const active = id === sc.id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => dispatch({ type: 'SET_SCENARIO', scenario: id })}
              className={`flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition ${active ? 'bg-[#002E6E] text-white shadow-sm' : 'text-[#002E6E] hover:bg-[#F4F7FA]'}`}
            >
              <span className="flex items-center gap-1 text-[11px] font-extrabold">
                <I size={12} className={active ? 'text-[#00B9F1]' : 'text-[#0089B3]'} /> {id}
                {state.paid[id] && <CheckCircle2 size={11} className="text-[#16A34A]" />}
              </span>
              <span className={`w-full truncate text-center text-[10px] font-semibold ${active ? 'text-white/80' : 'text-slate-500'}`}>{s.pill}</span>
            </button>
          );
        })}
      </div>

      {/* Paytm payment sheet */}
      <Card key={sc.id} className="overflow-hidden shadow-sm animate-fadeIn">
        <div className="bg-[#002E6E] px-4 py-3 text-white">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7FDBFF]">Paytm Payment Sheet</p>
            <Badge tone="cyan" className="!border-white/20 !bg-white/10 !text-white">
              MCC {sc.mcc} • {sc.category}
            </Badge>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <Icon size={22} className="text-[#00B9F1]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold">{sc.merchant}</p>
              <p className="truncate text-[10.5px] text-white/65">{sc.subtitle}</p>
            </div>
            <p className="tabular text-[20px] font-extrabold">{formatINR(sc.amount)}</p>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Pay using</p>
              {!paid && (
                <button onClick={() => setPicker(true)} className="flex items-center text-[11px] font-bold text-[#00B9F1]">
                  Change <ChevronRight size={13} />
                </button>
              )}
            </div>
            <InstrumentRow result={selected} active badge={isDefault ? 'Pre-selected' : 'CardSense pick'} />
          </div>

          {/* Inline CardSense nudge */}
          {!paid && (
            <div className="rounded-2xl border border-[#00B9F1]/30 bg-gradient-to-b from-[#00B9F1]/10 to-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1 text-[11px] font-extrabold text-[#002E6E]">
                  <Sparkles size={13} className="text-[#00B9F1]" /> CardSense Pre-Swipe Check
                </p>
                <span className="flex items-center gap-1 rounded-full bg-[#002E6E] px-2 py-0.5 text-[9.5px] font-bold text-white">
                  <Cpu size={10} /> {formatMs(decision.computeMs)} on-device match
                </span>
              </div>

              <div className="space-y-1.5">
                {selected.notes
                  .filter((n) => n.tone === 'crimson' || (n.tone === 'amber' && selected.totalValue === 0))
                  .map((n) => (
                    <NotePill key={n.text} note={n} />
                  ))}
                {recommendations.length > 0 && (
                  <NotePill
                    note={{
                      tone: recommendations[0].discount > 0 ? 'emerald' : 'cyan',
                      text: nudgeCopy(sc.id, selected, recommendations[0]),
                    }}
                  />
                )}
                {recommendations.length === 0 && (
                  <NotePill note={{ tone: 'emerald', text: `Optimal: ${selected.label} already earns the highest net value for this payment.` }} />
                )}
              </div>

              {recommendations.length > 0 && (
                <div className="mt-3 space-y-2">
                  {recommendations.map((r, i) => (
                    <div key={r.instrument} ref={i === 0 ? switchTour.ref : undefined} className={i === 0 ? switchTour.className : ''}>
                      <RecommendationCard rank={i + 1} result={r} baseline={selected.totalValue} onApply={() => apply(r)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F4F7FA] p-3">
            <SummaryRow k="Order amount" v={formatINR(sc.amount)} />
            {selected.discount > 0 && <SummaryRow k="CardSense instant discount" v={`−${formatINR(selected.discount)}`} tone="text-[#16A34A]" />}
            <SummaryRow k="Rewards earned" v={selected.reward > 0 ? formatINR(selected.reward) : '₹0'} tone={selected.reward > 0 ? 'text-[#16A34A]' : 'text-slate-400'} />
            <div className="my-1.5 border-t border-dashed border-slate-300" />
            <SummaryRow k="Total payable" v={formatINR(selected.payable)} bold />
            <details className="mt-1.5 text-[10.5px] text-slate-500">
              <summary className="cursor-pointer font-semibold text-[#0089B3]">Why this card? (rule-engine math)</summary>
              <ul className="mt-1 space-y-0.5 pl-1">
                {selected.lines.map((l) => (
                  <li key={l}>• {l}</li>
                ))}
              </ul>
              <p className="mt-2 font-bold uppercase tracking-wide text-slate-400">
                {decision.results.length} instruments evaluated ({INSTRUMENT_COUNT_LABEL})
              </p>
              <ol className="mt-1 space-y-0.5">
                {[...decision.results]
                  .sort((x, y) => Number(y.eligible) - Number(x.eligible) || y.totalValue - x.totalValue)
                  .map((r) => (
                    <li key={r.instrument} className="flex items-center justify-between gap-2">
                      <span className={`truncate ${r.instrument === selectedId ? 'font-bold text-[#002E6E]' : ''}`}>
                        {r.label}
                        {r.instrument === selectedId ? ' • selected' : ''}
                      </span>
                      <span className={`tabular shrink-0 ${r.eligible ? 'font-semibold text-[#002E6E]' : 'text-slate-400'}`}>
                        {r.eligible ? formatINR(r.totalValue) : r.ineligibleReason}
                      </span>
                    </li>
                  ))}
              </ol>
            </details>
            {selected.discount > 0 && <p className="mt-1.5 text-[10px] font-semibold text-[#B45309]">{DEMO_OFFER_NOTE}</p>}
          </div>

          {paid ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl bg-[#16A34A]/10 px-3 py-2.5 text-[12px] font-semibold text-[#15803D]">
                <CheckCircle2 size={16} /> Paid {formatINR(selected.payable)} via {selected.label}
              </div>
              <PrimaryButton tone="navy" className="w-full" onClick={() => dispatch({ type: 'NEW_PAYMENT', scenario: sc.id })}>
                <RotateCcw size={13} /> Run this checkout again (live caps)
              </PrimaryButton>
            </div>
          ) : (
            <PrimaryButton className="w-full py-3 text-[14px]" onClick={pay} disabled={paying}>
              {paying ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Processing via Paytm…
                </>
              ) : (
                <>
                  Pay {formatINR(selected.payable)} <ArrowRight size={15} />
                </>
              )}
            </PrimaryButton>
          )}
        </div>
      </Card>

      <p className="px-1 text-center text-[10px] text-slate-400">
        Ranking is value-only • co-brand weight 0.00 • {decision.results.length} instruments evaluated ({INSTRUMENT_COUNT_LABEL})
      </p>

      {/* Instrument picker */}
      <Sheet open={picker} onClose={() => setPicker(false)} title="Choose payment method">
        <div className="space-y-2">
          {decision.results.map((r) => (
            <button
              key={r.instrument}
              disabled={!r.eligible}
              onClick={() => {
                apply(r);
                setPicker(false);
              }}
              className="block w-full text-left disabled:opacity-50"
            >
              <InstrumentRow result={r} active={r.instrument === selectedId} badge={r.instrument === decision.best.instrument ? 'Best value' : undefined} />
            </button>
          ))}
        </div>
      </Sheet>

      {/* Receipt */}
      <Sheet open={receipt !== null} onClose={() => setReceipt(null)}>
        {receipt && <Receipt result={receipt} scenarioId={sc.id} onClose={() => setReceipt(null)} />}
      </Sheet>
    </div>
  );
}

/** Floats over the phone screen (not the scrolled counter) so the gain is seen wherever the user tapped. */
function DeltaChip({ amount }: { amount: number }) {
  const chip = (
    <div className="pointer-events-none absolute inset-x-0 top-[132px] z-40 flex justify-center">
      <span role="status" className="tabular flex items-center gap-1.5 rounded-full bg-[#16A34A] px-4 py-2 text-[14px] font-extrabold text-white shadow-xl motion-safe:animate-floatUp">
        <TrendingUp size={15} /> +{formatINR(amount)} saved
      </span>
    </div>
  );
  const target = document.getElementById(PHONE_PORTAL_ID);
  return target ? createPortal(chip, target) : chip;
}

function nudgeCopy(id: ScenarioId, from: RouteResult, to: RouteResult): string {
  const delta = to.totalValue - from.totalValue;
  if (id === 'B' && to.instrument === 'scapia') {
    const lounge = to.notes.find((n) => n.text.startsWith('Lounge') || n.text.startsWith('Unlocks'));
    return `Switch to linked Scapia RuPay CC on UPI → Earn ${formatINR(to.reward)} rewards${lounge ? ` AND push ${lounge.text.charAt(0).toLowerCase()}${lounge.text.slice(1)}` : ''}`;
  }
  if (to.discount > 0 && id === 'C') {
    return `Best Value: Switch to saved ${to.label} → Unlock ${formatINR(to.discount)} instant Paytm Flight discount (+${formatINR(delta)} vs. ${from.label.split(' (')[0]}).`;
  }
  return `Switch to ${to.label} → ${formatINR(to.totalValue)} value (+${formatINR(delta)} more than current method).`;
}

function NotePill({ note }: { note: Note }) {
  const styles: Record<Note['tone'], string> = {
    crimson: 'bg-[#EC184A]/10 text-[#B3123A] border-[#EC184A]/25',
    emerald: 'bg-[#16A34A]/10 text-[#15803D] border-[#16A34A]/25',
    amber: 'bg-[#D97706]/10 text-[#B45309] border-[#D97706]/25',
    cyan: 'bg-[#00B9F1]/10 text-[#0077A0] border-[#00B9F1]/25',
  };
  return <div className={`rounded-xl border px-2.5 py-1.5 text-[11.5px] font-semibold leading-snug ${styles[note.tone]}`}>{note.text}</div>;
}

function InstrumentVisual({ id }: { id: InstrumentId }) {
  if (id === 'hdfcUpi') {
    return (
      <div className="flex h-9 w-14 shrink-0 items-center justify-center rounded-lg bg-[#F4F7FA] text-[#002E6E]">
        <Landmark size={18} />
      </div>
    );
  }
  return <CardArt card={CARDS[id]} compact />;
}

function InstrumentRow({ result, active, badge }: { result: RouteResult; active?: boolean; badge?: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-2.5 ${active ? 'border-[#00B9F1] bg-[#00B9F1]/5' : 'border-[#E2E8F0] bg-white'}`}>
      <InstrumentVisual id={result.instrument} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-bold text-[#002E6E]">{result.label}</p>
        <p className="truncate text-[10.5px] text-slate-500">{result.eligible ? result.sublabel : result.ineligibleReason}</p>
        {badge && (
          <Badge tone={badge === 'Pre-selected' ? 'slate' : 'emerald'} className="mt-1">
            {badge}
          </Badge>
        )}
      </div>
      <div className="text-right">
        <p className={`tabular text-[13px] font-extrabold ${result.totalValue > 0 ? 'text-[#16A34A]' : 'text-slate-400'}`}>
          {result.eligible ? formatINR(result.totalValue) : '—'}
        </p>
        <p className="text-[9px] text-slate-400">value</p>
      </div>
    </div>
  );
}

function RecommendationCard({ rank, result, baseline, onApply }: { rank: number; result: RouteResult; baseline: number; onApply: () => void }) {
  const detail = result.discount > 0 ? `${formatINR(result.discount)} instant discount` : result.lines.join(' + ');
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-[0_1px_0_rgba(0,46,110,0.04)]">
      <div className="flex items-center gap-3">
        <InstrumentVisual id={result.instrument} />
        <div className="min-w-0 flex-1">
          <p className="text-[9.5px] font-bold uppercase tracking-wide text-slate-400">Recommended option {rank}</p>
          <p className="truncate text-[12.5px] font-bold text-[#002E6E]">{result.label}</p>
        </div>
        <div className="text-right">
          <p className="tabular text-[15px] font-extrabold text-[#16A34A]">{formatINR(result.totalValue)}</p>
          <p className="text-[9.5px] font-semibold text-[#16A34A]">+{formatINR(result.totalValue - baseline)}</p>
        </div>
      </div>
      <p className="mt-2 text-[10.5px] leading-snug text-slate-500">
        {result.capConsumption ? 'Auto-splits cap math: ' : ''}
        {detail}
      </p>
      {result.notes
        .filter((n) => n.tone !== 'crimson')
        .slice(0, 2)
        .map((n) => (
          <p key={n.text} className="mt-1 flex items-start gap-1 text-[10.5px] leading-snug text-[#0077A0]">
            <BadgeCheck size={11} className="mt-[1px] shrink-0" /> {n.text}
          </p>
        ))}
      {result.discount > 0 && (
        <p className="mt-1.5 rounded-lg bg-[#D97706]/10 px-2 py-1 text-[10px] font-semibold leading-snug text-[#B45309]">
          <span className="mr-1 rounded bg-[#D97706] px-1 py-px text-[8.5px] font-bold uppercase text-white">Demo offer data</span>
          Offer source: illustrative Paytm × issuer promo, not a live AU Bank offer
        </p>
      )}
      <PrimaryButton className="mt-2.5 w-full" tone={rank === 1 ? 'cyan' : 'navy'} onClick={onApply}>
        Switch Card &amp; Apply
      </PrimaryButton>
    </div>
  );
}

function SummaryRow({ k, v, bold, tone = 'text-[#002E6E]' }: { k: string; v: string; bold?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-[12px] ${bold ? 'font-bold text-[#002E6E]' : 'text-slate-500'}`}>{k}</span>
      <span className={`tabular ${bold ? 'text-[16px] font-extrabold' : 'text-[12.5px] font-semibold'} ${tone}`}>{v}</span>
    </div>
  );
}

function Receipt({ result, scenarioId, onClose }: { result: RouteResult; scenarioId: ScenarioId; onClose: () => void }) {
  const sc = SCENARIOS[scenarioId];
  const ref = `PTM${scenarioId}${sc.mcc}${String(result.payable).padStart(6, '0')}`;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#16A34A] text-white animate-pop">
        <CheckCircle2 size={36} />
      </div>
      <p className="mt-3 text-[17px] font-extrabold text-[#002E6E]">Payment Successful</p>
      <p className="text-[11.5px] text-slate-500">via Paytm Multi-Bank UPI • {result.label}</p>
      <p className="tabular mt-2 text-[30px] font-extrabold text-[#002E6E]">{formatINR(result.payable)}</p>
      <p className="text-[11.5px] text-slate-500">to {sc.merchant}</p>

      {result.totalValue > 0 ? (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#16A34A]/10 px-3 py-1.5 text-[12.5px] font-extrabold text-[#15803D]">
          <Sparkles size={14} /> {formatINR(result.totalValue)} Saved via CardSense AI
        </div>
      ) : (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-slate-500">
          ₹0 rewards on this method
        </div>
      )}

      <div className="mt-4 w-full rounded-2xl border border-[#E2E8F0] p-3 text-left">
        {[
          ['Order amount', formatINR(sc.amount)],
          ['Instant discount', result.discount ? `−${formatINR(result.discount)}` : '—'],
          ['Rewards accrued', result.reward ? formatINR(result.reward) : '—'],
          ['MCC', `${sc.mcc} • ${sc.mccLabel}`],
          ['Txn ref', ref],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between py-0.5 text-[11.5px]">
            <span className="text-slate-500">{k}</span>
            <span className="tabular font-semibold text-[#002E6E]">{v}</span>
          </div>
        ))}
      </div>
      <PrimaryButton className="mt-4 w-full py-2.5" onClick={onClose}>
        Done
      </PrimaryButton>
    </div>
  );
}
