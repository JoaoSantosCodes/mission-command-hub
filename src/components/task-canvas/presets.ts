import type { BoardPreset, BoardPresetId } from './types';

export const BOARD_PRESETS: Record<BoardPresetId, BoardPreset> = {
  standard: {
    id: 'standard',
    label: 'Fluxo geral',
    description: 'Backlog → execução → revisão → concluído',
    columns: [
      { id: 'todo', title: 'Backlog', hint: 'Ideias e fila' },
      { id: 'doing', title: 'Em curso', hint: 'Trabalho activo' },
      { id: 'review', title: 'Revisão', hint: 'Validação' },
      { id: 'done', title: 'Feito', hint: 'Entregue' },
    ],
  },
  agents: {
    id: 'agents',
    label: 'Agentes & missões',
    description: 'Alinhado a orquestração de agentes',
    columns: [
      { id: 'todo', title: 'Planeado', hint: 'Missões na fila' },
      { id: 'doing', title: 'A executar', hint: 'Agente activo' },
      { id: 'review', title: 'Verificação', hint: 'Hub / CLI' },
      { id: 'done', title: 'Concluído', hint: 'Registado no feed' },
    ],
  },
  delivery: {
    id: 'delivery',
    label: 'Entrega',
    description: 'Ciclo curto tipo sprint',
    columns: [
      { id: 'todo', title: 'Pronto a pegar', hint: 'Prioridade' },
      { id: 'doing', title: 'Desenvolvimento', hint: 'Build' },
      { id: 'review', title: 'QA / doc', hint: 'Revisão final' },
      { id: 'done', title: 'Ship', hint: 'Em produção' },
    ],
  },
};

export const PRESET_ORDER: BoardPresetId[] = ['standard', 'agents', 'delivery'];
