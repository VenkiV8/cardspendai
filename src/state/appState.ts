import { createContext, useContext, type Dispatch } from 'react';
import {
  CARDS,
  DEMO_DATE,
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
import { computeSafeToSpend, type RouteResult, type SafeToSpend } from '../lib/routingEngine';
import { TOUR_STEPS } from '../lib/tour';

export type TabId = 'overview' | 'checkout' | 'vault' | 'privacy';
/** Segments of the Voucher Vault tab, in display order. */
export type ConciergeView = 'vault' | 'chat' | 'upgrade';
/** Which app is on screen inside the phone: the Paytm home screen or CardSense AI. */
export type Surface = 'home' | 'cardsense';

export interface Txn {
  id: string;
  merchant: string;
  amount: number;
  mcc: number;
  category: string;
  instrument: InstrumentId;
  source: 'Paytm Checkout' | 'PDF Statement' | 'Simulation' | 'BBPS';
  date: string;
  /** Reward + instant discount value earned, in ₹. */
  reward: number;
}

export interface Consents {
  bbps: boolean;
  sms: boolean;
  aa: boolean;
}

export interface AppState {
  surface: Surface;
  tab: TabId;
  /** Card Detail page open on top of the CardSense tabs, else null. */
  cardDetail: CardId | null;
  /** Overview privacy banner dismissed (kept for the browser session). */
  bannerDismissed: boolean;
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
  toast: string | null;
  lastIntent: string | null;
  /** Index into TOUR_STEPS while the guided tour runs, else null. */
  tour: number | null;
}

const BANNER_KEY = 'cardsense.privacyBannerDismissed';

function readBannerDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(BANNER_KEY) === '1';
  } catch {
    return false;
  }
}

function saveBannerDismissed() {
  try {
    window.sessionStorage.setItem(BANNER_KEY, '1');
  } catch {
    /* storage blocked: dismissal still holds for this page view */
  }
}

/**
 * Deep links for demos skip the Paytm home screen: #overview, #checkout/C, #vault/chat, #privacy.
 * The old #concierge link still works and opens Voucher Vault › Concierge.
 */
function readHash(): { surface: Surface; tab: TabId; conciergeView: ConciergeView; scenario: ScenarioId } {
  const fallback = { surface: 'home' as Surface, tab: 'overview' as TabId, conciergeView: 'vault' as ConciergeView, scenario: 'A' as ScenarioId };
  if (typeof window === 'undefined') return fallback;
  const [raw, sub] = window.location.hash.replace('#', '').split('/');
  const legacyChat = raw === 'concierge';
  const tab = legacyChat ? 'vault' : raw;
  const tabs: TabId[] = ['overview', 'checkout', 'vault', 'privacy'];
  if (!tabs.includes(tab as TabId)) return fallback;
  return {
    surface: 'cardsense',
    tab: tab as TabId,
    conciergeView: (['vault', 'chat', 'upgrade'] as const).find((v) => v === sub) ?? (legacyChat ? 'chat' : 'vault'),
    scenario: (['A', 'B', 'C'] as const).find((x) => x === sub?.toUpperCase()) ?? 'A',
  };
}

export function createInitialState(): AppState {
  return {
    ...readHash(),
    cardDetail: null,
    bannerDismissed: readBannerDismissed(),
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
    toast: null,
    lastIntent: null,
    tour: null,
  };
}

export type Action =
  | { type: 'OPEN_CARDSENSE' }
  | { type: 'GO_HOME' }
  | { type: 'OPEN_CARD'; card: CardId }
  | { type: 'CLOSE_CARD' }
  | { type: 'DISMISS_BANNER' }
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
  | { type: 'SET_INTENT'; intent: string; query: string }
  | { type: 'TOAST'; message: string }
  | { type: 'CLEAR_TOAST' }
  | { type: 'RESET' }
  | { type: 'TOUR_START' }
  | { type: 'TOUR_GO'; step: number }
  | { type: 'TOUR_END' };

