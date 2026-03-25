/**
 * Zustand store para layout do escritório isométrico.
 *
 * - Modo offline: usa localStorage + API local (comportamento anterior).
 * - Modo realtime: usa Supabase Broadcast para sincronizar posições de móveis
 *   e agentes entre múltiplos clientes em tempo real.
 *
 * O motor `office.js` continua a ser a fonte de verdade do estado visual do Canvas.
 * Este store é a "ponte" que propaga alterações para outros clientes conectados.
 */
import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const SUPABASE_TABLE = 'office_layout';
const SUPABASE_ROW_ID = 'default';
const BROADCAST_CHANNEL = 'office-layout-broadcast';

export type OfficeLayout = {
  version: number;
  positions: Record<string, { x: number; y: number }>;
  furniture: Record<string, unknown>;
};

export type OfficeStoreState = {
  /** Layout mais recente recebido de outro cliente (null = nenhum ainda). */
  remoteLayout: OfficeLayout | null;
  realtimeConnected: boolean;
  /** Publica um layout local para todos os outros clientes via broadcast. */
  broadcastLayout: (layout: OfficeLayout) => void;
  /** Persiste layout no Supabase (table upsert — chamado ao soltar arrastar). */
  persistLayout: (layout: OfficeLayout) => Promise<void>;
  /** Subscreve ao canal broadcast + tabela Postgres. */
  subscribeRealtime: (onRemoteLayout: (layout: OfficeLayout) => void) => () => void;
};

export const useOfficeStore = create<OfficeStoreState>((set) => ({
  remoteLayout: null,
  realtimeConnected: false,

  broadcastLayout(layout) {
    if (!isSupabaseConfigured || !supabase) return;
    const sb = supabase;
    sb.channel(BROADCAST_CHANNEL).send({
      type: 'broadcast',
      event: 'layout-changed',
      payload: layout,
    });
  },

  async persistLayout(layout) {
    if (!isSupabaseConfigured || !supabase) return;
    const sb = supabase;
    const { error } = await sb
      .from(SUPABASE_TABLE)
      .upsert({ id: SUPABASE_ROW_ID, layout, updated_at: new Date().toISOString() });
    if (error) console.warn('[supabase] office_layout upsert failed:', error.message);
  },

  subscribeRealtime(onRemoteLayout) {
    if (!isSupabaseConfigured || !supabase) return () => {};
    const sb = supabase;

    // Canal broadcast: recebe movimentos "ao vivo" enquanto arrastar.
    const broadcastCh = sb
      .channel(BROADCAST_CHANNEL)
      .on('broadcast', { event: 'layout-changed' }, (msg) => {
        const layout = msg.payload as OfficeLayout;
        if (layout) {
          set({ remoteLayout: layout });
          onRemoteLayout(layout);
        }
      })
      .subscribe((status) => set({ realtimeConnected: status === 'SUBSCRIBED' }));

    // Canal Postgres: recebe persistências finais de outros clientes.
    const pgCh = sb
      .channel('office-layout-pg')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SUPABASE_TABLE, filter: `id=eq.${SUPABASE_ROW_ID}` },
        (payload) => {
          const layout = (payload.new as { layout?: OfficeLayout })?.layout;
          if (layout) {
            set({ remoteLayout: layout });
            onRemoteLayout(layout);
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(broadcastCh);
      sb.removeChannel(pgCh);
      set({ realtimeConnected: false });
    };
  },
}));
