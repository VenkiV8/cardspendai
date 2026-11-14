import { Bot, Gift, Scale } from 'lucide-react';
import { useApp, type ConciergeView } from '../state/appState';
import { ChatView } from './concierge/ChatView';
import { UpgradeView } from './concierge/UpgradeView';
import { VaultView } from './concierge/VaultView';

const VIEWS: Array<{ id: ConciergeView; label: string; icon: typeof Bot }> = [
  { id: 'chat', label: 'Concierge', icon: Bot },
  { id: 'vault', label: 'Voucher Vault', icon: Gift },
  { id: 'upgrade', label: 'Upgrade Audit', icon: Scale },
];

export function ConciergeScreen() {
  const { state, dispatch } = useApp();
  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-[#F4F7FA]/95 px-4 pb-2.5 pt-3 backdrop-blur">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1 shadow-[inset_0_0_0_1px_#E2E8F0]">
          {VIEWS.map(({ id, label, icon: Icon }) => {
            const active = state.conciergeView === id;
            return (
              <button
                key={id}
                onClick={() => dispatch({ type: 'SET_CONCIERGE_VIEW', view: id })}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition ${
                  active ? 'bg-[#002E6E] text-white shadow-sm' : 'text-slate-500 hover:text-[#002E6E]'
                }`}
              >
                <Icon size={13} /> {label}
                {id === 'vault' && state.vouchers.length > 0 && (
                  <span className={`ml-0.5 rounded-full px-1.5 text-[9px] ${active ? 'bg-[#00B9F1]' : 'bg-[#EC184A] text-white'}`}>{state.vouchers.length}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div key={state.conciergeView} className="flex flex-1 flex-col animate-fade">
        {state.conciergeView === 'chat' && <ChatView />}
        {state.conciergeView === 'vault' && <VaultView />}
        {state.conciergeView === 'upgrade' && <UpgradeView />}
      </div>
    </div>
  );
}
