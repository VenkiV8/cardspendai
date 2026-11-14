import { createContext, useContext, type Dispatch } from 'react';
import {
  CARDS,
  MILESTONE_VOUCHER,
  SAVINGS_ACCOUNT,
  SCENARIOS,
  initialLiveCards,
  initialVouchers,
  type CardId,
  type InstrumentId,
  type LiveCards,
  type ScenarioId,
  type Voucher,
} from '../data/cardsData';
import { clock, formatINR } from '../lib/format';
import { computeSafeToSpend, type RouteResult, type SafeToSpend } from '../lib/routingEngine';
import { TOUR_STEPS } from '../lib/tour';

export type TabId = 'overview' | 'checkout' | 'concierge' | 'privacy';
export type ConciergeView = 'chat' | 'vault' | 'upgrade';

export interface Txn {
  id: string;
  merchant: string;
  amount: number;
  mcc: number;
  category: string;
  instrument: InstrumentId;
  source: 'Paytm Checkout' | 'PDF Statement' | 'Simulation' | 'BBPS';
}

export interface EventLog {
  id: number;
  time: string;
  text: string;
}

export interface Consents {
  bbps: boolean;
  sms: boolean;
  aa: boolean;
}

export interface AppState {
  tab: TabId;
  conciergeView: ConciergeView;
  scenario: ScenarioId;
  bankBalance: number;
  cards: LiveCards;
  selection: Record<ScenarioId, InstrumentId>;
  appliedValue: Record<ScenarioId, number>;
  bankedSaved: number;
  paid: Record<ScenarioId, boolean>;
  dinersSimulated: boolean;
  billPaid: boolean;
  pdfImported: boolean;
  transactions: Txn[];
  vouchers: Voucher[];
  consents: Consents;
  telemetryOn: boolean;
  events: EventLog[];
  toast: string | null;
  lastIntent: string | null;
  /** Index into TOUR_STEPS while the guided tour runs, else null. */
  tour: number | null;
}

let eventSeq = 0;
function log(state: AppState, text: string): EventLog[] {
  eventSeq += 1;
  return [{ id: eventSeq, time: clock(), text }, ...state.events].slice(0, 12);
}

/** Deep links for demos: #checkout/C, #concierge/vault, #privacy … */
function readHash(): { tab: TabId; conciergeView: ConciergeView; scenario: ScenarioId } {
  const fallback = { tab: 'overview' as TabId, conciergeView: 'chat' as ConciergeView, scenario: 'A' as ScenarioId };
  if (typeof window === 'undefined') return fallback;
  const [tab, sub] = window.location.hash.replace('#', '').split('/');
  const tabs: TabId[] = ['overview', 'checkout', 'concierge', 'privacy'];
  if (!tabs.includes(tab as TabId)) return fallback;
  return {
    tab: tab as TabId,
    conciergeView: (['chat', 'vault', 'upgrade'] as const).find((v) => v === sub) ?? 'chat',
    scenario: (['A', 'B', 'C'] as const).find((s) => s === sub?.toUpperCase()) ?? 'A',
  };
}

export function createInitialState(): AppState {
  return {
    ...readHash(),
    bankBalance: SAVINGS_ACCOUNT.balance,
    cards: structuredClone(initialLiveCards),
    selection: { A: SCENARIOS.A.defaultInstrument, B: SCENARIOS.B.defaultInstrument, C: SCENARIOS.C.defaultInstrument },
    appliedValue: { A: 0, B: 0, C: 0 },
    bankedSaved: 0,
    paid: { A: false, B: false, C: false },
    dinersSimulated: false,
    billPaid: false,
    pdfImported: false,
    transactions: [],
    vouchers: [...initialVouchers],
    consents: { bbps: true, sms: true, aa: true },
    telemetryOn: true,
    events: [{ id: 0, time: clock(), text: 'Session started • 4 cards + 1 AA account synced' }],
    toast: null,
    lastIntent: null,
    tour: null,
  };
}

