# Paytm CardSense AI — Interactive Prototype

AI-powered credit card spend analyzer, benefit optimizer and pre-swipe checkout router, built as a mobile prototype inside a desktop presentation canvas with a PM Evaluator Inspector panel.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build (dist/)
npm run lint
```

Deploys to Vercel as a static Vite app (framework preset: Vite). No env vars or external APIs; everything runs client-side.

## Deep links

`#overview`, `#checkout/A|B|C`, `#concierge/chat|vault|upgrade`, `#privacy`

## Demo notes

- **Safe-to-Spend** = AA balance − unbilled card spends − unpaid billed dues (seed: ₹1,12,000 − ₹48,000 − ₹18,450 = ₹45,550). Paying the bill leaves it unchanged. Revoking BBPS or SMS consent drops that term and flags the figure as overstated; revoking AA pauses it.
- **Guided tour**: the ▶ button in the phone header resets the demo and walks through 4 steps (Overview alert → Simulate ₹12,500 → Smart Checkout switch → Concierge). The ↺ button resets the demo state.
- **Telemetry**: routing latency is measured in the browser with `performance.now()`. The 38ms production p95, the PII-egress figure and the 1.5s PDF parse are simulated and labelled that way.
- **Offers**: the AU Bank 12% flight discount and the ₹150 bill coupon are demo offer data, not live issuer offers.
- **Layout**: below 500px the device frame is dropped and the inspector opens as a bottom sheet. On larger screens the frame is sized to the viewport height. `prefers-reduced-motion` is respected.

## Structure

| Path | Purpose |
| --- | --- |
| `src/data/cardsData.ts` | Seed portfolio (Arjun Mehta, 4 cards), issuer rules, MCC exclusions, offers, scenarios, vouchers, upgrade audit |
| `src/lib/routingEngine.ts` | Deterministic pre-swipe router: exclusions → capped accelerated rules (auto cap split) → base rate → instant offers; value-only ranking (co-brand weight 0.00) |
| `src/lib/ragEngine.ts` | Client-side "RAG" concierge: weighted intent matching, amount/date parsing, MITC/RBI citations; every ₹ figure comes from the routing engine or live state |
| `src/lib/telemetry.ts` | Per-screen inspector telemetry (latency, MCC, compliance tags, monetization hooks, guardrails) |
| `src/lib/tour.ts` | Guided-tour steps, their target elements and completion checks |
| `src/state/` | Reducer + context holding live balances, caps, consents, session savings, event log |
| `src/screens/` | Overview, Smart Checkout, AI Concierge (chat / vault / upgrade), Data & Privacy |
