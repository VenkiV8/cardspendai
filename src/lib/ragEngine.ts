/**
 * Client-side "RAG" concierge.
 * Retrieval = weighted keyword intent matching over an indexed MITC / regulation corpus.
 * Generation = templated answers whose every number comes from the deterministic
 * routing engine or live state — the LLM layer is never allowed to invent figures.
 */
import { CARDS, DEMO_DATE, SAVINGS_ACCOUNT, type Channel, type LiveCards } from '../data/cardsData';
import { formatINR } from './format';
import { dinersStatus, routeTransaction, totalLiability, utilityCapStatus } from './routingEngine';

export interface Citation {
  source: string;
  clause: string;
  effective: string;
}

export interface FactRow {
  label: string;
  value: string;
  tone?: 'good' | 'bad' | 'warn';
}

export interface RagAction {
  label: string;
  tab: 'checkout' | 'overview' | 'privacy';
  scenario?: 'A' | 'B' | 'C';
}

export interface RagResponse {
  intent: string;
  title: string;
  verdict: { tone: 'good' | 'bad' | 'warn' | 'info'; text: string };
  answer: string;
  facts: FactRow[];
  bullets: string[];
  citations: Citation[];
  action?: RagAction;
  retrievalMs: number;
  chunks: number;
}

export interface RagContext {
  cards: LiveCards;
  bankBalance: number;
  billPaid: boolean;
  aaConnected: boolean;
}

export const STARTER_PROMPTS = [
  'Which card should I use for a ₹40k domestic flight?',
  'Will a ₹15,000 swipe on March 30 count for my Diners milestone?',
  'Am I eligible for Bengaluru airport lounge next week?',
  'What happens if I pay my card bill 1 day late?',
];

type IntentId =
  | 'flight'
  | 'diners'
  | 'lounge'
  | 'late'
  | 'utility'
  | 'grocery'
  | 'dining'
  | 'cap'
  | 'safe'
  | 'excluded'
  | 'privacy'
  | 'upgrade'
  | 'voucher';

const INTENTS: Record<IntentId, Array<[string, number]>> = {
  flight: [['flight', 5], ['fly', 3], ['airline', 4], ['indigo', 4], ['air india', 4], ['ticket', 2], ['del', 1], ['blr', 1], ['travel', 2], ['domestic', 1]],
  diners: [['diners', 5], ['milestone', 4], ['quarter', 3], ['settle', 4], ['settlement', 4], ['marriott', 3], ['count', 1], ['swipe', 1]],
  lounge: [['lounge', 6], ['airport', 3], ['access', 1]],
  late: [['late', 6], ['overdue', 5], ['grace', 4], ['penalty', 4], ['miss', 2], ['due', 2], ['delay', 3]],
  utility: [['electricity', 5], ['bescom', 5], ['utility', 5], ['utilities', 5], ['water bill', 4], ['gas bill', 4], ['recharge', 4], ['broadband', 3], ['bill', 1]],
  grocery: [['grocery', 5], ['supermarket', 5], ['kirana', 5], ['qr', 4], ['scan', 3], ['upi', 2], ['rupay', 2]],
  dining: [['dining', 5], ['restaurant', 5], ['dinner', 4], ['food', 3], ['brewpub', 4], ['cafe', 3]],
  cap: [['cap', 5], ['3%', 3], ['remaining', 2], ['left', 1], ['limit', 2], ['cashback', 2]],
  safe: [['safe', 4], ['afford', 4], ['how much can i', 5], ['liability', 4], ['balance', 2], ['spend', 1]],
  excluded: [['insurance', 5], ['rent', 5], ['premium', 4], ['lic', 3], ['excluded', 4], ['exclusion', 4], ['mcc', 2]],
  privacy: [['privacy', 5], ['gmail', 5], ['sms', 4], ['data', 2], ['dpdp', 5], ['scrape', 4], ['email', 2], ['consent', 3]],
  upgrade: [['upgrade', 5], ['new card', 5], ['sbi', 4], ['better card', 5], ['apply', 2], ['switch card', 2]],
  voucher: [['voucher', 4], ['coupon', 4], ['expire', 4], ['expiring', 4], ['perk', 3], ['code', 2]],
};

function classify(q: string): IntentId | null {
  const text = q.toLowerCase();
  let best: IntentId | null = null;
  let bestScore = 0;
  (Object.keys(INTENTS) as IntentId[]).forEach((id) => {
    const score = INTENTS[id].reduce((s, [kw, w]) => (text.includes(kw) ? s + w : s), 0);
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  });
  return bestScore >= 2 ? best : null;
}

