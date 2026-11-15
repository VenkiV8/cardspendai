import { Check, Copy, Crown, ExternalLink, Gift, Plane, QrCode, Ticket } from 'lucide-react';
import { useState } from 'react';
import { Badge, Card, PrimaryButton } from '../../components/ui';
import type { Voucher } from '../../data/cardsData';
import { useApp } from '../../state/appState';

const KIND_ICON: Record<Voucher['kind'], typeof Gift> = { membership: Crown, voucher: Ticket, lounge: QrCode, milestone: Plane };

export function VaultView() {
  const { state } = useApp();
  const sorted = [...state.vouchers].sort((a, b) => a.expiresInDays - b.expiresInDays);
  const expiringSoon = sorted.filter((v) => v.expiresInDays <= 7).length;

  return (
    <div className="space-y-3 px-4 pb-6 pt-3">
      <div className="rounded-2xl bg-gradient-to-br from-[#002E6E] to-[#0A4FA3] p-4 text-white">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#7FDBFF]">Voucher &amp; Perks Vault</p>
        <p className="mt-1 text-[20px] font-extrabold">{state.vouchers.length} active perks</p>
        <p className="text-[11.5px] text-white/70">{expiringSoon} expiring within 7 days • auto-synced from issuer ledgers</p>
      </div>
      {sorted.map((v) => (
        <VoucherCard key={v.id} v={v} />
      ))}
      {!state.vouchers.some((v) => v.kind === 'milestone') && (
        <p className="rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-center text-[11px] text-slate-500">
          🔒 ₹10,000 Diners milestone voucher appears here once ₹4,00,000 settles before 31 Mar.
        </p>
      )}
    </div>
  );
}

function VoucherCard({ v }: { v: Voucher }) {
  const { dispatch } = useApp();
  const [copied, setCopied] = useState(false);
  const Icon = KIND_ICON[v.kind];
  const urgent = v.expiresInDays <= 7;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(v.code);
    } catch {
      /* clipboard may be blocked in some embeds — still show confirmation of the code */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Card className={`overflow-hidden ${v.kind === 'milestone' ? 'ring-2 ring-[#16A34A]/40 animate-fadeIn' : ''}`}>
      <div className="flex gap-3 p-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${v.kind === 'milestone' ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#00B9F1]/10 text-[#0089B3]'}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12.5px] font-bold leading-snug text-[#002E6E]">{v.title}</p>
            <span className="tabular shrink-0 text-[13px] font-extrabold text-[#16A34A]">{v.value}</span>
          </div>
          <p className="text-[10.5px] text-slate-500">{v.issuer}</p>
          <div className="mt-1.5">
            <Badge tone={urgent ? (v.expiresInDays <= 4 ? 'crimson' : 'amber') : 'emerald'}>
              {urgent ? `Expires in ${v.expiresInDays} days` : `${v.expiresInDays} days left`}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-dashed border-[#E2E8F0] bg-[#F4F7FA] px-3 py-2">
        <code className="tabular min-w-0 flex-1 truncate text-[11.5px] font-bold tracking-wider text-[#002E6E]">{v.code}</code>
        <button onClick={copy} className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-[10.5px] font-bold text-[#002E6E] hover:border-[#00B9F1]">
          {copied ? <Check size={12} className="text-[#16A34A]" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy Code'}
        </button>
        <PrimaryButton
          className="!px-2.5 !py-1 !text-[10.5px]"
          onClick={() => {
            dispatch({ type: 'TOAST', message: `Opening ${v.title.split(' ').slice(0, 3).join(' ')} on Paytm…` });
          }}
        >
          Redeem on Paytm <ExternalLink size={11} />
        </PrimaryButton>
      </div>
    </Card>
  );
}
