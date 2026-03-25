import { useEffect, useRef, useState } from 'react';
import type { ActivityEntry, AgentRow } from '../types/hub';

interface UseActivityStreamOptions {
  onActivity: (entry: ActivityEntry) => void;
  onAgents: (agents: AgentRow[]) => void;
  onSnapshot: (data: { agents: AgentRow[]; logs: ActivityEntry[] }) => void;
  enabled: boolean;
}

/**
 * Hook que mantém uma ligação SSE a GET /api/aiox/events/stream.
 * Recebe eventos push de actividade e lista de agentes em tempo real.
 * Mantém polling como fallback (o caller continua a fazer poll, mas com intervalo mais longo).
 */
export function useActivityStream({
  onActivity,
  onAgents,
  onSnapshot,
  enabled,
}: UseActivityStreamOptions): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Referências estáveis para callbacks (evita re-criar o EventSource em cada render)
  const cbActivity = useRef(onActivity);
  const cbAgents = useRef(onAgents);
  const cbSnapshot = useRef(onSnapshot);
  cbActivity.current = onActivity;
  cbAgents.current = onAgents;
  cbSnapshot.current = onSnapshot;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
      return;
    }

    function connect() {
      if (!mountedRef.current) return;

      const es = new EventSource('/api/aiox/events/stream');
      esRef.current = es;

      es.addEventListener('connected', () => {
        if (!mountedRef.current) return;
        setConnected(true);
      });

      es.addEventListener('snapshot', (e: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(e.data) as { agents: AgentRow[]; logs: ActivityEntry[] };
          cbSnapshot.current(data);
        } catch {
          /* ignorar parse errors */
        }
      });

      es.addEventListener('activity', (e: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const entry = JSON.parse(e.data) as ActivityEntry;
          cbActivity.current(entry);
        } catch {
          /* ignorar */
        }
      });

      es.addEventListener('agents', (e: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(e.data) as { agents: AgentRow[] };
          cbAgents.current(data.agents);
        } catch {
          /* ignorar */
        }
      });

      es.onerror = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        es.close();
        esRef.current = null;
        // Reconectar com jitter (4-7s) para evitar thundering herd
        const delay = 4000 + Math.random() * 3000;
        reconnectRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  return { connected };
}
