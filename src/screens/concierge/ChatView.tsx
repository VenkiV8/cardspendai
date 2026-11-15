import { ArrowRight, Bot, FileText, Send, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTourTarget } from '../../components/Tour';
import { prefersReducedMotion } from '../../lib/motion';
import { answerQuery, STARTER_PROMPTS, type FactRow, type RagResponse } from '../../lib/ragEngine';
import { getSafeToSpend, useApp } from '../../state/appState';

/** Reveals text word by word, like a streamed LLM reply. Instant under prefers-reduced-motion. */
function useStreamedText(text: string): { shown: string; done: boolean } {
  const words = text.split(' ');
  const [count, setCount] = useState(() => (prefersReducedMotion() ? words.length : 0));
  useEffect(() => {
    if (count >= words.length) return;
    const t = window.setTimeout(() => setCount((c) => Math.min(words.length, c + 2)), 28);
    return () => window.clearTimeout(t);
  }, [count, words.length]);
  return { shown: words.slice(0, count).join(' '), done: count >= words.length };
}

type Message = { id: number; role: 'user'; text: string } | { id: number; role: 'bot'; response: RagResponse };

const verdictStyle: Record<RagResponse['verdict']['tone'], string> = {
  good: 'bg-[#16A34A]/10 text-[#15803D] border-[#16A34A]/25',
  bad: 'bg-[#EC184A]/10 text-[#B3123A] border-[#EC184A]/25',
  warn: 'bg-[#D97706]/10 text-[#B45309] border-[#D97706]/25',
  info: 'bg-[#00B9F1]/10 text-[#0077A0] border-[#00B9F1]/25',
};

const factTone = (t?: FactRow['tone']) => (t === 'good' ? 'text-[#16A34A]' : t === 'bad' ? 'text-[#EC184A]' : t === 'warn' ? 'text-[#D97706]' : 'text-[#002E6E]');