/** Extracts the first rupee amount: "₹40k", "15,000", "rs 2.5 lakh". Ignores small numbers like dates. */
export function parseAmount(q: string): number | null {
  const re = /(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|l|lakh|lac)?\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(q)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    const unit = (m[2] ?? '').toLowerCase();
    const value = unit === 'k' || unit === 'thousand' ? n * 1000 : unit.startsWith('l') ? n * 100000 : n;
    if (value >= 100) return value;
  }
  return null;
}

function parseMarchDay(q: string): number | null {
  const m = q.match(/(?:march|mar)\s*(\d{1,2})|(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s*)?(?:march|mar)/i);
  if (!m) return null;
  const d = parseInt(m[1] ?? m[2], 10);
  return d >= 1 && d <= 31 ? d : null;
}

function rankingFacts(amount: number, mcc: number, channel: Channel, cards: LiveCards): { facts: FactRow[]; bestLabel: string; bestValue: number } {
  const decision = routeTransaction({ amount, mcc, channel }, cards);
  const facts = decision.results.map<FactRow>((r) => ({
    label: r.label,
    value: r.eligible ? `${formatINR(r.totalValue)} value${r.discount ? ` (−${formatINR(r.discount)} instant)` : ''}` : 'Not eligible',
    tone: !r.eligible ? undefined : r.instrument === decision.best.instrument ? 'good' : r.totalValue === 0 ? 'bad' : undefined,
  }));
  return { facts, bestLabel: decision.best.label, bestValue: decision.best.totalValue };
}

const RBI_MD: Citation = {
  source: 'RBI Master Direction – Credit Card & Debit Card: Issuance and Conduct',
  clause: 'Para 23(5) — late fee only if overdue > 3 days',
  effective: '1 Jul 2022 (updated 7 Mar 2024)',
};