export type Action =
  | { type: 'SET_TAB'; tab: TabId }
  | { type: 'SET_CONCIERGE_VIEW'; view: ConciergeView }
  | { type: 'SET_SCENARIO'; scenario: ScenarioId }
  | { type: 'APPLY_SWITCH'; scenario: ScenarioId; result: RouteResult }
  | { type: 'PAY_SCENARIO'; scenario: ScenarioId; result: RouteResult }
  | { type: 'NEW_PAYMENT'; scenario: ScenarioId }
  | { type: 'SIMULATE_DINERS'; amount: number }
  | { type: 'SETTLE_DINERS' }
  | { type: 'PAY_BILL' }
  | { type: 'IMPORT_PDF' }
  | { type: 'TOGGLE_CONSENT'; key: keyof Consents }
  | { type: 'TOGGLE_TELEMETRY' }
  | { type: 'SET_INTENT'; intent: string; query: string }
  | { type: 'TOAST'; message: string }
  | { type: 'CLEAR_TOAST' }
  | { type: 'LOG'; text: string }
  | { type: 'RESET' }
  | { type: 'TOUR_START' }
  | { type: 'TOUR_GO'; step: number }
  | { type: 'TOUR_END' };

function chargeCard(cards: LiveCards, cardId: CardId, amount: number, result?: RouteResult): LiveCards {
  const prev = cards[cardId];
  const capUsed = { ...prev.capUsed };
  if (result?.capConsumption) {
    capUsed[result.capConsumption.ruleId] = (capUsed[result.capConsumption.ruleId] ?? 0) + result.capConsumption.amount;
  }
  const countsForGate = result ? result.countsTowardLounge || cardId !== 'scapia' : true;
  return {
    ...cards,
    [cardId]: {
      ...prev,
      unbilled: prev.unbilled + amount,
      monthSpend: prev.monthSpend + (countsForGate ? amount : 0),
      capUsed,
    },
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, tab: action.tab };
    case 'SET_CONCIERGE_VIEW':
      return { ...state, conciergeView: action.view };
    case 'SET_SCENARIO':
      return { ...state, scenario: action.scenario };
    case 'APPLY_SWITCH': {
      const s = action.scenario;
      return {
        ...state,
        selection: { ...state.selection, [s]: action.result.instrument },
        appliedValue: {
          ...state.appliedValue,
          [s]: action.result.instrument === SCENARIOS[s].defaultInstrument ? 0 : action.result.totalValue,
        },
        events: log(state, `Scenario ${s}: switched to ${action.result.label} (+${formatINR(action.result.totalValue)} value)`),
      };
    }
    case 'PAY_SCENARIO': {
      const s = action.scenario;
      const sc = SCENARIOS[s];
      const r = action.result;
      let cards = state.cards;
      let bankBalance = state.bankBalance;
      if (r.instrument === 'hdfcUpi') bankBalance -= r.payable;
      else cards = chargeCard(cards, r.instrument, r.payable, r);
      const txn: Txn = {
        id: `txn-${s}-${Date.now()}`,
        merchant: sc.merchant,
        amount: r.payable,
        mcc: sc.mcc,
        category: sc.category,
        instrument: r.instrument,
        source: 'Paytm Checkout',
      };
      return {
        ...state,
        cards,
        bankBalance,
        paid: { ...state.paid, [s]: true },
        transactions: [txn, ...state.transactions],
        events: log(state, `Paid ${formatINR(r.payable)} to ${sc.merchant} via ${r.label}`),
      };
    }
    case 'NEW_PAYMENT': {
      const s = action.scenario;
      return {
        ...state,
        paid: { ...state.paid, [s]: false },
        selection: { ...state.selection, [s]: SCENARIOS[s].defaultInstrument },
        appliedValue: { ...state.appliedValue, [s]: 0 },
        bankedSaved: state.bankedSaved + (state.paid[s] ? state.appliedValue[s] : 0),
        events: log(state, `Scenario ${s}: new checkout — re-routing against live caps`),
      };
    }
    case 'SIMULATE_DINERS': {
      const prev = state.cards.dinersBlack;
      return {
        ...state,
        dinersSimulated: true,
        cards: {
          ...state.cards,
          dinersBlack: { ...prev, pending: prev.pending + action.amount, unbilled: prev.unbilled + action.amount },
        },
        events: log(state, `Diners Black: ${formatINR(action.amount)} authorised (pending T+1…T+3 settlement)`),
      };
    }
    case 'SETTLE_DINERS': {
      const prev = state.cards.dinersBlack;
      const settled = prev.settled + prev.pending;
      const target = CARDS.dinersBlack.milestone!.target;
      const unlocked = settled >= target && !state.vouchers.some((v) => v.id === MILESTONE_VOUCHER.id);
      return {
        ...state,
        cards: { ...state.cards, dinersBlack: { ...prev, settled, pending: 0 } },
        vouchers: unlocked ? [MILESTONE_VOUCHER, ...state.vouchers] : state.vouchers,
        toast: unlocked ? '🎉 ₹10,000 Diners milestone voucher unlocked — added to Vault' : state.toast,
        events: log(state, unlocked ? 'Diners milestone ₹4,00,000 crossed on settlement date → voucher issued' : 'Diners settlement posted'),
      };
    }
    case 'PAY_BILL': {
      const prev = state.cards.hdfcSelect;
      return {
        ...state,
        billPaid: true,
        bankBalance: state.bankBalance - prev.statementDue,
        cards: { ...state.cards, hdfcSelect: { ...prev, statementDue: 0, dueInDays: null } },
        events: log(state, `BBPS: Paytm HDFC Select statement ${formatINR(prev.statementDue)} paid via UPI`),
      };
    }
    case 'IMPORT_PDF': {
      if (state.pdfImported) return state;
      const amount = 6400;
      const txn: Txn = {
        id: 'txn-pdf-dining',
        merchant: 'Toit Brewpub, Indiranagar',
        amount,
        mcc: 5812,
        category: 'Dining',
        instrument: 'hdfcSelect',
        source: 'PDF Statement',
      };
      return {
        ...state,
        pdfImported: true,
        cards: chargeCard(state.cards, 'hdfcSelect', amount),
        transactions: [txn, ...state.transactions],
        events: log(state, `PDF statement parsed: +${formatINR(amount)} dining (MCC 5812) on HDFC Select`),
      };
    }
    case 'TOGGLE_CONSENT': {
      const next = !state.consents[action.key];
      const names: Record<keyof Consents, string> = { bbps: 'BBPS bill fetch', sms: 'On-device SMS sandbox', aa: 'Account Aggregator consent' };
      return {
        ...state,
        consents: { ...state.consents, [action.key]: next },
        events: log(state, `${names[action.key]} ${next ? 'granted' : 'revoked'}`),
      };
    }
    case 'TOGGLE_TELEMETRY':
      return { ...state, telemetryOn: !state.telemetryOn };
    case 'SET_INTENT':
      return { ...state, lastIntent: action.intent, events: log(state, `Concierge intent "${action.intent}" ← "${action.query.slice(0, 40)}"`) };
    case 'TOAST':
      return { ...state, toast: action.message };
    case 'CLEAR_TOAST':
      return { ...state, toast: null };
    case 'LOG':
      return { ...state, events: log(state, action.text) };
    case 'RESET':
      return { ...createInitialState(), telemetryOn: state.telemetryOn, tab: state.tab, events: log(state, 'Demo state reset') };
    case 'TOUR_START': {
      // The tour always starts from a clean seed so every step behaves the same.
      const fresh = createInitialState();
      return { ...fresh, telemetryOn: state.telemetryOn, tab: 'overview', tour: 0, events: log(state, 'Guided tour started (demo state reset)') };
    }
    case 'TOUR_GO': {
      const step = TOUR_STEPS[action.step];
      if (!step) return { ...state, tour: null };
      return {
        ...state,
        tour: action.step,
        tab: step.tab,
        scenario: step.scenario ?? state.scenario,
        conciergeView: step.conciergeView ?? state.conciergeView,
      };
    }
    case 'TOUR_END':
      return { ...state, tour: null };
    default:
      return state;
  }
}

export interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/** Single source of truth for Safe-to-Spend across Overview, Privacy, Concierge and the Inspector. */
export function getSafeToSpend(state: AppState): SafeToSpend {
  return computeSafeToSpend(state.bankBalance, state.cards, state.consents);
}

/** Live counter: value captured by applied CardSense switches (+ banked from completed, restarted checkouts). */
export function sessionSaved(state: AppState): number {
  return state.bankedSaved + state.appliedValue.A + state.appliedValue.B + state.appliedValue.C;
}
