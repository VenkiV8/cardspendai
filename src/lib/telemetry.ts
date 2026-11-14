import { SCENARIOS, SCENARIO_ORDER } from '../data/cardsData';
import type { AppState } from '../state/appState';
import { CO_BRAND_BIAS_WEIGHT, ROUTING_LATENCY_MS, formatMs, routeTransaction } from './routingEngine';

export interface Telemetry {
  screen: string;
  latency: string;
  latencyNote: string;
  /** true = real performance.now() measurement in this browser; false = illustrative figure. */
  latencyMeasured: boolean;
  mcc: string;
  compliance: string[];
  monetization: string;
  guardrails: Array<{ label: string; value: string; ok: boolean; simulated?: boolean }>;
}

const SIMULATED_P95 = `Simulated prod p95: ${ROUTING_LATENCY_MS}ms incl. network`;

/** Times the real routing engine for the given scenarios in this browser. */
function measureRouting(state: AppState, ids = SCENARIO_ORDER): number {
  return ids.reduce((sum, id) => {
    const sc = SCENARIOS[id];
    return sum + routeTransaction({ amount: sc.amount, mcc: sc.mcc, channel: sc.channel }, state.cards).computeMs;
  }, 0);
}

export function getTelemetry(state: AppState): Telemetry {
  const guardrails = [
    { label: 'Numeric hallucination guard', value: 'All ₹ figures from rule engine', ok: true },
    { label: 'Co-brand bias weight', value: CO_BRAND_BIAS_WEIGHT.toFixed(2), ok: true },
    { label: 'PII egress (raw SMS / email)', value: '0 bytes', ok: true, simulated: true },
    { label: 'AA consent artefact', value: state.consents.aa ? 'Active • revocable' : 'Revoked', ok: state.consents.aa },
  ];
  const measured = { latency: formatMs(measureRouting(state)), latencyMeasured: true };

  switch (state.tab) {
    case 'overview':
      return {
        screen: 'Overview • Command Center',
        ...measured,
        latencyNote: `Measured: 3 scenarios × 5 instruments in this browser • ${SIMULATED_P95}`,
        mcc: 'Portfolio aggregate • 4900 / 5411 / 4511 / 5812',
        compliance: ['RBI AA Master Direction (CASA sync)', 'RBI MD Cards Para 23(5) grace', 'DPDP Act 2023 §6 consent'],
        monetization: 'BBPS bill-pay take rate + RuPay-on-UPI credit MDR share; alerts drive repeat Paytm checkout',
        guardrails,
      };
    case 'checkout': {
      const sc = SCENARIOS[state.scenario];
      const hooks: Record<string, string> = {
        A: 'BBPS biller commission + issuer-funded ₹150 AU coupon (co-marketing CPA) • coupon is demo offer data',
        B: 'RuPay credit-on-UPI P2M MDR share (> ₹2,000) — merchant-paid, ₹0 to user',
        C: 'Paytm Flights convenience fee + issuer-funded 12% AU discount (CPA) • discount is demo offer data',
      };
      const compliance: Record<string, string[]> = {
        A: ['NPCI BBPS biller rails', 'RBI Card-on-File Tokenisation (CoFT)', 'PA/PG Guidelines 2020'],
        B: ['NPCI RuPay Credit on UPI (P2M only)', 'MDR disclosure to merchant', 'DPDP purpose limitation'],
        C: ['RBI CoFT tokenised card', 'AFA / 3-DS 2.0 on card-not-present', 'Offer T&C disclosure'],
      };
      return {
        screen: `Smart Checkout • Scenario ${sc.id}`,
        latency: formatMs(measureRouting(state, [sc.id])),
        latencyMeasured: true,
        latencyNote: `Measured pre-swipe rule match, no LLM in path • ${SIMULATED_P95}`,
        mcc: `MCC ${sc.mcc} — ${sc.mccLabel}`,
        compliance: compliance[sc.id],
        monetization: hooks[sc.id],
        guardrails,
      };
    }
    case 'concierge': {
      const view = state.conciergeView;
      if (view === 'vault') {
        return {
          screen: 'AI Concierge • Voucher Vault',
          latency: '—',
          latencyMeasured: false,
          latencyNote: 'No routing on this screen (voucher ledger only)',
          mcc: 'N/A — perks ledger',
          compliance: ['Issuer-synced voucher T&C', 'DPDP data minimisation'],
          monetization: 'Redemption on Paytm (BookMyShow / Travel) — affiliate take rate',
          guardrails,
        };
      }
      if (view === 'upgrade') {
        return {
          screen: 'AI Concierge • Neutral Upgrade',
          latency: '1.2s',
          latencyMeasured: false,
          latencyNote: 'Simulated: 6-month counterfactual replay (412 txns), precomputed for this demo',
          mcc: 'Leakage MCCs • 4900 / 6300 / 6513',
          compliance: ['RBI MD Cards — no unsolicited issuance', 'Sourcing fee disclosed to user', 'Neutrality policy v1.2'],
          monetization: 'Paytm SBI Card sourcing CPA — gated behind neutrality check',
          guardrails,
        };
      }
      return {
        screen: 'AI Concierge • RAG Chat',
        ...measured,
        latencyNote: `Measured deterministic number fill${state.lastIntent ? ` • intent ${state.lastIntent}` : ''} • retrieval time is simulated`,
        mcc: state.lastIntent?.startsWith('route.flight')
          ? 'MCC 4511 — Airlines'
          : state.lastIntent?.startsWith('route.utility')
            ? 'MCC 4900 — Utilities'
            : state.lastIntent?.startsWith('route.upi_qr')
              ? 'MCC 5411 — Grocery'
              : 'Resolved per query',
        compliance: ['MITC-grounded answers with citations', 'RBI MD Cards 2022', 'No advice beyond issuer rules'],
        monetization: 'Answer → 1-tap checkout deep link (conversion)',
        guardrails,
      };
    }
    case 'privacy':
      return {
        screen: 'Data & Privacy • Ingestion Pipeline',
        latency: '1.5s',
        latencyMeasured: false,
        latencyNote: 'Simulated PDF statement extraction (scripted 3-step animation)',
        mcc: state.pdfImported ? 'MCC 5812 — Dining (newly detected)' : 'Awaiting statement',
        compliance: ['DPDP Act 2023 (consent, erasure)', 'RBI AA consent artefact (ReBIT)', 'No gmail.readonly scope'],
        monetization: 'Trust moat → consented data enables credit & offer personalisation',
        guardrails,
      };
  }
}
