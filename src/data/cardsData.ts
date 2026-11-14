/**
 * CardSense AI — seed portfolio & issuer rule book.
 * Everything here is static, client-side data. Live balances that change during the
 * demo live in `LiveCards` (see `initialLiveCards`) and are mutated only by the reducer.
 */

export type CardId = 'hdfcSelect' | 'dinersBlack' | 'scapia' | 'auLit';
export type InstrumentId = CardId | 'hdfcUpi';
export type Network = 'Visa' | 'Diners' | 'RuPay' | 'Mastercard';

/** Payment rails / surfaces where a transaction happens. */
export type Channel = 'bbps' | 'upiQr' | 'paytmFlights' | 'paytmMovies' | 'pos';

export interface RewardRule {
  id: string;
  label: string;
  rate: number;
  mccs?: number[];
  channels?: Channel[];
  monthlyCap?: number;
}

export interface Exclusion {
  mcc: number;
  label: string;
  source: string;
}

export interface InstantOffer {
  id: string;
  label: string;
  mccs: number[];
  channels: Channel[];
  kind: 'percent' | 'flat';
  value: number;
  maxDiscount?: number;
  minTxn: number;
  funding: string;
  /** Provenance shown in the UI. All offers in this prototype are illustrative demo data. */
  sourceNote: string;
}

export interface CardDefinition {
  id: CardId;
  name: string;
  shortName: string;
  bank: string;
  last4: string;
  network: Network;
  art: string;
  coBranded: boolean;
  annualFee: number;
  billingDay: number;
  capCycle: 'Calendar Month' | 'Statement Cycle';
  baseRate: number;
  baseMinTxn?: number;
  baseNote: string;
  rules: RewardRule[];
  exclusions: Exclusion[];
  offers: InstantOffer[];
  /** Channels on which this card is tokenised / accepted inside Paytm checkout. */
  channels: Channel[];
  upiHandle?: string;
  milestone?: {
    target: number;
    reward: number;
    rewardLabel: string;
    quarterEndDay: number;
    countsOn: 'Merchant Settlement Date';
    settlementLagDays: [number, number];
  };
  loungeGate?: { monthlyTarget: number; perk: string; effective: string };
  mitc: string;
}

export interface CardLive {
  unbilled: number;
  statementDue: number;
  dueInDays: number | null;
  capUsed: Record<string, number>;
  monthSpend: number;
  settled: number;
  pending: number;
}

export type LiveCards = Record<CardId, CardLive>;

/** Every instant offer in this prototype is illustrative, not a live issuer offer. */
export const DEMO_OFFER_NOTE = 'Demo offer data • modelled on public Paytm × issuer promo formats, not a live AU Bank offer';

export const USER = {
  name: 'Arjun Mehta',
  firstName: 'Arjun',
  persona: 'Multi-Card Pragmatist',
  city: 'Bengaluru',
  upiId: 'arjunmehta@pthdfc',
  /** Opaque random id — a name-based alias would leak identity (deck slide 5). */
  alias: 'u8f3k2@cardsense.paytm.com',
};

/** Demo "today": Friday, 27 March 2026 — 4 days before the Diners quarter closes. */
export const DEMO_DATE = {
  label: 'Fri, 27 Mar 2026',
  day: 27,
  month: 'March',
  monthShort: 'Mar',
  daysInMonth: 31,
};

export const SAVINGS_ACCOUNT = {
  bank: 'HDFC Bank',
  masked: 'XX8821',
  balance: 112000,
  aaPartner: 'Finvu / OneMoney AA',
};

