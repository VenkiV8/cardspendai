import { Activity, BadgeIndianRupee, ChevronDown, Gauge, Hash, RotateCcw, ScrollText, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { formatINR } from '../lib/format';
import { totalLiability } from '../lib/routingEngine';
import { getTelemetry } from '../lib/telemetry';
import { sessionSaved, useApp } from '../state/appState';
import { Toggle } from './ui';

export function InspectorPanel() {
  const { state, dispatch } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = getTelemetry(state);
  const safe = state.bankBalance - totalLiability(state.cards);

  return (
    <aside className="w-full max-w-[420px] lg:sticky lg:top-10 lg:w-[380px] lg:max-w-none">
      <div className="overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-[0_10px_40px_-15px_rgba(0,46,110,0.25)]">
        <button
          className="flex w-full items-center justify-between gap-3 bg-[#002E6E] px-5 py-4 text-left text-white lg:cursor-default"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00B9F1]">Evaluator mode</p>
            <h2 className="text-[15px] font-bold">PM Evaluator Inspector Panel</h2>
          </div>
          <ChevronDown size={18} className={`transition lg:hidden ${mobileOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className={`${mobileOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-5 py-3.5">
            <span className="text-[12px] font-semibold text-[#002E6E]">
              Show PM &amp; AI Guardrail Telemetry:{' '}
              <span className={state.telemetryOn ? 'text-[#16A34A]' : 'text-slate-400'}>{state.telemetryOn ? 'ON' : 'OFF'}</span>
            </span>
            <Toggle checked={state.telemetryOn} onChange={() => dispatch({ type: 'TOGGLE_TELEMETRY' })} label="Toggle telemetry" />
          </div>

          {state.telemetryOn ? (
            <div key={t.screen} className="space-y-3 p-5 animate-fadeIn">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16A34A]" />
                </span>
                Live • {t.screen}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Tile icon={<Gauge size={14} />} label="Deterministic Routing Latency" value={t.latency} sub={t.latencyNote} accent="text-[#00B9F1]" />
                <Tile icon={<Hash size={14} />} label="Active MCC Code" value={t.mcc.split(' — ')[0].split(' • ')[0]} sub={t.mcc.includes('—') ? t.mcc.split(' — ')[1] : t.mcc.split(' • ').slice(1).join(' • ') || '—'} />
              </div>

              <Block icon={<ShieldCheck size={14} className="text-[#16A34A]" />} title="RBI / DPDP Compliance Tag">
                <div className="flex flex-wrap gap-1.5">
                  {t.compliance.map((c) => (
                    <span key={c} className="rounded-md border border-[#16A34A]/25 bg-[#16A34A]/10 px-2 py-1 text-[10.5px] font-semibold text-[#15803D]">
                      {c}
                    </span>
                  ))}
                </div>
              </Block>

              <Block icon={<BadgeIndianRupee size={14} className="text-[#D97706]" />} title="Paytm Monetization Hook">
                <p className="text-[12px] leading-snug text-[#002E6E]">{t.monetization}</p>
              </Block>

              <Block icon={<Activity size={14} className="text-[#00B9F1]" />} title="AI Guardrails">
                <ul className="space-y-1.5">
                  {t.guardrails.map((g) => (
                    <li key={g.label} className="flex items-center justify-between gap-2 text-[11.5px]">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        {g.ok ? <ShieldCheck size={12} className="text-[#16A34A]" /> : <ShieldAlert size={12} className="text-[#EC184A]" />}
                        {g.label}
                      </span>
                      <span className={`font-semibold ${g.ok ? 'text-[#002E6E]' : 'text-[#EC184A]'}`}>{g.value}</span>
                    </li>
                  ))}
                </ul>
              </Block>

              <div className="grid grid-cols-2 gap-2.5">
                <Tile label="Safe-to-Spend (live)" value={state.consents.aa ? formatINR(safe) : 'AA off'} />
                <Tile label="Session rewards saved" value={formatINR(sessionSaved(state))} accent="text-[#16A34A]" />
              </div>

              <Block icon={<ScrollText size={14} className="text-slate-500" />} title="Event log">
                <ol className="thin-scrollbar max-h-40 space-y-1 overflow-y-auto pr-1">
                  {state.events.map((e) => (
                    <li key={e.id} className="flex gap-2 text-[11px] leading-snug">
                      <span className="tabular shrink-0 text-slate-400">{e.time}</span>
                      <span className="text-[#002E6E]">{e.text}</span>
                    </li>
                  ))}
                </ol>
              </Block>
            </div>
          ) : (
            <p className="px-5 py-6 text-[12px] text-slate-500">Telemetry hidden. Toggle ON to inspect routing latency, MCC resolution, compliance tags and monetization hooks for each screen.</p>
          )}

          <div className="border-t border-[#E2E8F0] px-5 py-3">
            <button
              onClick={() => dispatch({ type: 'RESET' })}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-[#002E6E]"
            >
              <RotateCcw size={13} /> Reset demo state
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Tile({ label, value, sub, icon, accent = 'text-[#002E6E]' }: { label: string; value: string; sub?: string; icon?: ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F4F7FA] p-3">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </p>
      <p className={`tabular mt-1 text-[20px] font-extrabold leading-tight ${accent}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">{sub}</p>}
    </div>
  );
}

function Block({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}
