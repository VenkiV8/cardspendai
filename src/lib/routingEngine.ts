/**
 * Deterministic pre-swipe routing engine.
 *
 * Pure functions only: given a transaction and the live card state, it evaluates every
 * instrument with the issuer rule book (MCC exclusions → accelerated rules with
 * calendar-month caps → base rate → instant offers) and ranks by net rupee value.
 * There is deliberately NO co-brand weighting term — ranking is value-only.
 */
import {
  CARDS,
  CARD_ORDER,
  type CardId,
  type Channel,
  type InstrumentId,
  type LiveCards,
  USER,
} from '../data/cardsData';
import { formatINR } from './format';

export const ROUTING_LATENCY_MS = 38;
export const CO_BRAND_BIAS_WEIGHT = 0;

export interface Transaction {
  amount: number;
  mcc: number;
  channel: Channel;
}

export interface Note {
  tone: 'crimson' | 'emerald' | 'amber' | 'cyan';
  text: string;
}

export interface RouteResult {
  instrument: InstrumentId;
  label: string;
  sublabel: string;
  eligible: boolean;
  ineligibleReason?: string;
  reward: number;
  discount: number;
  totalValue: number;
  payable: number;
  lines: string[];
  notes: Note[];
  capConsumption?: { ruleId: string; amount: number };
  countsTowardLounge: boolean;
}

export interface RoutingDecision {
  results: RouteResult[];
  ranked: RouteResult[];
  best: RouteResult;
  latencyMs: number;
}

export function instrumentLabel(id: InstrumentId): { label: string; sublabel: string } {
  if (id === 'hdfcUpi') {
    return { label: 'HDFC Savings UPI', sublabel: `${USER.upiId} • A/c XX8821` };
  }
  const c = CARDS[id];
  return {
    label: `${c.shortName} (${c.last4})`,
    sublabel: id === 'scapia' ? `RuPay Credit on UPI ${c.upiHandle} • ${c.network}` : `${c.network} • Tokenised on Paytm`,
  };
}

/** Instruments the user could pick on a given rail. */
export function instrumentsForChannel(channel: Channel): InstrumentId[] {
  const cards = CARD_ORDER.filter((id) => {
    if (channel === 'upiQr') return id === 'scapia'; // only RuPay credit cards ride UPI
    return true;
  });
  return ['hdfcUpi', ...cards];
}

function evaluateCard(cardId: CardId, txn: Transaction, live: LiveCards): RouteResult {
  const card = CARDS[cardId];
  const state = live[cardId];
  const { label, sublabel } = instrumentLabel(cardId);
  const base: RouteResult = {
    instrument: cardId,
    label,
    sublabel,
    eligible: true,
    reward: 0,
    discount: 0,
    totalValue: 0,
    payable: txn.amount,
    lines: [],
    notes: [],
    countsTowardLounge: false,
  };

  if (!card.channels.includes(txn.channel)) {
    return {
      ...base,
      eligible: false,
      ineligibleReason:
        card.network === 'Diners'
          ? 'Diners network not tokenised on this Paytm rail'
          : 'Card not accepted on this rail',
    };
  }

  const exclusion = card.exclusions.find((e) => e.mcc === txn.mcc);
  if (exclusion) {
    base.lines.push(`MCC ${txn.mcc} (${exclusion.label}) excluded → 0% earn [${exclusion.source}]`);
    base.notes.push({
      tone: 'crimson',
      text: `0% Rewards Alert: ${card.shortName} excludes ${exclusion.label} MCC ${txn.mcc}.`,
    });
  } else {
    const rule = card.rules.find(
      (r) => (!r.mccs || r.mccs.includes(txn.mcc)) && (!r.channels || r.channels.includes(txn.channel)),
    );
    if (rule) {
      const used = state.capUsed[rule.id] ?? 0;
      const cap = rule.monthlyCap ?? Number.POSITIVE_INFINITY;
      const remaining = Math.max(0, cap - used);
      const accelerated = Math.min(txn.amount * rule.rate, remaining);
      const acceleratedSpend = accelerated / rule.rate;
      const overflowSpend = txn.amount - acceleratedSpend;
      const overflowReward = overflowSpend * card.baseRate;
      base.reward = accelerated + overflowReward;
      base.capConsumption = { ruleId: rule.id, amount: accelerated };
      if (acceleratedSpend > 0) {
        base.lines.push(
          `${formatINR(acceleratedSpend)} @ ${(rule.rate * 100).toFixed(0)}% (remaining ${card.capCycle.toLowerCase()} cap) = ${formatINR(accelerated)}`,
        );
      }
      if (overflowSpend > 0.5) {
        base.lines.push(
          `${formatINR(overflowSpend)} @ ${(card.baseRate * 100).toFixed(0)}% base (cap overflow) = ${formatINR(overflowReward)}`,
        );
      }
      if (Number.isFinite(cap)) {
        const after = used + accelerated;
        base.notes.push({
          tone: after >= cap ? 'amber' : 'cyan',
          text:
            after >= cap
              ? `${rule.label.split(' on ')[0]} cap exhausted for March after this (${formatINR(after)} / ${formatINR(cap)}).`
              : `${formatINR(cap - after)} of ${formatINR(cap)} monthly cap left after this payment.`,
        });
      }
    } else if (card.baseRate > 0 && txn.amount >= (card.baseMinTxn ?? 0)) {
      base.reward = txn.amount * card.baseRate;
      base.lines.push(`${formatINR(txn.amount)} @ ${(card.baseRate * 100).toFixed(card.baseRate * 100 % 1 ? 1 : 0)}% base = ${formatINR(base.reward)}`);
    } else if (card.baseRate === 0) {
      base.lines.push(card.baseNote);
    } else {
      base.lines.push(`Below ₹${card.baseMinTxn} minimum for rewards`);
    }
    base.countsTowardLounge = Boolean(card.loungeGate);
  }

  for (const offer of card.offers) {
    if (!offer.mccs.includes(txn.mcc) || !offer.channels.includes(txn.channel)) continue;
    if (txn.amount < offer.minTxn) {
      base.lines.push(`${offer.label}: min ₹${offer.minTxn.toLocaleString('en-IN')} not met`);
      continue;
    }
    const raw = offer.kind === 'percent' ? txn.amount * offer.value : offer.value;
    const discount = Math.min(raw, offer.maxDiscount ?? raw);
    base.discount += discount;
    base.lines.push(
      offer.kind === 'percent'
        ? `${(offer.value * 100).toFixed(0)}% instant discount (max ${formatINR(offer.maxDiscount ?? raw)}) = −${formatINR(discount)}`
        : `${offer.label} = −${formatINR(discount)}`,
    );
  }

  if (cardId === 'scapia' && base.countsTowardLounge && card.loungeGate) {
    const target = card.loungeGate.monthlyTarget;
    const before = state.monthSpend;
    const after = before + txn.amount;
    const gapBefore = Math.max(0, target - before);
    const closed = gapBefore > 0 ? Math.min(100, Math.round((txn.amount / gapBefore) * 100)) : 100;
    base.notes.push({
      tone: 'emerald',
      text:
        after >= target
          ? `Unlocks next month's unlimited airport lounge access (${formatINR(after)} / ${formatINR(target)}).`
          : `Lounge progress → ${formatINR(after)} / ${formatINR(target)} (${closed}% of the gap closed).`,
    });
  }

  if (cardId === 'scapia' && txn.channel === 'upiQr') {
    base.notes.push({
      tone: 'cyan',
      text: `₹0 fee for you • merchant MDR applies on RuPay credit-on-UPI P2M above ₹2,000.`,
    });
  }

  base.totalValue = base.reward + base.discount;
  base.payable = txn.amount - base.discount;
  return base;
}

