> Complementa: Projetos/CLAUDE.md (regras globais sempre aplicaveis)
> Referencia tecnica: hq/reference/boas-praticas.md

# GTD App - Getting Things Done

## Stack (pos-migracao Astro — 18/04/2026)
- **Framework:** Astro 5 (output: static)
- **Deploy:** Cloudflare Workers + Workers Assets
- **Backend:** Supabase (autenticacao Email+senha + JSONB storage)
- **PWA:** Service Worker em public/sw.js (auto-unregister — stale SW killer)
- **Tooling:** Biome (lint+format), TypeScript, Vitest, Playwright, @axe-core/playwright
- **Credenciais:** PUBLIC_SUPABASE_URL + PUBLIC_SUPABASE_ANON_KEY via .env (gitignored)

## Sobre o Projeto
Aplicacao web GTD baseada no metodo de David Allen. Single-page app com auth Supabase,
sincronizacao cloud e fallback localStorage.

## Estrutura
```
src/
  pages/index.astro       — Unica pagina (SPA)
  styles/gtd.css          — CSS do app (migrado do index.html original)
  scripts/gtd-app.js      — Referencia (fonte do public/gtd-app.js)
public/
  gtd-app.js              — JS do app (is:inline via src externa)
  sw.js                   — Service Worker (stale SW killer)
  manifest.json           — PWA manifest
tests/
  unit/smoke.test.ts      — Vitest smoke
  e2e/home.spec.ts        — Playwright E2E
  a11y/a11y.spec.ts       — axe-core A11y
```

## Supabase
- **Projeto:** cxnziboaviahmfcajqcz.supabase.co
- **Tabela:** user_data (id, user_id, data JSONB, updated_at)
- **Seguranca:** Row Level Security — cada usuario so acessa seus dados
- **Auth:** Email + senha (JWT). Credenciais em .env (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY)
- **RLS:** Configurado no dashboard Supabase — NAO mexer sem necessidade

## Credenciais locais
Criar `.env` na raiz (gitignored):
```
PUBLIC_SUPABASE_URL=https://cxnziboaviahmfcajqcz.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```
Sem .env: app roda em modo local-only (sem auth, sem sync cloud).

## Metodo GTD implementado
- 5 passos: Capturar > Clarificar > Organizar > Refletir > Engajar
- Listas: Inbox, Proximas Acoes, Projetos, Aguardando, Algum Dia/Talvez, Referencia
- Calendario: somente compromissos com data/hora fixa
- Contextos: @escritorio, @casa, @telefone, @computador, @rua, @online
- Revisao Semanal

## Scripts
```bash
npm run dev          # Astro dev server (localhost:4321)
npm run build        # type-check + astro build → dist/
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E + A11y
npm run lint         # Biome check
npm run format       # Biome format --write
npm run ci           # lint + type-check + test + build (completo)
npm run deploy       # wrangler deploy → Cloudflare Workers
```

## Deploy
1. `npm run build` (gera dist/)
2. `npm run deploy` (wrangler → Workers Assets)
3. URL: gtd-app-worker.<subdominio>.workers.dev
4. Domain customizado: configurar no dashboard CF

## Git / Commits
Conventional Commits: `<tipo>(<escopo>): <descricao>`. Tipos: feat/fix/docs/chore/refactor/test.
GitHub Flow (branch -> PR -> merge squash). Pre-commit hook bloqueia commit em main + gitleaks.

## Regras de Workflow
- Ler CLAUDE.md e docs/ antes de qualquer tarefa
- Nunca implementar sem aprovar plano para features novas
- JS do app vive em public/gtd-app.js (e espelhado em src/scripts/gtd-app.js para referencia)
- Credenciais Supabase: NAO hardcodar — sempre via .env / import.meta.env
- Sem dependencias extras sem motivo
- NUNCA apagar ou modificar codigo existente sem autorizacao

## Anti-perda de contexto
- Decisao tomada → registrar em docs/decisoes.md imediatamente
- Tarefa mudou de status → atualizar docs/tarefas.md imediatamente
- "Recupere o contexto" → ler docs/* em paralelo, resumir estado

## Historico de migracao
- Pre-18/04/2026: Vanilla JS PWA (index.html monolitico ~5183 linhas com CSS+JS embutidos)
- 18/04/2026: Migrado para Astro static + tooling bootstrap (biome, vitest, playwright, wrangler)
- Branch de migracao: feat/astro-migration
- Backup disponivel: tag backup-pre-retroactive-20260418 + branch backup/pre-retroactive-18-04
