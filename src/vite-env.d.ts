/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AIOX_DOCS_URL?: string;
  /** Intervalo de polling da API em ms (mín. 5000 recomendado) */
  readonly VITE_POLL_INTERVAL_MS?: string;
  /** `1` ou `true`: sincronizar o Canvas de tarefas com `GET`/`PUT /api/aiox/task-board` */
  readonly VITE_TASK_BOARD_SYNC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
