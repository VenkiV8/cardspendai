import { DINERS_SIM_AMOUNT, SCENARIOS, type ScenarioId } from '../data/cardsData';
import type { Action, AppState, ConciergeView, Surface, TabId } from '../state/appState';
import { routeTransaction } from './routingEngine';

export type TourTargetId = 'tile' | 'alerts' | 'simulate' | 'switch' | 'chips';

export interface TourStep {
  title: string;
  body: string;
  surface: Surface;
  tab: TabId;
  scenario?: ScenarioId;
  conciergeView?: ConciergeView;
  target: TourTargetId;
  /** When set, the step asks the user to do something; "Next" lights up once it's done. */
  done?: (s: AppState) => boolean;
  doneText?: string;
  /** What “Next” does on the user's behalf when the step's action hasn't been done yet. */
  act?: (s: AppState) => Action[];
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'CardSense lives inside Paytm',
    body: 'Tap the “CardSense AI” tile, the first service on the Paytm home screen. Or press Next and the tour opens it for you.',
    surface: 'home',
    tab: 'overview',
    target: 'tile',
    done: (s) => s.surface === 'cardsense',
    act: () => [{ type: 'OPEN_CARDSENSE' }],
    doneText: 'You are in CardSense. No new app to install.',
  },
  {
    title: 'Urgent actions, by deadline',
    body: 'Safe-to-Spend nets bills and unbilled spends off your AA balance. Below it, each alert shows one headline and one button, soonest deadline first. Tap “i” for the detail.',
    surface: 'cardsense',
    tab: 'overview',
    target: 'alerts',
  },
  {
    title: 'Simulate the 72-hour buffer',
    body: 'Tap “Simulate ₹12,500 spend” (or press Next). Diners counts the merchant settlement date, not the swipe date.',
    surface: 'cardsense',
    tab: 'overview',
    target: 'simulate',
    done: (s) => s.dinersSimulated,
    act: () => [{ type: 'SIMULATE_DINERS', amount: DINERS_SIM_AMOUNT }],
    doneText: '₹12,500 is pending settlement. The meter shows it striped.',
  },
  {
    title: 'Pre-swipe card switch',
    body: 'A ₹40,000 IndiGo booking defaults to HDFC Select. Tap “Switch Card & Apply” on the top pick (or press Next).',
    surface: 'cardsense',
    tab: 'checkout',
    scenario: 'C',
    target: 'switch',
    done: (s) => s.appliedValue.C > 0,
    act: (s) => {
      const c = SCENARIOS.C;
      const best = routeTransaction({ amount: c.amount, mcc: c.mcc, channel: c.channel }, s.cards).best;
      return [{ type: 'APPLY_SWITCH', scenario: 'C', result: best }];
    },
    doneText: 'Saved. Every number came from the deterministic rule engine.',
  },
  {
    title: 'Ask the MITC concierge',
    body: 'Voucher Vault › Concierge. Tap a question or type your own. Answers come only from issuer MITCs and your live card state.',
    surface: 'cardsense',
    tab: 'vault',
    conciergeView: 'chat',
    target: 'chips',
    done: (s) => s.lastIntent !== null,
    doneText: 'Each answer carries citations and a 1-tap action.',
  },
];