export const CARDS: Record<CardId, CardDefinition> = {
  hdfcSelect: {
    id: 'hdfcSelect',
    name: 'Paytm HDFC Bank Select Credit Card',
    shortName: 'Paytm HDFC Select',
    bank: 'HDFC Bank',
    last4: '4821',
    network: 'Visa',
    art: 'from-[#002E6E] via-[#0A4FA3] to-[#00B9F1]',
    coBranded: true,
    annualFee: 1000,
    billingDay: 15,
    capCycle: 'Calendar Month',
    baseRate: 0.01,
    baseNote: '1% Cashpoints on other retail',
    rules: [
      {
        id: 'travelMovies',
        label: '5% Cashpoints on Paytm Travel & Movies',
        rate: 0.05,
        channels: ['paytmFlights', 'paytmMovies'],
        monthlyCap: 1000,
      },
      {
        id: 'utilRecharge',
        label: '3% on Utilities & Recharges via Paytm',
        rate: 0.03,
        mccs: [4900, 4814],
        channels: ['bbps'],
        monthlyCap: 500,
      },
    ],
    exclusions: [
      { mcc: 5541, label: 'Fuel', source: 'HDFC MITC §4.2' },
      { mcc: 6513, label: 'Rent', source: 'HDFC MITC §4.2' },
    ],
    offers: [],
    channels: ['bbps', 'paytmFlights', 'paytmMovies', 'pos'],
    mitc: 'Paytm HDFC Bank Select MITC (rev. Jan 2026)',
  },
  dinersBlack: {
    id: 'dinersBlack',
    name: 'HDFC Diners Club Black Metal Edition',
    shortName: 'HDFC Diners Black',
    bank: 'HDFC Bank',
    last4: '9014',
    network: 'Diners',
    art: 'from-[#0B0B0F] via-[#1F2937] to-[#4B5563]',
    coBranded: false,
    annualFee: 10000,
    billingDay: 5,
    capCycle: 'Statement Cycle',
    baseRate: 0.0333,
    baseNote: '5 Reward Points / ₹150 (≈3.3% on SmartBuy redemption)',
    rules: [],
    exclusions: [
      { mcc: 5541, label: 'Fuel', source: 'HDFC Diners MITC §3.1' },
      { mcc: 6513, label: 'Rent', source: 'HDFC Diners MITC §3.1' },
    ],
    offers: [],
    channels: ['pos'],
    milestone: {
      target: 400000,
      reward: 10000,
      rewardLabel: '₹10,000 Marriott / Flight Voucher',
      quarterEndDay: 31,
      countsOn: 'Merchant Settlement Date',
      settlementLagDays: [1, 3],
    },
    mitc: 'HDFC Diners Club Black Metal MITC (rev. Feb 2026)',
  },
  scapia: {
    id: 'scapia',
    name: 'Federal Bank Scapia Co-Branded RuPay Card',
    shortName: 'Scapia RuPay',
    bank: 'Federal Bank',
    last4: '3319',
    network: 'RuPay',
    art: 'from-[#5B21B6] via-[#7C3AED] to-[#F472B6]',
    coBranded: true,
    annualFee: 0,
    billingDay: 2,
    capCycle: 'Calendar Month',
    baseRate: 0.02,
    baseMinTxn: 500,
    baseNote: '2% rewards on eligible retail & UPI QR > ₹500',
    rules: [],
    exclusions: [
      { mcc: 4900, label: 'Utilities', source: 'Scapia MITC §5(b)' },
      { mcc: 6300, label: 'Insurance', source: 'Scapia MITC §5(b)' },
      { mcc: 6513, label: 'Rent', source: 'Scapia MITC §5(b)' },
    ],
    offers: [],
    channels: ['bbps', 'upiQr', 'paytmFlights', 'paytmMovies', 'pos'],
    upiHandle: '@pthdfc',
    loungeGate: {
      monthlyTarget: 20000,
      perk: 'Unlimited domestic airport lounge access next month',
      effective: '1 Feb 2026',
    },
    mitc: 'Federal Bank Scapia MITC (rev. Feb 2026)',
  },
  auLit: {
    id: 'auLit',
    name: 'AU Small Finance Bank LIT / Zenith+ Credit Card',
    shortName: 'AU Bank LIT',
    bank: 'AU Small Finance Bank',
    last4: '7742',
    network: 'Mastercard',
    art: 'from-[#7F1D1D] via-[#B45309] to-[#F59E0B]',
    coBranded: false,
    annualFee: 0,
    billingDay: 20,
    capCycle: 'Statement Cycle',
    baseRate: 0,
    baseNote: 'Rewards add-on not activated (LIT feature-based card)',
    rules: [],
    exclusions: [],
    offers: [
      {
        id: 'auFlight12',
        label: '12% Instant Discount on Paytm Domestic Flights',
        mccs: [4511],
        channels: ['paytmFlights'],
        kind: 'percent',
        value: 0.12,
        maxDiscount: 5000,
        minTxn: 10000,
        funding: 'Issuer-funded (AU Bank × Paytm Travel)',
        sourceNote: DEMO_OFFER_NOTE,
      },
      {
        id: 'auBill150',
        label: 'Flat ₹150 Instant Paytm Bill Pay Coupon',
        mccs: [4900],
        channels: ['bbps'],
        kind: 'flat',
        value: 150,
        minTxn: 1000,
        funding: 'Issuer-funded (AU Bank × Paytm BBPS)',
        sourceNote: DEMO_OFFER_NOTE,
      },
    ],
    channels: ['bbps', 'paytmFlights', 'paytmMovies', 'pos'],
    mitc: 'AU Bank LIT MITC & Paytm offer T&C (valid till 30 Apr 2026)',
  },
};

export const CARD_ORDER: CardId[] = ['hdfcSelect', 'dinersBlack', 'scapia', 'auLit'];

export const initialLiveCards: LiveCards = {
  hdfcSelect: {
    unbilled: 14200,
    statementDue: 18450,
    dueInDays: 2,
    capUsed: { utilRecharge: 480, travelMovies: 0 },
    monthSpend: 14200,
    settled: 0,
    pending: 0,
  },
  dinersBlack: {
    unbilled: 0,
    statementDue: 0,
    dueInDays: null,
    capUsed: {},
    monthSpend: 0,
    settled: 388000,
    pending: 0,
  },
  scapia: {
    unbilled: 14500,
    statementDue: 0,
    dueInDays: null,
    capUsed: {},
    monthSpend: 14500,
    settled: 0,
    pending: 0,
  },
  auLit: {
    unbilled: 19300,
    statementDue: 0,
    dueInDays: null,
    capUsed: {},
    monthSpend: 19300,
    settled: 0,
    pending: 0,
  },
};