const DEMO_DATE_SHORT = `${DEMO_DATE.day} ${DEMO_DATE.monthShort}`;

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
    case 'OPEN_CARDSENSE':
      return { ...state, surface: 'cardsense', tab: 'overview', cardDetail: null };
    case 'GO_HOME':
      return { ...state, surface: 'home', cardDetail: null };
    case 'OPEN_CARD':
      return { ...state, cardDetail: action.card };
    case 'CLOSE_CARD':
      return { ...state, cardDetail: null };
    case 'DISMISS_BANNER':
      saveBannerDismissed();
      return { ...state, bannerDismissed: true };
    case 'SET_TAB':
      return { ...state, tab: action.tab, cardDetail: null };
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
        date: DEMO_DATE_SHORT,
        reward: r.totalValue,
      };
      return {
        ...state,
        cards,
        bankBalance,
        paid: { ...state.paid, [s]: true },
        transactions: [txn, ...state.transactions],
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
      };
    }
    case 'SIMULATE_DINERS': {
      const prev = state.cards.dinersBlack;
      const txn: Txn = {
        id: `txn-diners-${Date.now()}`,
        merchant: 'Tanishq, MG Road (simulated)',
        amount: action.amount,
        mcc: 5944,
        category: 'Shopping',
        instrument: 'dinersBlack',
        source: 'Simulation',
        date: DEMO_DATE_SHORT,
        reward: Math.round(action.amount * CARDS.dinersBlack.baseRate),
      };
      return {
        ...state,
        dinersSimulated: true,
        cards: {
          ...state.cards,
          dinersBlack: { ...prev, pending: prev.pending + action.amount, unbilled: prev.unbilled + action.amount, monthSpend: prev.monthSpend + action.amount },
        },
        transactions: [txn, ...state.transactions],
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
        toast: unlocked ? '₹10,000 Diners milestone voucher unlocked and added to Voucher Vault' : state.toast,
      };
    }
    case 'PAY_BILL': {
      const prev = state.cards.hdfcSelect;
      return {
        ...state,
        billPaid: true,
        bankBalance: state.bankBalance - prev.statementDue,
        cards: { ...state.cards, hdfcSelect: { ...prev, statementDue: 0, dueInDays: null } },
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
        date: DEMO_DATE_SHORT,
        reward: Math.round(amount * CARDS.hdfcSelect.baseRate),
      };
      return {
        ...state,
        pdfImported: true,
        cards: chargeCard(state.cards, 'hdfcSelect', amount),
        transactions: [txn, ...state.transactions],
      };
    }
    case 'TOGGLE_CONSENT':
      return { ...state, consents: { ...state.consents, [action.key]: !state.consents[action.key] } };
    case 'SET_INTENT':
      return { ...state, lastIntent: action.intent };
    case 'TOAST':
      return { ...state, toast: action.message };
    case 'CLEAR_TOAST':
      return { ...state, toast: null };
    case 'RESET':
      // Reset returns to the Paytm home screen with a clean seed.
      return { ...createInitialState(), surface: 'home', tab: 'overview', bannerDismissed: state.bannerDismissed };
    case 'TOUR_START':
      // The tour always starts from a clean seed on the Paytm home screen so every step behaves the same.
      return { ...createInitialState(), surface: 'home', tab: 'overview', bannerDismissed: state.bannerDismissed, tour: 0 };
    case 'TOUR_GO': {
      const step = TOUR_STEPS[action.step];
      if (!step) return { ...state, tour: null };
      return {
        ...state,
        tour: action.step,
        surface: step.surface,
        cardDetail: null,
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

/** Single source of truth for Safe-to-Spend across Overview, Card Detail, Privacy and the Concierge. */
export function getSafeToSpend(state: AppState): SafeToSpend {
  return computeSafeToSpend(state.bankBalance, state.cards, state.consents);
}

/** Live counter: value captured by applied CardSense switches (+ banked from completed, restarted checkouts). */
export function sessionSaved(state: AppState): number {
  return state.bankedSaved + state.appliedValue.A + state.appliedValue.B + state.appliedValue.C;
}
