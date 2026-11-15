/**
 * Card Detail demo data: limits, billing cycles, category splits, rewards ledgers, fees and
 * recent transactions. Static seed only. Live figures (unbilled, statement due, settlement,
 * caps, checkout payments) come from `LiveCards` and `state.transactions` in the central store,
 * and the Card Detail page combines the two, so Simulate / Pay / Reset update everything.
 *
 * Seed numbers are consistent with `initialLiveCards`: each card's category split sums to its
 * seed unbilled amount (₹14,200 / ₹0 / ₹14,500 / ₹19,300).
 */
import type { CardId } from './cardsData';

export type SpendCategory = 'Utilities' | 'Groceries' | 'Travel' | 'Dining' | 'Fuel' | 'Rent' | 'Others';

export const CATEGORY_ORDER: SpendCategory[] = ['Utilities', 'Groceries', 'Travel', 'Dining', 'Fuel', 'Rent', 'Others'];

/** Maps checkout / statement transaction categories into the Card Detail buckets. */
export function toSpendCategory(category: string): SpendCategory {
  const map: Record<string, SpendCategory> = { Utility: 'Utilities', Grocery: 'Groceries', Travel: 'Travel', Dining: 'Dining', Fuel: 'Fuel', Rent: 'Rent' };
  return map[category] ?? 'Others';
}

export interface SeedTxn {
  date: string;
  merchant: string;
  mcc: number;
  amount: number;
  category: SpendCategory;
  /** Reward value earned in ₹. */
  earned: number;
  /** Set when another card in the wallet would have earned more. */
  better?: { card: string; value: number; reason: string };
  /** True when the transaction falls in March (counts toward "rewards missed this month"). */
  thisMonth: boolean;
}

export interface CardProfile {
  limit: number;
  cycle: { start: string; end: string; daysLeft: number };
  lastStatement: { date: string; amount: number; minDue: number; dueDate: string; graceUntil: string };
  /** Interest-free days for a purchase made today (demo date 27 Mar). */
  interestFreeDays: number;
  nextDueDate: string;
  autopay: { on: boolean; label: string };
  /** Seed unbilled split by category (sums to the seed unbilled amount). */
  split: Partial<Record<SpendCategory, number>>;
  /** Effective reward rate per category (₹ value per ₹ spent). */
  rates: Record<SpendCategory, number>;
  rewards: { unit: string; rupeePerUnit: number; lifetimeUnits: number; expiring?: { units: number; date: string }; note: string };
  fees: { annual: number; waiver?: { threshold: number; seedYearSpend: number }; renews: string; note: string };
  token: string;
  transactions: SeedTxn[];
}

const flat = (r: number, overrides: Partial<Record<SpendCategory, number>> = {}): Record<SpendCategory, number> => ({
  Utilities: r,
  Groceries: r,
  Travel: r,
  Dining: r,
  Fuel: r,
  Rent: r,
  Others: r,
  ...overrides,
});

