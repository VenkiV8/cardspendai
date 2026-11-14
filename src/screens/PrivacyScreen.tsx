import {
  Ban,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Database,
  FileText,
  Landmark,
  Loader2,
  Mail,
  Receipt,
  ShieldCheck,
  Smartphone,
  Upload,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Badge, Card, PrimaryButton, Toggle } from '../components/ui';
import { SAVINGS_ACCOUNT, USER } from '../data/cardsData';
import { formatINR } from '../lib/format';
import { totalBilledDue } from '../lib/routingEngine';
import { getSafeToSpend, useApp, type Consents } from '../state/appState';

const PDF_STEPS = ['Parsing PDF', 'Detecting MCCs', 'Updating Caps'];

export function PrivacyScreen() {
  const { state, dispatch } = useApp();
  const { safe, unbilled, billedDue, blind } = getSafeToSpend(state);
  const consentSwitch = (key: keyof Consents, name: string) => (
    <ConsentSwitch on={state.consents[key]} name={name} onToggle={() => dispatch({ type: 'TOGGLE_CONSENT', key })} />
  );

  return (
    <div className="space-y-4 px-4 pb-6 pt-4">
      <div className="rounded-3xl bg-gradient-to-br from-[#002E6E] to-[#0A4FA3] p-4 text-white">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#7FDBFF]">4-Tier Zero-Scrape Ingestion</p>
        <p className="mt-1 text-[15px] font-extrabold leading-snug">How CardSense sees your cards — without reading your inbox</p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/75">
          Credit cards aren't yet broadly live as FIPs on RBI's Account Aggregator network. Instead of invasive <code className="rounded bg-white/10 px-1">gmail.readonly</code> scraping, CardSense layers four consented sources.
        </p>
        <div className="mt-3 flex gap-2">
          <Badge tone="emerald" className="!border-white/20 !bg-white/10 !text-[#86EFAC]">
            <ShieldCheck size={11} /> DPDP Act 2023
          </Badge>
          <Badge tone="cyan" className="!border-white/20 !bg-white/10 !text-[#7FDBFF]">
            <Ban size={11} /> 0 Gmail scopes
          </Badge>
        </div>
      </div>

      <div className="relative space-y-3 pl-5">
        <div className="absolute bottom-6 left-[9px] top-6 w-0.5 bg-gradient-to-b from-[#00B9F1] via-[#00B9F1]/50 to-[#16A34A]" />

        <Tier
          n={1}
          icon={<Receipt size={17} />}
          title="RBI BBPS Bill Fetch & Paytm Native Logs"
          status={state.consents.bbps ? 'Active' : 'Paused'}
          active={state.consents.bbps}
          right={consentSwitch('bbps', 'BBPS bill fetch')}
        >
          Auto-synced across 35+ banks via Bharat BillPay: statement amount, due date and minimum due are fetched with your registered mobile number. Paytm checkout logs add exact MCCs.
          <Feeds on={state.consents.bbps} label="Feeds Safe-to-Spend" value={`−${formatINR(totalBilledDue(state.cards))} billed due`} />
        </Tier>

        <Tier
          n={2}
          icon={<Smartphone size={17} />}
          title="On-Device Android Edge SMS Sandbox"
          status={state.consents.sms ? 'Active' : 'Off'}
          active={state.consents.sms}
          right={consentSwitch('sms', 'On-device SMS sandbox')}
        >
          <Badge tone="emerald" className="mb-1.5 !whitespace-normal !rounded-lg">
            <Cpu size={11} /> 100% local regex/SLM parsing; raw SMS never leaves device — DPDP Act Compliant
          </Badge>
          <p>Captures real-time RuPay-on-UPI and card alerts the moment they arrive. Only structured fields (amount, merchant, card last-4) are stored.</p>
          <Feeds on={state.consents.sms} label="Feeds Safe-to-Spend" value={`−${formatINR(state.cards.scapia.unbilled)} RuPay-on-UPI unbilled`} />
        </Tier>

        <AliasTier />

        <Tier
          n={4}
          icon={<Landmark size={17} />}
          title="RBI Account Aggregator (CASA Balance Sync)"
          status={state.consents.aa ? 'Connected' : 'Revoked'}
          active={state.consents.aa}
          right={consentSwitch('aa', 'Account Aggregator consent')}
        >
          {state.consents.aa ? (
            <>
              Connected via {SAVINGS_ACCOUNT.aaPartner} • {SAVINGS_ACCOUNT.bank} {SAVINGS_ACCOUNT.masked} balance <b className="tabular text-[#002E6E]">{formatINR(state.bankBalance)}</b>. Consent: balance only, daily fetch, expires 27 Mar 2027.
            </>
          ) : (
            <>Consent artefact revoked. CardSense purged the cached balance (DPDP §8(7)). Safe-to-Spend is paused until you re-grant.</>
          )}
          <Feeds on={state.consents.aa} label="Feeds Safe-to-Spend" value={`${formatINR(state.bankBalance)} AA balance`} />
          <p className="mt-1 text-[10.5px] text-slate-400">Revocable 1-tap consent • ReBIT consent artefact v2.0</p>
        </Tier>
      </div>

      <Card className="p-3.5">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Pipeline output</p>
        <div className="grid grid-cols-2 gap-2 text-center">
          <Stat label="Safe-to-Spend" value={safe === null ? 'Paused' : formatINR(safe)} tone={safe !== null && safe < 0 ? 'text-[#EC184A]' : 'text-[#00B9F1]'} />
          <Stat label="Sources live" value={`${[state.consents.bbps, state.consents.sms, true, state.consents.aa].filter(Boolean).length}/4`} tone="text-[#16A34A]" />
          <Stat label="Unbilled seen" value={formatINR(unbilled)} tone="text-[#EC184A]" />
          <Stat label="Bills due seen" value={formatINR(billedDue)} tone="text-[#D97706]" />
        </div>
        <p className="tabular mt-2 text-center text-[10.5px] text-slate-500">
          {safe === null
            ? 'AA revoked: no balance to net against'
            : `${formatINR(state.bankBalance)} AA − ${formatINR(unbilled)} unbilled − ${formatINR(billedDue)} due = ${formatINR(safe)}`}
        </p>
        {blind.map((x) => (
          <p key={x.source} className="mt-1.5 rounded-lg bg-[#D97706]/10 px-2 py-1 text-[10.5px] font-semibold text-[#B45309]">
            Blind spot: {x.label} ({formatINR(x.amount)}) not counted. Safe-to-Spend is overstated.
          </p>
        ))}
      </Card>

      <Card className="p-3.5">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-slate-500">What CardSense never accesses</p>
        <ul className="space-y-1.5">
          {['Gmail / Outlook inbox (no gmail.readonly scope)', 'Raw SMS text (only on-device parsed fields)', 'Card number, CVV or OTPs (tokenised by network)', 'Contacts, photos or location'].map((t) => (
            <li key={t} className="flex items-center gap-2 text-[11.5px] text-slate-600">
              <Ban size={13} className="shrink-0 text-[#EC184A]" /> {t}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ConsentSwitch({ on, name, onToggle }: { on: boolean; name: string; onToggle: () => void }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <Toggle checked={on} onChange={onToggle} label={`${on ? 'Revoke' : 'Grant'} ${name} consent`} />
      <span className={`text-[9px] font-bold ${on ? 'text-slate-400' : 'text-[#EC184A]'}`}>{on ? 'Tap to revoke' : 'Revoked'}</span>
    </div>
  );
}

/** Shows what this tier contributes to Safe-to-Spend, struck through once its consent is revoked. */
function Feeds({ on, label, value }: { on: boolean; label: string; value: string }) {
  return (
    <p className={`mt-1.5 flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-[10.5px] font-semibold ${on ? 'bg-[#00B9F1]/10 text-[#0077A0]' : 'bg-slate-100 text-slate-400'}`}>
      <span>{on ? label : 'Dropped from Safe-to-Spend'}</span>
      <span className={`tabular ${on ? '' : 'line-through'}`}>{value}</span>
    </p>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl bg-[#F4F7FA] py-2">
      <p className={`tabular text-[14px] font-extrabold ${tone}`}>{value}</p>
      <p className="text-[9.5px] text-slate-500">{label}</p>
    </div>
  );
}

function Tier({ n, icon, title, status, active, right, children }: { n: number; icon: ReactNode; title: string; status: string; active: boolean; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="relative">
      <div className={`absolute -left-5 top-4 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold text-white ring-4 ring-[#F4F7FA] ${active ? 'bg-[#00B9F1]' : 'bg-slate-400'}`}>
        {n}
      </div>
      <Card className={`p-3.5 transition ${active ? '' : 'border-dashed opacity-70 grayscale'}`}>
        <div className="flex items-start gap-2.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-[#00B9F1]/10 text-[#0089B3]' : 'bg-slate-100 text-slate-400'}`}>{icon}</div>
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-bold uppercase tracking-wide text-slate-400">Tier {n}</p>
            <p className="text-[12.5px] font-bold leading-snug text-[#002E6E]">{title}</p>
            <Badge tone={active ? 'emerald' : 'slate'} className="mt-1">
              <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[#16A34A]' : 'bg-slate-400'}`} /> {status}
            </Badge>
          </div>
          {right}
        </div>
        <div className="mt-2 text-[11.5px] leading-relaxed text-slate-600">{children}</div>
      </Card>
    </div>
  );
}

function AliasTier() {
  const { state, dispatch } = useApp();
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(-1);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(USER.alias);
    } catch {
      /* ignore — clipboard can be blocked in iframes */
    }
    setCopied(true);
    timers.current.push(window.setTimeout(() => setCopied(false), 1600));
  };

  const simulate = () => {
    setStep(0);
    timers.current.push(window.setTimeout(() => setStep(1), 500));
    timers.current.push(window.setTimeout(() => setStep(2), 1000));
    timers.current.push(
      window.setTimeout(() => {
        setStep(3);
        dispatch({ type: 'IMPORT_PDF' });
        dispatch({ type: 'TOAST', message: 'New ₹6,400 dining txn detected — Safe-to-Spend updated' });
      }, 1500),
    );
  };

  const running = step >= 0 && step < 3;
  const done = state.pdfImported;

  return (
    <Tier n={3} icon={<Mail size={17} />} title="Virtual Statement Forwarding Alias" status="Active • Opt-in" active>
      <p>Set a one-time forwarding rule for card e-statements only. PDFs are parsed in an isolated enclave and deleted after extraction.</p>
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F4F7FA] px-2.5 py-2">
        <Mail size={13} className="shrink-0 text-[#0089B3]" />
        <code className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#002E6E]">{USER.alias}</code>
        <button onClick={copy} className="flex shrink-0 items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-[10.5px] font-bold text-[#002E6E] hover:border-[#00B9F1]">
          {copied ? <Check size={12} className="text-[#16A34A]" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy Alias'}
        </button>
      </div>

      {(running || (step === 3 && done)) && (
        <div className="mt-2.5 space-y-1.5 rounded-xl border border-[#E2E8F0] p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#002E6E]">
            <FileText size={13} className="text-[#EC184A]" /> HDFC_Select_Statement_Mar2026.pdf <span className="text-slate-400">• 214 KB</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#00B9F1] transition-all duration-500 ease-linear" style={{ width: `${(Math.min(step + 1, 3) / 3) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between">
            {PDF_STEPS.map((s, i) => (
              <span key={s} className={`flex items-center gap-1 text-[10px] font-semibold ${i < step || step === 3 ? 'text-[#16A34A]' : i === step ? 'text-[#00B9F1]' : 'text-slate-300'}`}>
                {i < step || step === 3 ? <CheckCircle2 size={11} /> : i === step ? <Loader2 size={11} className="animate-spin" /> : <Database size={11} />}
                {s}
                {i < PDF_STEPS.length - 1 && <span className="ml-1 text-slate-300">→</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {done && (
        <div className="mt-2.5 rounded-xl border border-[#16A34A]/30 bg-[#16A34A]/5 p-2.5 animate-fadeIn">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#15803D]">New transaction detected</p>
          <div className="mt-1 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-bold text-[#002E6E]">Toit Brewpub, Indiranagar</p>
              <p className="text-[10.5px] text-slate-500">MCC 5812 • Dining • Paytm HDFC Select •••4821 • 24 Mar</p>
            </div>
            <p className="tabular text-[14px] font-extrabold text-[#EC184A]">{formatINR(6400)}</p>
          </div>
          <p className="mt-1 text-[10.5px] text-[#15803D]">Safe-to-Spend recalculated across the app • 1% base Cashpoints (₹64) attributed</p>
        </div>
      )}

      <PrimaryButton className="mt-2.5 w-full" tone={done ? 'emerald' : 'cyan'} onClick={simulate} disabled={running || done}>
        {running ? (
          <>
            <Loader2 size={13} className="animate-spin" /> {PDF_STEPS[step]}…
          </>
        ) : done ? (
          <>
            <CheckCircle2 size={13} /> March statement imported
          </>
        ) : (
          <>
            <Upload size={13} /> Simulate Monthly PDF Statement Upload
          </>
        )}
      </PrimaryButton>
    </Tier>
  );
}
