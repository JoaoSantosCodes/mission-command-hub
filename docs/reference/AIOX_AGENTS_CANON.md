# Agentes AIOX oficiais (canon) — fonte `aiox-core`

A lista abaixo alinha-se ao guia **`aiox-core/docs/guides/agent-selection-guide.md`** (ADE v2.2.0, tabela *Agent Quick Reference*) e aos ficheiros em `docs/guides/agents/` / `.aiox-core/development/agents/`.

São **12 agentes** com menções `@…`, persona (codename) e documentação principal.

| Menção | Persona (codename) | Ativação | Documentação principal |
|--------|-------------------|----------|-------------------------|
| @aiox-master | Orion | Direct | `AIOX-MASTER-SYSTEM.md` |
| @architect | Aria | Direct | `ARCHITECT-SYSTEM.md` |
| @dev | Dex | Direct | `DEV-SYSTEM.md` |
| @qa | Quinn | Direct | `QA-SYSTEM.md` |
| @devops | Gage | CLI Wrapper | `DEVOPS-SYSTEM.md` |
| @data-engineer | Dara | CLI Wrapper | `DATA-ENGINEER-SYSTEM.md` |
| @ux-design-expert | Nova | CLI Wrapper | `UX-DESIGN-EXPERT-SYSTEM.md` |
| @po | Pax | Direct | `traces/po-execution-trace.md` (sem `*-SYSTEM.md` dedicado) |
| @pm | Morgan | Direct | `PM-SYSTEM.md` |
| @sm | River | Direct | `SM-SYSTEM.md` |
| @analyst | Atlas | Direct | `ANALYST-SYSTEM.md` |
| @squad-creator | Craft | Direct | `SQUAD-CREATOR-SYSTEM.md` |

**Nota:** `@squad-creator` não aparece na tabela curta do *agent-selection-guide* em inglês, mas está definido em `.aiox-core/development/agents/squad-creator.md` (persona **Craft** no YAML).

**Caminho base no repositório:** `aiox-core/docs/guides/agents/`

O **Mission Command Hub** espelha estes papéis no campo **`aioxRoleId`** (`src/domain/aioxTeamRoles.ts`) e no seletor **Papel TI (AIOX)** do painel.

---

*Validação cruzada: ver [`AIOX_CORE_SYNC.md`](./AIOX_CORE_SYNC.md).*