export const CARD_PROFILES: Record<CardId, CardProfile> = {
  hdfcSelect: {
    limit: 150000,
    cycle: { start: '16 Mar', end: '15 Apr', daysLeft: 19 },
    lastStatement: { date: '15 Mar', amount: 18450, minDue: 925, dueDate: '29 Mar', graceUntil: '1 Apr' },
    interestFreeDays: 33,
    nextDueDate: '29 Apr',
    autopay: { on: false, label: 'Off: pay manually or via BBPS' },
    split: { Utilities: 9000, Groceries: 1200, Dining: 1800, Others: 2200 },
    rates: flat(0.01, { Utilities: 0.03, Travel: 0.05, Fuel: 0, Rent: 0 }),
    rewards: { unit: 'Cashpoints', rupeePerUnit: 1, lifetimeUnits: 6840, note: '1 Cashpoint = ₹1 against your statement' },
    fees: { annual: 1000, waiver: { threshold: 100000, seedYearSpend: 72400 }, renews: 'Aug 2026', note: 'Fee reversed if card-year spend crosses ₹1,00,000' },
    token: 'Tokenised on Paytm (RBI card-on-file) • token ••8812',
    transactions: [
      { date: '26 Mar', merchant: 'Airtel Postpaid (Paytm)', mcc: 4814, amount: 1499, category: 'Utilities', earned: 45, thisMonth: true },
      { date: '24 Mar', merchant: 'Swiggy', mcc: 5812, amount: 860, category: 'Dining', earned: 9, better: { card: 'Scapia RuPay', value: 17, reason: '2% vs 1%' }, thisMonth: true },
      { date: '22 Mar', merchant: 'BWSSB Water (Paytm)', mcc: 4900, amount: 2300, category: 'Utilities', earned: 69, thisMonth: true },
      { date: '20 Mar', merchant: 'Amazon.in', mcc: 5311, amount: 2200, category: 'Others', earned: 22, better: { card: 'Scapia RuPay', value: 44, reason: '2% vs 1%' }, thisMonth: true },
      { date: '18 Mar', merchant: 'BigBasket', mcc: 5411, amount: 1200, category: 'Groceries', earned: 12, better: { card: 'Scapia RuPay', value: 24, reason: '2% vs 1%' }, thisMonth: true },
    ],
  },
  dinersBlack: {
    limit: 800000,
    cycle: { start: '6 Mar', end: '5 Apr', daysLeft: 9 },
    lastStatement: { date: '5 Mar', amount: 0, minDue: 0, dueDate: '25 Mar', graceUntil: '28 Mar' },
    interestFreeDays: 29,
    nextDueDate: '25 Apr',
    autopay: { on: true, label: 'On: full statement from HDFC XX8821' },
    split: {},
    rates: flat(0.0333, { Fuel: 0, Rent: 0 }),
    rewards: {
      unit: 'Reward Points',
      rupeePerUnit: 1,
      lifetimeUnits: 48200,
      expiring: { units: 3200, date: '30 Apr' },
      note: '1 RP ≈ ₹1 on SmartBuy flights and hotels',
    },
    fees: { annual: 10000, waiver: { threshold: 800000, seedYearSpend: 692000 }, renews: 'Jun 2026', note: 'Fee reversed if card-year spend crosses ₹8,00,000' },
    token: 'Not tokenised on Paytm: Diners is accepted only at POS and partner sites',
    transactions: [
      { date: '4 Mar', merchant: 'Taj Hotels (SmartBuy)', mcc: 7011, amount: 42000, category: 'Travel', earned: 1400, thisMonth: true },
      { date: '2 Mar', merchant: 'Croma', mcc: 5732, amount: 38500, category: 'Others', earned: 1283, thisMonth: true },
      { date: '28 Feb', merchant: 'Indian Oil', mcc: 5541, amount: 4000, category: 'Fuel', earned: 0, thisMonth: false },
      { date: '25 Feb', merchant: 'Emirates', mcc: 4511, amount: 56000, category: 'Travel', earned: 1866, thisMonth: false },
      { date: '20 Feb', merchant: 'Rent via RentPay', mcc: 6513, amount: 35000, category: 'Rent', earned: 0, thisMonth: false },
    ],
  },
  scapia: {
    limit: 50000,
    cycle: { start: '3 Mar', end: '2 Apr', daysLeft: 6 },
    lastStatement: { date: '2 Mar', amount: 0, minDue: 0, dueDate: '22 Mar', graceUntil: '25 Mar' },
    interestFreeDays: 26,
    nextDueDate: '22 Apr',
    autopay: { on: true, label: 'On: full statement from HDFC XX8821' },
    split: { Groceries: 6200, Travel: 2500, Dining: 3800, Others: 2000 },
    rates: flat(0.02, { Utilities: 0, Rent: 0 }),
    rewards: { unit: 'Scapia Coins', rupeePerUnit: 0.2, lifetimeUnits: 9800, note: '5 Scapia Coins = ₹1 on Scapia travel bookings' },
    fees: { annual: 0, renews: 'Lifetime free', note: 'No joining or annual fee' },
    token: 'Tokenised on Paytm • linked to UPI @pthdfc (RuPay credit on UPI)',
    transactions: [
      { date: '26 Mar', merchant: "Nature's Basket (UPI QR)", mcc: 5411, amount: 3100, category: 'Groceries', earned: 62, thisMonth: true },
      { date: '24 Mar', merchant: 'Third Wave Coffee (UPI QR)', mcc: 5814, amount: 420, category: 'Dining', earned: 0, better: { card: 'Paytm HDFC Select', value: 4, reason: 'Below ₹500 UPI minimum' }, thisMonth: true },
      { date: '21 Mar', merchant: 'MakeMyTrip', mcc: 4722, amount: 2500, category: 'Travel', earned: 50, thisMonth: true },
      { date: '18 Mar', merchant: 'Truffles (UPI QR)', mcc: 5812, amount: 1800, category: 'Dining', earned: 36, thisMonth: true },
      { date: '12 Mar', merchant: 'DMart (UPI QR)', mcc: 5411, amount: 3100, category: 'Groceries', earned: 62, thisMonth: true },
    ],
  },
  auLit: {
    limit: 100000,
    cycle: { start: '21 Mar', end: '20 Apr', daysLeft: 24 },
    lastStatement: { date: '20 Mar', amount: 0, minDue: 0, dueDate: '9 Apr', graceUntil: '12 Apr' },
    interestFreeDays: 44,
    nextDueDate: '10 May',
    autopay: { on: true, label: 'On: minimum due from HDFC XX8821' },
    split: { Travel: 11000, Dining: 3300, Fuel: 3000, Others: 2000 },
    rates: flat(0),
    rewards: { unit: 'Reward Points', rupeePerUnit: 0.25, lifetimeUnits: 0, note: 'Rewards add-on not activated, so everyday spends earn 0' },
    fees: { annual: 0, renews: 'Lifetime free', note: 'No annual fee; paid add-ons (rewards, lounge) are optional' },
    token: 'Tokenised on Paytm (RBI card-on-file) • token ••3307',
    transactions: [
      { date: '25 Mar', merchant: 'Air India (direct)', mcc: 4511, amount: 11000, category: 'Travel', earned: 0, better: { card: 'HDFC Diners Black', value: 366, reason: '3.3% vs 0%' }, thisMonth: true },
      { date: '23 Mar', merchant: 'HP Petrol Pump', mcc: 5541, amount: 3000, category: 'Fuel', earned: 0, better: { card: 'Scapia RuPay', value: 60, reason: '2% vs 0%' }, thisMonth: true },
      { date: '22 Mar', merchant: 'Decathlon', mcc: 5941, amount: 2000, category: 'Others', earned: 0, better: { card: 'HDFC Diners Black', value: 67, reason: '3.3% vs 0%' }, thisMonth: true },
      { date: '21 Mar', merchant: 'Meghana Foods', mcc: 5812, amount: 3300, category: 'Dining', earned: 0, better: { card: 'HDFC Diners Black', value: 110, reason: '3.3% vs 0%' }, thisMonth: true },
      { date: '14 Mar', merchant: 'PVR via Paytm Movies', mcc: 7832, amount: 900, category: 'Others', earned: 0, better: { card: 'Paytm HDFC Select', value: 45, reason: '5% Paytm Movies vs 0%' }, thisMonth: true },
    ],
  },
};

/** Late-payment slabs (illustrative, modelled on common Indian issuer MITCs). Charged only after the 3-day RBI grace window. */
export const LATE_FEE_SLABS: Array<{ upTo: number; fee: number; label: string }> = [
  { upTo: 500, fee: 0, label: 'Up to ₹500' },
  { upTo: 5000, fee: 500, label: '₹501 – ₹5,000' },
  { upTo: 10000, fee: 600, label: '₹5,001 – ₹10,000' },
  { upTo: 25000, fee: 800, label: '₹10,001 – ₹25,000' },
  { upTo: 50000, fee: 1100, label: '₹25,001 – ₹50,000' },
  { upTo: Infinity, fee: 1300, label: 'Above ₹50,000' },
];
