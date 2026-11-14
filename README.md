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

## Structure

| Path | Purpose |
| --- | --- |
| `src/data/cardsData.ts` | Seed portfolio (Arjun Mehta, 4 cards), issuer rules, MCC exclusions, offers, scenarios, vouchers, upgrade audit |
| `src/lib/routingEngine.ts` | Deterministic pre-swipe router: exclusions → capped accelerated rules (auto cap split) → base rate → instant offers; value-only ranking (co-brand weight 0.00) |
| `src/lib/ragEngine.ts` | Client-side "RAG" concierge: weighted intent matching, amount/date parsing, MITC/RBI citations; every ₹ figure comes from the routing engine or live state |
| `src/lib/telemetry.ts` | Per-screen inspector telemetry (latency, MCC, compliance tags, monetization hooks, guardrails) |
| `src/state/` | Reducer + context holding live balances, caps, consents, session savings, event log |
| `src/screens/` | Overview, Smart Checkout, AI Concierge (chat / vault / upgrade), Data & Privacy |