function evaluateUpi(txn: Transaction): RouteResult {
  const { label, sublabel } = instrumentLabel('hdfcUpi');
  return {
    instrument: 'hdfcUpi',
    label,
    sublabel,
    eligible: true,
    reward: 0,
    discount: 0,
    totalValue: 0,
    payable: txn.amount,
    lines: ['Savings-account UPI earns no rewards'],
    notes: [{ tone: 'amber', text: 'Debits savings directly — no rewards, no interest-free credit period.' }],
    countsTowardLounge: false,
  };
}

export function evaluate(instrument: InstrumentId, txn: Transaction, live: LiveCards): RouteResult {
  if (instrument === 'hdfcUpi') return evaluateUpi(txn);
  return evaluateCard(instrument, txn, live);
}

export function routeTransaction(txn: Transaction, live: LiveCards): RoutingDecision {
  const results = instrumentsForChannel(txn.channel).map((id) => evaluate(id, txn, live));
  const ranked = results
    .filter((r) => r.eligible)
    // Value-only ranking. Tie-breaker: strategic progress (lounge gate), never co-brand status.
    .sort((a, b) => b.totalValue - a.totalValue || Number(b.countsTowardLounge) - Number(a.countsTowardLounge));
  return { results, ranked, best: ranked[0], latencyMs: ROUTING_LATENCY_MS };
}

/* ------------------------------------------------------------------ */
/* Portfolio math                                                      */
/* ------------------------------------------------------------------ */

export function totalLiability(live: LiveCards): number {
  return CARD_ORDER.reduce((sum, id) => sum + live[id].unbilled, 0);
}

export function utilityCapStatus(live: LiveCards) {
  const rule = CARDS.hdfcSelect.rules.find((r) => r.id === 'utilRecharge')!;
  const cap = rule.monthlyCap ?? 0;
  const used = live.hdfcSelect.capUsed[rule.id] ?? 0;
  const remaining = Math.max(0, cap - used);
  return {
    cap,
    used,
    remaining,
    remainingSpend: Math.round(remaining / rule.rate),
    saturationSpend: Math.round(cap / rule.rate),
    pct: cap ? (used / cap) * 100 : 0,
  };
}

export function dinersStatus(live: LiveCards) {
  const m = CARDS.dinersBlack.milestone!;
  const s = live.dinersBlack;
  const gap = Math.max(0, m.target - s.settled - s.pending);
  return {
    target: m.target,
    settled: s.settled,
    pending: s.pending,
    gap,
    settledGap: Math.max(0, m.target - s.settled),
    unlocked: s.settled >= m.target,
    reward: m.reward,
  };
}
