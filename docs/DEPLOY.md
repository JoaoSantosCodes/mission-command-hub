# Deploy — Architecture Agents Hub

Guia de referência para expor o hub em rede com segurança. Ver também [CHECKLIST-OPERACIONAL.md](./CHECKLIST-OPERACIONAL.md) para pré-requisitos antes de qualquer deploy.

> ⚠️ **O hub não tem autenticação integrada.** Nunca o exponhas diretamente à internet sem um reverse proxy com auth no perímetro.

---

## Modos de execução

| Modo | Comando | Quando usar |
|------|---------|-------------|
| Desenvolvimento | `npm run dev` | Local, API embebida no Vite :5179 |
| Dev split | `npm run dev:split` | Local, Express :8787 + Vite :5179 separados |
| Produção | `npm run build && npm start` | Servidor — Express serve `dist/` + `/api/*` |
| Docker | `docker compose up` | Containerizado com `docker-compose.yml` |

Em produção, o Express escuta na porta definida por `PORT` (padrão: `8787`) e serve tanto o frontend estático (`dist/`) como as rotas `/api/*` no mesmo processo.

---

## Variáveis de ambiente obrigatórias em produção

```bash
NODE_ENV=production
PORT=8787                      # porta do Express
CORS_ORIGINS=https://teu-dominio.example.com   # obrigatório; sem isto CORS fica aberto
AIOX_CORE_PATH=/caminho/para/.aiox-core        # ou deixar padrão (MissionAgent/.aiox-core)
```

Ver `.env.example` para a lista completa.

---

## nginx — reverse proxy recomendado

```nginx
server {
    listen 443 ssl http2;
    server_name agents.example.com;

    ssl_certificate     /etc/ssl/certs/agents.example.com.crt;
    ssl_certificate_key /etc/ssl/private/agents.example.com.key;

    # Autenticação no perímetro (escolher uma das opções abaixo)
    # Opção A — HTTP Basic Auth
    auth_basic "Architecture Agents Hub";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass         http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        # SSE (streaming do painel Dúvidas)
        proxy_set_header   Connection        '';
        proxy_buffering    off;
        proxy_cache        off;
        chunked_transfer_encoding on;
    }
}

# Redirecionar HTTP → HTTPS
server {
    listen 80;
    server_name agents.example.com;
    return 301 https://$host$request_uri;
}
```

Com nginx como proxy, define em `.env`:
```bash
TRUST_PROXY=1
```

Isto permite que o Express confie nos headers `X-Forwarded-*` e que o rate limiting funcione com IPs reais (não o IP do proxy).

---

## Caddy — alternativa com HTTPS automático

```caddy
agents.example.com {
    basicauth /* {
        # gerar hash: caddy hash-password --plaintext "a-tua-password"
        utilizador JDJhJDE0JHh4eHh4...
    }

    reverse_proxy localhost:8787 {
        header_up X-Forwarded-Proto {scheme}
        # SSE
        flush_interval -1
    }
}
```

Com Caddy, o HTTPS é gerido automaticamente via Let's Encrypt. Define `TRUST_PROXY=1` igualmente.

---

## Docker

O `docker-compose.yml` incluído cobre o caso base. Para produção:

```bash
# Build e arranque
docker compose -f docker-compose.yml up -d --build

# Variáveis sensíveis via ficheiro de env (não commitar)
docker compose --env-file .env.local up -d
```

Para usar com nginx externo, expõe apenas a porta internamente e coloca o nginx na mesma rede Docker:

```yaml
# docker-compose.yml (excerto)
services:
  hub:
    ports: []          # sem exposição direta ao host
    networks: [proxy]
networks:
  proxy:
    external: true     # rede partilhada com o nginx
```

---

## Rate limiting e segurança

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `COMMAND_RATE_MAX` | 20 | Pedidos máx. a `POST /api/aiox/command` por janela |
| `AGENT_EDIT_RATE_MAX` | 10 | Pedidos máx. a `PUT /api/aiox/agents/:id` por IP |
| `DOUBTS_CHAT_RATE_MAX` | 10 | Mensagens máx. no chat LLM por janela |
| `DOUBTS_CHAT_WINDOW_MS` | 60000 | Janela de rate limit do chat (ms) |
| `MASK_PATHS_IN_UI` | 0 | `1` oculta caminhos absolutos na UI (ecrãs partilhados) |
| `MISSION_AGENT_EDIT` | 1 | `0` para só-leitura de agentes em produção |

---

## Checklist pré-deploy

- [ ] `npm run build` — sem erros TypeScript / Vite
- [ ] `NODE_ENV=production MISSION_PREFLIGHT_SKIP_AIOX=1 npm run verify:real` — preflight OK
- [ ] `CORS_ORIGINS` definido para as origens reais
- [ ] `TRUST_PROXY=1` se houver reverse proxy
- [ ] Auth no perímetro configurada (nginx `auth_basic` / Caddy `basicauth` / VPN)
- [ ] `MISSION_AGENT_EDIT=0` se não quiseres edição de agentes pela UI
- [ ] `MASK_PATHS_IN_UI=1` se o ecrã for partilhado
- [ ] Secrets só em `.env.local` (não commitar chaves)
- [ ] Verificar `GET /api/health` após arranque

---

## Referências

- [CHECKLIST-OPERACIONAL.md](./CHECKLIST-OPERACIONAL.md) — arranque, PR, release
- [INTEGRATIONS.md](./INTEGRATIONS.md) — MCP, Notion, Figma, Slack
- [openapi.yaml](./openapi.yaml) — contrato HTTP completo
- [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) — Fase 2 (auth, multi-tenant)