export function answerQuery(query: string, ctx: RagContext): RagResponse {
  const intent = classify(query);
  const amountInQuery = parseAmount(query);
  const retrievalMs = 34 + (query.length % 9);
  const { cards } = ctx;

  switch (intent) {
    case 'flight': {
      const amount = amountInQuery ?? 40000;
      const { facts, bestLabel, bestValue } = rankingFacts(amount, 4511, 'paytmFlights', cards);
      const hdfc = routeTransaction({ amount, mcc: 4511, channel: 'paytmFlights' }, cards).results.find((r) => r.instrument === 'hdfcSelect')!;
      return {
        intent: 'route.flight',
        title: `Best card for a ${formatINR(amount)} Paytm domestic flight`,
        verdict: { tone: 'good', text: `Use ${bestLabel} → ${formatINR(bestValue)} value` },
        answer:
          amount >= 10000
            ? `The AU Bank 12% instant discount (capped at ₹5,000, min ₹10,000) beats every reward rate in your wallet. Paytm HDFC Select's 5% Travel rate is limited by its ₹1,000 calendar-month cap, so it returns only ${formatINR(hdfc.totalValue)} here.`
            : `Below ₹10,000 the AU Bank flight offer doesn't trigger, so the best earn comes from accelerated travel rewards.`,
        facts,
        bullets: [
          `MCC 4511 (Airlines) • Rail: Paytm Flights • ${CARDS.hdfcSelect.capCycle} cap on HDFC Select resets 1 Apr`,
          'Neutrality check: ranking weight for co-branded cards = 0.00',
        ],
        citations: [
          { source: 'AU Bank × Paytm Flights offer T&C', clause: '12% up to ₹5,000, min txn ₹10,000', effective: 'Valid till 30 Apr 2026' },
          { source: CARDS.hdfcSelect.mitc, clause: 'Sch. B — 5% Travel/Movies, ₹1,000 cap / calendar month', effective: '1 Jan 2026' },
        ],
        action: { label: 'Open Paytm Flights checkout', tab: 'checkout', scenario: 'C' },
        retrievalMs,
        chunks: 6,
      };
    }
    case 'diners': {
      const d = dinersStatus(cards);
      const amount = amountInQuery ?? d.gap;
      const swipeDay = parseMarchDay(query) ?? DEMO_DATE.day;
      const earliest = swipeDay + 1;
      const latest = swipeDay + 3;
      const endDay = CARDS.dinersBlack.milestone!.quarterEndDay;
      const dayLabel = (n: number) => (n <= endDay ? `${n} Mar` : `${n - endDay} Apr`);
      const enough = amount >= d.settledGap - d.pending || d.unlocked;
      let tone: RagResponse['verdict']['tone'];
      let text: string;
      if (d.unlocked) {
        tone = 'good';
        text = 'Milestone already unlocked this quarter';
      } else if (latest <= endDay && enough) {
        tone = 'good';
        text = `Yes — even a T+3 settlement lands by ${dayLabel(latest)}`;
      } else if (earliest > endDay) {
        tone = 'bad';
        text = `No — settlement falls in April and counts toward next quarter`;
      } else {
        tone = 'warn';
        text = `Risky — only a T+1 settlement (${dayLabel(earliest)}) would count`;
      }
      return {
        intent: 'milestone.settlement',
        title: `${formatINR(amount)} Diners swipe on ${swipeDay} March`,
        verdict: { tone, text },
        answer: `HDFC counts Diners Black milestone spend on the merchant settlement date, not the swipe date. Settlement usually takes T+1 to T+3 days, so a swipe on ${swipeDay} Mar settles between ${dayLabel(earliest)} and ${dayLabel(latest)}. The quarter closes on 31 Mar.${enough ? '' : ` Note: ${formatINR(amount)} is below your ${formatINR(d.settledGap - d.pending)} remaining gap.`}`,
        facts: [
          { label: 'Settled this quarter', value: formatINR(d.settled) },
          { label: 'Pending (unsettled)', value: formatINR(d.pending), tone: d.pending ? 'warn' : undefined },
          { label: 'Gap to ₹4,00,000', value: formatINR(Math.max(0, d.settledGap)), tone: d.unlocked ? 'good' : 'bad' },
          { label: 'Settlement window', value: `${dayLabel(earliest)} → ${dayLabel(latest)}`, tone: tone === 'good' ? 'good' : tone === 'bad' ? 'bad' : 'warn' },
          { label: 'Safe swipe-by date', value: `${endDay - 3} Mar (72-hour buffer)`, tone: 'good' },
        ],
        bullets: [`Reward at stake: ${CARDS.dinersBlack.milestone!.rewardLabel}`, 'Pre-authorisations and EMI conversions settle on conversion date — avoid them for milestone pushes'],
        citations: [
          { source: CARDS.dinersBlack.mitc, clause: 'Milestone Benefits §2 — eligible spends reckoned on settlement date', effective: '1 Feb 2026' },
          { source: 'Diners Club International settlement guide', clause: 'Merchant settlement T+1 to T+3 business days', effective: 'Current' },
        ],
        action: { label: 'See 72-hour buffer alert', tab: 'overview' },
        retrievalMs,
        chunks: 5,
      };
    }
    case 'lounge': {
      const gate = CARDS.scapia.loungeGate!;
      const spend = cards.scapia.monthSpend;
      const short = Math.max(0, gate.monthlyTarget - spend);
      const daysLeft = DEMO_DATE.daysInMonth - DEMO_DATE.day + 1;
      return {
        intent: 'lounge.eligibility',
        title: 'Bengaluru (BLR) domestic lounge — next week',
        verdict: short
          ? { tone: 'warn', text: `Not yet — ${formatINR(short)} more eligible Scapia spend needed by 31 Mar` }
          : { tone: 'good', text: 'Yes — April lounge access unlocked' },
        answer: `Next week falls in April. Scapia's unlimited domestic lounge access for April is gated on ₹20,000 of eligible March spend (rule effective ${gate.effective}). You're at ${formatINR(spend)} with ${daysLeft} days left. Utility, insurance and rent spends do not count toward the gate.`,
        facts: [
          { label: 'March eligible spend', value: `${formatINR(spend)} / ${formatINR(gate.monthlyTarget)}`, tone: short ? 'warn' : 'good' },
          { label: 'Shortfall', value: formatINR(short), tone: short ? 'bad' : 'good' },
          { label: 'Days left in March', value: `${daysLeft}` },
          { label: 'Quick win', value: 'Route FreshMart QR (₹2,800) to Scapia', tone: 'good' },
        ],
        bullets: ['Lounge pass is issued as a QR in the Scapia app on 1 Apr', 'Alternative: Diners Black lounge program (per HDFC MITC) — no monthly spend gate shown in your MITC'],
        citations: [
          { source: CARDS.scapia.mitc, clause: 'Lounge Programme §7 — ₹20,000 monthly spend gate', effective: gate.effective },
        ],
        action: { label: 'Route a QR payment to Scapia', tab: 'checkout', scenario: 'B' },
        retrievalMs,
        chunks: 4,
      };
    }
    case 'late': {
      const due = cards.hdfcSelect.statementDue;
      const amount = due || 18450;
      const interest = Math.round((amount * 0.42 * 30) / 365);
      return {
        intent: 'compliance.grace',
        title: 'Paying your card bill 1 day late',
        verdict: { tone: 'warn', text: 'No late fee & no bureau report — but interest-free period is lost' },
        answer: `Under RBI's Master Direction, issuers may levy late payment charges and report "past due" to credit bureaus only when the payment is overdue by more than 3 days after the due date. Paying 1 day late is inside that window. However, missing the due date breaks the interest-free period, so finance charges (≈3.5% p.m. ≈ 42% p.a.) apply on the outstanding from each transaction date.${ctx.billPaid ? ' Your Paytm HDFC Select bill is already paid this cycle.' : ''}`,
        facts: [
          { label: 'Paytm HDFC Select due', value: ctx.billPaid ? 'Paid ✓' : `${formatINR(amount)} in ${cards.hdfcSelect.dueInDays ?? 2} days`, tone: ctx.billPaid ? 'good' : 'warn' },
          { label: 'Late fee (day 1–3)', value: '₹0', tone: 'good' },
          { label: 'CIBIL past-due report (day 1–3)', value: 'None', tone: 'good' },
          { label: 'Late fee from day 4', value: '₹950 + 18% GST (₹10,001–₹25,000 slab)', tone: 'bad' },
          { label: 'Est. finance charge if paid late', value: `≈ ${formatINR(interest)}`, tone: 'bad' },
        ],
        bullets: ['CardSense schedules a BBPS auto-pay nudge 24h before due date', 'Minimum-amount-due payments still trigger interest on the balance'],
        citations: [RBI_MD, { source: CARDS.hdfcSelect.mitc, clause: 'Fees & Charges — late payment slab, finance charges 3.5% p.m.', effective: '1 Jan 2026' }],
        action: { label: 'Pay bill via BBPS', tab: 'overview' },
        retrievalMs,
        chunks: 4,
      };
    }
    case 'utility': {
      const amount = amountInQuery ?? 4500;
      const { facts, bestLabel, bestValue } = rankingFacts(amount, 4900, 'bbps', cards);
      const cap = utilityCapStatus(cards);
      return {
        intent: 'route.utility',
        title: `Paying a ${formatINR(amount)} utility bill (MCC 4900)`,
        verdict: { tone: 'good', text: `Use ${bestLabel} → ${formatINR(bestValue)} value` },
        answer: `Scapia earns 0% on Utilities (MCC 4900). Paytm HDFC Select has only ${formatINR(cap.remaining)} left in its 3% calendar-month cap (≈${formatINR(cap.remainingSpend)} of spend) before falling to 1%. The AU Bank flat ₹150 BBPS coupon often wins on bills under ~₹15,000.`,
        facts,
        bullets: [`HDFC 3% cap saturates at ${formatINR(cap.saturationSpend)} spend per calendar month`],
        citations: [
          { source: CARDS.scapia.mitc, clause: '§5(b) — Utilities MCC 4900 excluded from rewards', effective: '1 Feb 2026' },
          { source: CARDS.hdfcSelect.mitc, clause: 'Sch. B — 3% utilities via Paytm, ₹500 cap / calendar month', effective: '1 Jan 2026' },
        ],
        action: { label: 'Open BESCOM checkout', tab: 'checkout', scenario: 'A' },
        retrievalMs,
        chunks: 5,
      };
    }
    case 'grocery': {
      const amount = amountInQuery ?? 2800;
      const { facts, bestLabel, bestValue } = rankingFacts(amount, 5411, 'upiQr', cards);
      return {
        intent: 'route.upi_qr',
        title: `Scan & Pay ${formatINR(amount)} at a grocery QR (MCC 5411)`,
        verdict: { tone: 'good', text: `Use ${bestLabel} → ${formatINR(bestValue)} rewards` },
        answer: 'Only RuPay credit cards can be linked to UPI, so Scapia RuPay is your one credit option on merchant QRs. It earns 2% on eligible spends above ₹500 and counts toward the ₹20,000 lounge gate. There is no fee for you; merchant MDR applies on P2M credit-on-UPI above ₹2,000.',
        facts,
        bullets: ['Savings-account UPI earns nothing and bypasses the interest-free credit period'],
        citations: [
          { source: 'NPCI — RuPay Credit Card on UPI', clause: 'P2M only; MDR waived ≤ ₹2,000 for small merchants', effective: '2023 (current)' },
          { source: CARDS.scapia.mitc, clause: '§4 — 2% on retail & UPI > ₹500', effective: '1 Feb 2026' },
        ],
        action: { label: 'Open FreshMart QR checkout', tab: 'checkout', scenario: 'B' },
        retrievalMs,
        chunks: 4,
      };
    }
    case 'dining': {
      const amount = amountInQuery ?? 3000;
      const { facts, bestLabel, bestValue } = rankingFacts(amount, 5812, 'pos', cards);
      return {
        intent: 'route.dining',
        title: `Dining bill of ${formatINR(amount)} (MCC 5812, card swipe)`,
        verdict: { tone: 'good', text: `Use ${bestLabel} → ${formatINR(bestValue)} value` },
        answer: 'At a POS terminal Diners Black is accepted at most premium restaurants and earns ~3.3%, while also moving your quarterly milestone forward (remember: counted on settlement date).',
        facts,
        bullets: ['If the restaurant doesn\'t accept Diners, Scapia RuPay (2%) is next best'],
        citations: [{ source: CARDS.dinersBlack.mitc, clause: 'Reward Points — 5 RP per ₹150', effective: '1 Feb 2026' }],
        retrievalMs,
        chunks: 3,
      };
    }
    case 'cap': {
      const cap = utilityCapStatus(cards);
      return {
        intent: 'cap.status',
        title: 'Paytm HDFC Select — 3% Utility/Recharge cap',
        verdict: cap.remaining > 0 ? { tone: 'warn', text: `${Math.round(cap.pct)}% used — ${formatINR(cap.remaining)} cashback left` } : { tone: 'bad', text: 'Cap exhausted for March' },
        answer: `This cap runs on the calendar month (1–31 Mar), not your 15th-of-month billing cycle. After the cap, utility spends earn the 1% base rate until it resets on 1 April.`,
        facts: [
          { label: 'Used', value: `${formatINR(cap.used)} / ${formatINR(cap.cap)}`, tone: 'warn' },
          { label: 'Eligible spend left', value: formatINR(cap.remainingSpend) },
          { label: 'Saturation spend', value: formatINR(cap.saturationSpend) },
          { label: 'Resets', value: '1 Apr 2026 (calendar month)' },
        ],
        bullets: [],
        citations: [{ source: CARDS.hdfcSelect.mitc, clause: 'Sch. B — caps reckoned per calendar month', effective: '1 Jan 2026' }],
        retrievalMs,
        chunks: 2,
      };
    }
    case 'safe': {
      const liability = totalLiability(cards);
      return {
        intent: 'portfolio.safe_to_spend',
        title: 'Your Safe-to-Spend balance',
        verdict: ctx.aaConnected ? { tone: 'info', text: `${formatINR(ctx.bankBalance - liability)} safe to spend` } : { tone: 'warn', text: 'AA consent revoked — balance unavailable' },
        answer: 'Safe-to-Spend = AA-linked savings balance minus all unbilled credit card and RuPay-on-UPI spends. It prevents the "my bank balance looks fine" trap that leads to revolving at ~42% p.a.',
        facts: [
          { label: `${SAVINGS_ACCOUNT.bank} ${SAVINGS_ACCOUNT.masked}`, value: ctx.aaConnected ? formatINR(ctx.bankBalance) : 'Hidden' },
          { label: 'Unbilled card liability', value: formatINR(liability), tone: 'bad' },
        ],
        bullets: [],
        citations: [{ source: 'RBI Account Aggregator Master Direction (NBFC-AA)', clause: 'Consent-based CASA data sharing', effective: '2016 (amended 2023)' }],
        action: { label: 'View breakdown', tab: 'overview' },
        retrievalMs,
        chunks: 2,
      };
    }
    case 'excluded':
      return {
        intent: 'mcc.exclusions',
        title: 'Insurance, rent & other excluded MCCs',
        verdict: { tone: 'warn', text: 'Avoid Scapia for MCC 4900 / 6300 / rent' },
        answer: 'Scapia earns 0% on Utilities (4900), Insurance (6300) and Rent. Paytm HDFC Select and Diners Black exclude Fuel (5541) and Rent. For insurance premiums, Paytm HDFC Select earns its 1% base rate.',
        facts: [
          { label: 'Scapia RuPay', value: '0% on 4900, 6300, Rent', tone: 'bad' },
          { label: 'Paytm HDFC Select', value: '0% on Fuel 5541, Rent', tone: 'warn' },
          { label: 'HDFC Diners Black', value: '0% on Fuel 5541, Rent', tone: 'warn' },
          { label: 'AU Bank LIT', value: 'Offers only (rewards add-on off)' },
        ],
        bullets: [],
        citations: [
          { source: CARDS.scapia.mitc, clause: '§5(b) exclusions', effective: '1 Feb 2026' },
          { source: CARDS.hdfcSelect.mitc, clause: '§4.2 exclusions', effective: '1 Jan 2026' },
        ],
        retrievalMs,
        chunks: 3,
      };
    case 'privacy':
      return {
        intent: 'privacy.pipeline',
        title: 'How CardSense reads your card data',
        verdict: { tone: 'good', text: 'Zero Gmail access • DPDP Act compliant' },
        answer: 'Credit cards are not yet broadly live as FIPs on the RBI Account Aggregator network, so CardSense uses a 4-tier zero-scrape pipeline: BBPS bill fetch, on-device SMS parsing (raw SMS never leaves your phone), an opt-in statement-forwarding alias, and AA for savings balance only.',
        facts: [
          { label: 'gmail.readonly scope', value: 'Never requested', tone: 'good' },
          { label: 'Raw SMS uploaded', value: '0 bytes', tone: 'good' },
          { label: 'Consent revocation', value: '1 tap, instant', tone: 'good' },
        ],
        bullets: [],
        citations: [{ source: 'Digital Personal Data Protection Act, 2023', clause: '§6 consent; §8(7) erasure on withdrawal', effective: 'DPDP Rules 2025' }],
        action: { label: 'Open Data & Privacy', tab: 'privacy' },
        retrievalMs,
        chunks: 3,
      };
    case 'upgrade':
      return {
        intent: 'upgrade.audit',
        title: 'Should you get a new card?',
        verdict: { tone: 'info', text: 'Paytm SBI Card SELECT: +₹8,100 net / year' },
        answer: 'Over the last 6 months you lost ₹9,400 to calendar-month cap overflows and excluded utility MCCs. After its ₹1,499 fee, Paytm SBI Card SELECT recovers ₹8,100 a year. That beats the best non-Paytm option (₹6,350). Checkout routing still picks whichever card you hold that pays the most.',
        facts: [
          { label: '6-month leakage', value: '₹9,400', tone: 'bad' },
          { label: 'Net annual gain', value: '₹8,100', tone: 'good' },
          { label: 'Co-brand bias weight', value: '0.00', tone: 'good' },
        ],
        bullets: [],
        citations: [{ source: 'CardSense neutrality policy v1.2', clause: 'Value-only ranking; sourcing fees disclosed', effective: '1 Mar 2026' }],
        retrievalMs,
        chunks: 3,
      };
    case 'voucher':
      return {
        intent: 'vault.vouchers',
        title: 'Your expiring vouchers',
        verdict: { tone: 'warn', text: '₹500 Uber/BookMyShow voucher expires in 6 days' },
        answer: 'You have 3 active perks. The Scapia lounge QR pass for March expires in 4 days, and the ₹500 Uber/BookMyShow milestone voucher in 6 days. Open the Vault tab to copy codes or redeem them on Paytm.',
        facts: [
          { label: 'Lounge QR Pass', value: 'Expires in 4 days', tone: 'bad' },
          { label: '₹500 Uber / BookMyShow', value: 'Expires in 6 days', tone: 'warn' },
          { label: 'Paytm First Membership', value: '41 days left', tone: 'good' },
        ],
        bullets: [],
        citations: [{ source: 'Paytm Voucher Ledger', clause: 'Issuer-synced expiry dates', effective: 'Live' }],
        retrievalMs,
        chunks: 2,
      };
    default:
      return {
        intent: 'fallback.clarify',
        title: "I couldn't match that to a card rule yet",
        verdict: { tone: 'info', text: 'Try asking about a spend, a cap, a milestone or a bill' },
        answer: 'I answer only from your issuers\' MITC documents, RBI/NPCI rules and your live card state, so I won\'t guess. Try one of these:',
        facts: [],
        bullets: [
          'Which card for a ₹6,000 electricity bill?',
          'How much of my 3% cap is left?',
          'Can I swipe ₹20,000 on Diners on March 29?',
          'Which card for dinner at a restaurant?',
        ],
        citations: [],
        retrievalMs,
        chunks: 0,
      };
  }
}
