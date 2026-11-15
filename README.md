# Paytm CardSense AI — Interactive Prototype

AI-powered credit card spend analyzer, benefit optimizer and pre-swipe checkout router, shown as a tile inside a recreated Paytm home screen in a mobile frame.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build (dist/)
npm run lint
```

Deploys to Vercel as a static Vite app (framework preset: Vite). No env vars or external APIs; everything runs client-side.

## Flow

The app opens on a Paytm-style home screen (built with CSS and lucide icons, no logo image files). The pulsing **CardSense AI** tile, the first service in the grid, opens CardSense. All other tiles and the bottom nav show a "Demo: not part of this prototype" toast. Inside CardSense, the back arrow and the ↺ Reset button both return to the Paytm home screen.

## Deep links

Deep links skip the home screen: `#overview`, `#checkout/A|B|C`, `#vault`, `#vault/chat|upgrade`, `#privacy`. The old `#concierge` link opens Voucher Vault › Concierge.

## Demo notes

- **Safe-to-Spend** = AA balance − unbilled card spends − unpaid billed dues (seed: ₹1,12,000 − ₹48,000 − ₹18,450 = ₹45,550). Paying the bill leaves it unchanged. Revoking BBPS or SMS consent drops that term and flags the figure as overstated; revoking AA pauses it.
- **Urgent Actions** show one headline and one button each, soonest deadline first. The "i" button opens the full explanation (hover/focus popover with a mouse, bottom sheet on touch).
- **Card Detail**: every Portfolio card opens a full-screen page (actions first, then billing, utilisation, spend split, caps, rewards, milestones, fees, recent transactions, controls). Limits, cycles, categories, points and transactions are demo data in `src/data/cardProfiles.ts`; live figures come from the central store, so Simulate, Pay and Reset update them.
- **Guided tour**: "Guided tour" on the home screen (or ▶ in the CardSense header) resets the demo and walks through 5 steps: CardSense tile → Urgent Actions → Simulate ₹12,500 → Smart Checkout switch → Voucher Vault › Concierge.
- **Offers**: the AU Bank 12% flight discount and the ₹150 bill coupon are demo offer data, not live issuer offers.
- **Layout**: on desktop the phone frame is centred under the page title and sized to the viewport height. Below 500px the frame and bezel are dropped and the app renders full-bleed. `prefers-reduced-motion` turns off the tile pulse and other animations.

## Structure

| Path | Purpose |
| --- | --- |
| `src/data/cardsData.ts` | Seed portfolio (Venki, 4 cards), issuer rules, MCC exclusions, offers, scenarios, vouchers, upgrade audit |
| `src/data/cardProfiles.ts` | Card Detail demo data: limits, billing cycles, category splits, rewards ledgers, fees, recent transactions |
| `src/lib/routingEngine.ts` | Deterministic pre-swipe router: exclusions → capped accelerated rules (auto cap split) → base rate → instant offers; value-only ranking (co-brand weight 0.00) |
| `src/lib/ragEngine.ts` | Client-side "RAG" concierge: weighted intent matching, amount/date parsing, MITC/RBI citations; every ₹ figure comes from the routing engine or live state |
| `src/lib/tour.ts` | Guided-tour steps, their target elements and completion checks |
| `src/state/` | Reducer + context holding the surface (Paytm home / CardSense), live balances, caps, consents, transactions and session savings |
| `src/screens/` | Paytm home, Overview, Card Detail, Smart Checkout, Voucher Vault (vault / concierge / upgrade), Data & Privacy |