export function ChatView() {
  const { state, dispatch } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const seq = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const chipsTour = useTourTarget('chips');

  const scrollToEnd = () => endRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'end' });
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'end' });
  }, [messages, typing]);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q || typing) return;
    seq.current += 1;
    setMessages((m) => [...m, { id: seq.current, role: 'user', text: q }]);
    setInput('');
    setTyping(true);
    const sts = getSafeToSpend(state);
    const response = answerQuery(q, {
      cards: state.cards,
      bankBalance: state.bankBalance,
      billPaid: state.billPaid,
      aaConnected: state.consents.aa,
      safeToSpend: sts.safe,
      billedDue: sts.billedDue,
      unbilledSeen: sts.unbilled,
    });
    dispatch({ type: 'SET_INTENT', intent: response.intent, query: q });
    window.setTimeout(() => {
      seq.current += 1;
      setMessages((m) => [...m, { id: seq.current, role: 'bot', response }]);
      setTyping(false);
    }, 650);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 px-4 pb-3 pt-3">
        <div className="flex gap-2">
          <BotAvatar />
          <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-[#E2E8F0] bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-[#002E6E]">
            Hi Venki, I'm your CardSense Benefit Concierge. I answer only from your issuers' <b>MITC documents</b>, <b>RBI/NPCI rules</b> and your <b>live card state</b>, with every rupee figure computed by the deterministic rule engine.
          </div>
        </div>

        {messages.length === 0 && (
          <div ref={chipsTour.ref} className={`space-y-2 pl-10 ${chipsTour.className}`}>
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Try asking</p>
            {STARTER_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => ask(p)}
                className="block w-full rounded-xl border border-[#00B9F1]/30 bg-white px-3 py-2 text-left text-[12px] font-semibold text-[#002E6E] transition hover:border-[#00B9F1] hover:bg-[#00B9F1]/5"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end animate-fadeIn">
              <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-[#00B9F1] px-3 py-2 text-[12.5px] font-medium text-white">{m.text}</div>
            </div>
          ) : (
            <BotAnswer key={m.id} r={m.response} onAsk={ask} onStreamed={scrollToEnd} />
          ),
        )}

        {typing && (
          <div className="flex gap-2 animate-fadeIn">
            <BotAvatar />
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-[#E2E8F0] bg-white px-3 py-2.5">
              <span className="text-[10.5px] font-semibold text-slate-400">Retrieving MITC clauses</span>
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00B9F1]" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && !typing && (
          <p className="pl-10 text-[10px] font-semibold text-slate-400">Or type your own question below. Answers come only from MITCs.</p>
        )}
        {messages.length > 0 && !typing && (
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pl-14">
            {STARTER_PROMPTS.map((p) => (
              <button key={p} onClick={() => ask(p)} className="shrink-0 rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[10.5px] font-semibold text-[#002E6E] hover:border-[#00B9F1]">
                {p.length > 38 ? `${p.slice(0, 36)}…` : p}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="sticky bottom-0 border-t border-[#E2E8F0] bg-white px-3 py-2.5">
        <div className="flex items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-[#F4F7FA] py-1 pl-3 pr-1 focus-within:border-[#00B9F1]">
          <Sparkles size={15} className="shrink-0 text-[#00B9F1]" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any card, spend, cap or bill…"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[12.5px] text-[#002E6E] placeholder:text-slate-400 focus:outline-none"
            aria-label="Ask CardSense"
          />
          <button type="submit" disabled={!input.trim() || typing} className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00B9F1] text-white transition disabled:opacity-40" aria-label="Send">
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}

function BotAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#002E6E] to-[#00B9F1] text-white">
      <Bot size={16} />
    </div>
  );
}

function BotAnswer({ r, onAsk, onStreamed }: { r: RagResponse; onAsk: (q: string) => void; onStreamed: () => void }) {
  const { dispatch } = useApp();
  const isFallback = r.intent === 'fallback.clarify';
  const { shown, done } = useStreamedText(r.answer);
  useEffect(() => {
    if (done) onStreamed();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scroll once when streaming completes
  }, [done]);
  return (
    <div className="flex gap-2 animate-fadeIn">
      <BotAvatar />
      <div className="min-w-0 max-w-[86%] flex-1 overflow-hidden rounded-2xl rounded-tl-md border border-[#E2E8F0] bg-white">
        <div className="px-3 pb-2 pt-2.5">
          <p className="text-[13px] font-extrabold leading-snug text-[#002E6E]">{r.title}</p>
          <div className={`mt-1.5 inline-block rounded-lg border px-2 py-1 text-[11px] font-bold ${verdictStyle[r.verdict.tone]}`}>{r.verdict.text}</div>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-600" aria-live="polite" aria-busy={!done}>
            {shown}
            {!done && <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-[#00B9F1]" aria-hidden />}
          </p>
        </div>
        {done && (
          <div className="animate-fade">

        {r.facts.length > 0 && (
          <div className="mx-3 mb-2 overflow-hidden rounded-xl border border-[#E2E8F0]">
            <p className="bg-[#F4F7FA] px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wide text-slate-500">Deterministic numbers</p>
            {r.facts.map((f) => (
              <div key={f.label} className="flex items-start justify-between gap-2 border-t border-[#E2E8F0] px-2.5 py-1.5 text-[11px]">
                <span className="text-slate-500">{f.label}</span>
                <span className={`tabular text-right font-bold ${factTone(f.tone)}`}>{f.value}</span>
              </div>
            ))}
          </div>
        )}

        {r.bullets.length > 0 && (
          <ul className="space-y-1 px-3 pb-2">
            {r.bullets.map((b) =>
              isFallback ? (
                <li key={b}>
                  <button onClick={() => onAsk(b)} className="w-full rounded-lg border border-[#00B9F1]/30 px-2 py-1 text-left text-[11.5px] font-semibold text-[#0077A0] hover:bg-[#00B9F1]/5">
                    {b}
                  </button>
                </li>
              ) : (
                <li key={b} className="flex gap-1.5 text-[11px] leading-snug text-slate-600">
                  <span className="text-[#00B9F1]">•</span>
                  {b}
                </li>
              ),
            )}
          </ul>
        )}

        {r.citations.length > 0 && (
          <div className="space-y-1 border-t border-[#E2E8F0] bg-[#F4F7FA] px-3 py-2">
            {r.citations.map((c) => (
              <div key={c.source + c.clause} className="flex gap-1.5 text-[10px] leading-snug">
                <FileText size={11} className="mt-[1px] shrink-0 text-[#002E6E]" />
                <span className="text-slate-600">
                  <b className="text-[#002E6E]">{c.source}</b> — {c.clause} <span className="text-slate-400">• eff. {c.effective}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-[#E2E8F0] px-3 py-1.5">
          <span className="text-[9.5px] text-slate-400">
            {r.chunks} chunks • {r.retrievalMs}ms • intent <code className="text-slate-500">{r.intent}</code>
          </span>
          {r.action && (
            <button
              onClick={() => {
                if (r.action!.scenario) dispatch({ type: 'SET_SCENARIO', scenario: r.action!.scenario });
                dispatch({ type: 'SET_TAB', tab: r.action!.tab });
              }}
              className="flex shrink-0 items-center gap-0.5 text-[10.5px] font-bold text-[#00B9F1]"
            >
              {r.action.label} <ArrowRight size={11} />
            </button>
          )}
        </div>
          </div>
        )}
      </div>
    </div>
  );
}