/* ------------------------------------------------------------------ */
/* Checkout scenarios                                                  */
/* ------------------------------------------------------------------ */

export type ScenarioId = 'A' | 'B' | 'C';

export interface CheckoutScenario {
  id: ScenarioId;
  pill: string;
  title: string;
  merchant: string;
  subtitle: string;
  amount: number;
  mcc: number;
  mccLabel: string;
  channel: Channel;
  defaultInstrument: InstrumentId;
  category: string;
}

export const SCENARIOS: Record<ScenarioId, CheckoutScenario> = {
  A: {
    id: 'A',
    pill: 'Electricity Bill',
    title: 'Electricity Bill Payment',
    merchant: 'BESCOM',
    subtitle: 'Bangalore Electricity Supply Co. • Consumer ID 7420118835',
    amount: 4500,
    mcc: 4900,
    mccLabel: 'Utilities',
    channel: 'bbps',
    defaultInstrument: 'scapia',
    category: 'Utility',
  },
  B: {
    id: 'B',
    pill: 'Scan & Pay QR',
    title: 'Scan & Pay Merchant QR',
    merchant: 'FreshMart Supermarket',
    subtitle: 'HSR Layout, Bengaluru • Dynamic UPI QR',
    amount: 2800,
    mcc: 5411,
    mccLabel: 'Grocery Stores & Supermarkets',
    channel: 'upiQr',
    defaultInstrument: 'hdfcUpi',
    category: 'Grocery',
  },
  C: {
    id: 'C',
    pill: 'Paytm Flights',
    title: 'Paytm Flights • DEL → BLR',
    merchant: 'IndiGo 6E-2134',
    subtitle: 'Delhi T1 → Bengaluru T1 • 4 Apr 2026 • 1 Adult',
    amount: 40000,
    mcc: 4511,
    mccLabel: 'Airlines',
    channel: 'paytmFlights',
    defaultInstrument: 'hdfcSelect',
    category: 'Travel',
  },
};

export const SCENARIO_ORDER: ScenarioId[] = ['A', 'B', 'C'];

/* ------------------------------------------------------------------ */
/* Vouchers & upgrade audit                                            */
/* ------------------------------------------------------------------ */

export interface Voucher {
  id: string;
  title: string;
  issuer: string;
  value: string;
  code: string;
  expiresInDays: number;
  kind: 'membership' | 'voucher' | 'lounge' | 'milestone';
}

export const initialVouchers: Voucher[] = [
  {
    id: 'v-uber',
    title: '₹500 Uber / BookMyShow Milestone Voucher',
    issuer: 'Paytm HDFC Select • Q4 spend milestone',
    value: '₹500',
    code: 'PTMHDFC-UBR-58Q2',
    expiresInDays: 6,
    kind: 'voucher',
  },
  {
    id: 'v-lounge',
    title: 'Complimentary Lounge QR Pass',
    issuer: 'Scapia RuPay • March entitlement',
    value: '1 Visit',
    code: 'SCP-LNG-BLR-7731',
    expiresInDays: 4,
    kind: 'lounge',
  },
  {
    id: 'v-first',
    title: 'Paytm First Annual Membership',
    issuer: 'Paytm HDFC Select • Welcome benefit',
    value: '₹750',
    code: 'PFIRST-12M-ARJ9',
    expiresInDays: 41,
    kind: 'membership',
  },
];

export const MILESTONE_VOUCHER: Voucher = {
  id: 'v-diners-milestone',
  title: '₹10,000 Marriott / Flight Milestone Voucher',
  issuer: 'HDFC Diners Black • Q4 FY26 milestone',
  value: '₹10,000',
  code: 'DCB-MRT-Q4-10K',
  expiresInDays: 90,
  kind: 'milestone',
};

export const UPGRADE_AUDIT = {
  sixMonthLeakage: 9400,
  leakage: [
    { label: 'Calendar-month 3% cap overflow (Paytm HDFC Select)', value: 4300 },
    { label: 'Utility MCC 4900 swiped on Scapia (0% earn)', value: 2900 },
    { label: 'Insurance MCC 6300 & rent on excluded cards', value: 1400 },
    { label: 'Travel 5% cap overflow (₹1,000/mo ceiling)', value: 800 },
  ],
  candidate: {
    name: 'Paytm SBI Card SELECT',
    fee: 1499,
    grossAnnualGain: 9599,
    netAnnualGain: 8100,
    breakdown: [
      { label: 'Recaptured cap overflow (higher monthly ceiling)', value: 5840 },
      { label: 'Utilities & insurance earning (no MCC exclusion)', value: 2559 },
      { label: 'Welcome & renewal benefits (amortised)', value: 1200 },
    ],
  },
  alternatives: [
    { name: 'Paytm SBI Card SELECT', net: 8100, coBranded: true },
    { name: 'Axis Bank Ace (non-Paytm)', net: 6350, coBranded: false },
    { name: 'Keep current 4-card stack (optimised routing only)', net: 5200, coBranded: false },
  ],
};
