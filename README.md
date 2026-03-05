# GTD - Getting Things Done

Aplicacao web completa do metodo GTD (Getting Things Done) de David Allen. Gratuita, open source e sem dependencias de build.

**[Acessar o app](https://metodogtd.pages.dev/)**

## Funcionalidades

- **Captura Rapida** (Ctrl+K) — adicione ideias instantaneamente
- **Processar Inbox** — wizard guiado para clarificar cada item
- **Proximas Acoes** — filtros por contexto, energia e tempo
- **Projetos** — vista detalhada com acoes, aguardando e progresso
- **Calendario** — compromissos com data/hora fixa + notificacoes do navegador
- **Aguardando** — itens delegados com rastreamento
- **Algum Dia/Talvez** — ideias para o futuro
- **Referencia** — material de consulta
- **Revisao Semanal** — checklist interativa com navegacao direta
- **Busca Global** (Ctrl+F) — busca em todas as listas
- **Drag & Drop** — reordenar Inbox e Proximas Acoes
- **Importacao** — CSV, texto livre ou texto estruturado
- **Estatisticas** — dashboard com grafico semanal de produtividade
- **Tema claro/escuro** — toggle na sidebar
- **Onboarding** — tutorial interativo para novos usuarios
- **Atalhos de teclado** — pressione "?" para ver todos
- **PWA** — instalavel no celular, funciona offline
- **Mobile** — FAB, swipe gestures, layout responsivo
- **iOS/Mac** — compativel com Safari, suporte a Cmd, safe areas

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML unico com CSS/JS embutidos (zero build step) |
| Backend | [Supabase](https://supabase.com/) (auth + banco PostgreSQL) |
| Hospedagem | [Cloudflare Pages](https://pages.cloudflare.com/) (gratuito, HTTPS, CDN global) |
| Email | [Resend](https://resend.com/) (SMTP para confirmacao, reset de senha, 2FA) |
| Offline | Service Worker (cache network-first) + localStorage |

## Seguranca

- Autenticacao via email + senha (JWT)
- 2FA opcional via email OTP
- Row Level Security (RLS) — cada usuario isolado no banco
- CSP headers restritivos
- HTTPS automatico via Cloudflare

## Metodo GTD

O app segue fielmente os 5 passos do metodo original:

1. **Capturar** — coletar tudo que tem sua atencao
2. **Clarificar** — processar cada item (acionavel? proximo passo?)
3. **Organizar** — colocar no lugar certo (acao, projeto, calendario, etc.)
4. **Refletir** — revisao semanal para manter o sistema confiavel
5. **Engajar** — fazer com confianca, escolhendo por contexto/energia/tempo

## Como rodar localmente

1. Clone o repositorio:
   ```bash
   git clone https://github.com/salomaostudart/gtd-app.git
   cd gtd-app
   ```

2. Abra `index.html` no navegador — funciona sem servidor.

3. Para funcionar com sync/auth, configure um projeto no [Supabase](https://supabase.com/):
   - Crie a tabela `user_data` com colunas: `id`, `user_id`, `data` (JSONB), `updated_at`
   - Ative Row Level Security
   - Atualize as credenciais no `index.html` (URL + anon key)

## Deploy

```bash
# Instale o Wrangler CLI
npm install -g wrangler

# Faca login no Cloudflare
wrangler login

# Deploy
cd deploy
wrangler pages deploy . --project-name=metodogtd
```

Veja [DEPLOY.md](DEPLOY.md) para o guia completo.

## Estrutura

```
index.html      — App completo (HTML + CSS + JS)
manifest.json   — Manifesto PWA
sw.js           — Service Worker
_headers        — CSP headers (Cloudflare Pages)
GTD_REGRAS.md   — Regras do metodo GTD
DEPLOY.md       — Guia de deploy
docs/           — Documentacao interna (tarefas, decisoes, checkpoint)
```

## Licenca

MIT
