import { BadgeCheck, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge, Card, Meter, PrimaryButton } from '../../components/ui';
import { UPGRADE_AUDIT } from '../../data/cardsData';
import { formatINR } from '../../lib/format';
import { CO_BRAND_BIAS_WEIGHT } from '../../lib/routingEngine';
import { useApp } from '../../state/appState';

export function UpgradeView() {
  const { dispatch } = useApp();
  const a = UPGRADE_AUDIT;
  const maxNet = Math.max(...a.alternatives.map((x) => x.net));

  return (
    <div className="space-y-3 px-4 pb-6 pt-3">
      <Card className="p-4">
        <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#EC184A]">
          <TrendingDown size={13} /> 6-month leakage audit
        </p>
        <p className="mt-1 text-[14px] font-bold leading-snug text-[#002E6E]">
          You lost <span className="text-[#EC184A]">{formatINR(a.sixMonthLeakage)}</span> over the last 6 months to calendar-month cap overflows &amp; excluded utility MCCs.
        </p>
        <div className="mt-3 space-y-2">
          {a.leakage.map((l) => (
            <div key={l.label}>
              <div className="mb-0.5 flex justify-between gap-2 text-[11px]">
                <span className="text-slate-600">{l.label}</span>
                <span className="tabular font-bold text-[#EC184A]">{formatINR(l.value)}</span>
              </div>
              <Meter max={a.sixMonthLeakage} segments={[{ value: l.value, tone: 'crimson' }]} height="h-1.5" />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-400">Counterfactual replay of 412 transactions (Oct 2025 – Mar 2026) against current issuer MITCs.</p>
      </Card>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-[#002E6E] to-[#0A4FA3] p-4 text-white">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#7FDBFF]">CardSense recommends</p>
          <p className="mt-0.5 text-[17px] font-extrabold">{a.candidate.name}</p>
          <div className="mt-2 flex items-end gap-2">
            <p className="tabular text-[28px] font-extrabold leading-none text-[#4ADE80]">+{formatINR(a.candidate.netAnnualGain)}</p>
            <p className="pb-0.5 text-[11px] text-white/70">net annual gain after {formatINR(a.candidate.fee)} fee</p>
          </div>
        </div>
        <div className="space-y-1 p-4">
          {a.candidate.breakdown.map((b) => (
            <div key={b.label} className="flex justify-between gap-2 text-[11.5px]">
              <span className="text-slate-600">{b.label}</span>
              <span className="tabular font-semibold text-[#16A34A]">+{formatINR(b.value)}</span>
            </div>
          ))}
          <div className="flex justify-between text-[11.5px]">
            <span className="text-slate-600">Annual fee (not waived in year 1)</span>
            <span className="tabular font-semibold text-[#EC184A]">−{formatINR(a.candidate.fee)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-dashed border-slate-300 pt-1.5 text-[12.5px] font-bold text-[#002E6E]">
            <span>Net annual gain</span>
            <span className="tabular text-[#16A34A]">{formatINR(a.candidate.grossAnnualGain - a.candidate.fee)}</span>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
          <TrendingUp size={13} /> Ranked by net value only
        </p>
        <div className="space-y-2.5">
          {a.alternatives.map((alt, i) => (
            <div key={alt.name}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[11.5px]">
                <span className="flex items-center gap-1.5 font-semibold text-[#002E6E]">
                  <span className="text-slate-400">#{i + 1}</span> {alt.name}
                  {alt.coBranded && <Badge tone="cyan">Paytm co-brand</Badge>}
                </span>
                <span className="tabular font-bold text-[#002E6E]">{formatINR(alt.net)}</span>
              </div>
              <Meter max={maxNet} segments={[{ value: alt.net, tone: i === 0 ? 'emerald' : 'slate' }]} height="h-1.5" />
            </div>
          ))}
        </div>
      </Card>

      <div className="rounded-2xl border-2 border-[#16A34A]/40 bg-[#16A34A]/5 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#16A34A] text-white">
            <Scale size={18} />
          </div>
          <div>
            <p className="text-[13px] font-extrabold text-[#15803D]">Neutrality Guarantee</p>
            <p className="text-[10px] font-semibold text-[#16A34A]">Co-brand bias weight: {CO_BRAND_BIAS_WEIGHT.toFixed(2)} • audited</p>
          </div>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-[#14532D]">
          "We never bias checkout routing toward co-branded cards when a card you already own earns higher net value."
        </p>
        <ul className="mt-2 space-y-1 text-[11px] text-[#166534]">
          {['Paytm earns a disclosed sourcing fee if you apply — it never enters the ranking formula', 'Checkout routing evaluates only cards you hold, by rupee value', 'Recommendation is suppressed if net gain < ₹2,000/yr'].map((t) => (
            <li key={t} className="flex gap-1.5">
              <BadgeCheck size={13} className="mt-[1px] shrink-0" /> {t}
            </li>
          ))}
        </ul>
      </div>

      <PrimaryButton
        className="w-full py-2.5"
        tone="navy"
        onClick={() => {
          dispatch({ type: 'TOAST', message: 'Eligibility check started — soft pull only, no CIBIL impact' });
          dispatch({ type: 'LOG', text: 'Upgrade: soft eligibility check for Paytm SBI Card SELECT' });
        }}
      >
        Check eligibility (soft pull, no score impact)
      </PrimaryButton>
    </div>
  );
}
