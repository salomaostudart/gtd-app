> Complementa: Projetos/CLAUDE.md (regras globais sempre aplicaveis)
> Referencia tecnica: hq/reference/boas-praticas.md
> Stack decidida: hq/reference/arquitetura-projetos-2026.md

# GTD App - Getting Things Done

## Stack (migrado 19/04/2026)
- **Framework:** SvelteKit + @sveltejs/adapter-cloudflare (GA)
- **Auth:** Supabase Auth server-side (SSR via @supabase/ssr)
- **DB:** Supabase Postgres — tabela `user_data` JSONB com RLS
- **Hosting:** Cloudflare Workers + Workers Assets
- **Tooling:** Biome v1.9 + Vitest + Playwright 5 projetos
- **Svelte versao:** 5 (runes: $state, $derived, $effect)

## Git / Commits
Conventional Commits: `<tipo>(<escopo>): <descricao>`. GitHub Flow (branch -> PR -> merge squash).
Pre-commit hook: gitleaks + bloqueia push direto em main.

## Sobre o Projeto
Aplicacao web GTD baseada no metodo de David Allen.
- **PWA:** manifest.json + sw.js em static/ (instalavel)
- **Offline:** localStorage fallback (sync automatico ao reconectar)
- **Auth flows:** login, signup, reset-password (server actions)

## Estrutura src/
```
src/
  app.d.ts              — tipos globais SvelteKit (Locals, Platform)
  app.html              — template HTML (PWA tags, sw.js register)
  hooks.server.ts       — middleware auth Supabase (roda em toda request)
  lib/
    supabase.ts         — createSupabaseServerClient / createSupabaseBrowserClient
    gtd/
      store.svelte.ts   — GTD data layer (Svelte 5 runes + localStorage + Supabase sync)
    styles/
      gtd.css           — estilos globais (CSS vars dark/light, componentes)
  routes/
    +layout.server.ts   — root layout (disponibiliza user)
    +layout.svelte      — root layout (CSS global + Supabase context)
    +page.svelte        — redireciona para /app
    login/              — pagina de login (server action)
    signup/             — pagina de cadastro (server action)
    reset-password/     — pagina de recuperacao de senha
    (protected)/        — grupo de rotas autenticadas
      +layout.server.ts — guard: redirect /login se nao autenticado
      app/
        +page.server.ts — load cloudData + actions sync/logout
        +page.svelte    — GTD app completo (todas as views)
```

## Supabase
- **Projeto:** `cxnziboaviahmfcajqcz.supabase.co`
- **Tabela:** `user_data` (user_id UUID PK, data JSONB, updated_at)
- **RLS:** cada usuario so acessa seus proprios dados
- **Auth:** Email + senha (JWT) com refresh automatico

## Setup local
```bash
# 1. Copiar e preencher .env
cp .env.example .env
# editar .env: adicionar PUBLIC_SUPABASE_ANON_KEY real

# 2. Instalar dependencias
npm install

# 3. Dev server
npm run dev

# 4. Build
npm run build
```

## Metodo GTD implementado
- 5 passos: Capturar > Clarificar > Organizar > Refletir > Engajar
- Listas: Inbox, Proximas Acoes, Projetos, Calendário, Aguardando, Algum Dia/Talvez, Referencia
- Wizard de processamento (decision tree David Allen)
- Contextos: @Escritorio, @Casa, @Computador, @Telefone, @Online, @Rua, @Qualquer Lugar
- Revisao Semanal com checklist
- Captura Rapida: Ctrl+K
- Atalhos de teclado: 1-0 para navegar entre views
- Tema claro/escuro (CSS vars)

## Deploy
```bash
# Dev Wrangler (precisa de .env preenchido)
npx wrangler dev

# Deploy Cloudflare
npx wrangler deploy
```
Secrets de producao: `wrangler secret put PUBLIC_SUPABASE_URL` e `wrangler secret put PUBLIC_SUPABASE_ANON_KEY`

## Pendentes pos-migracao (validar com usuario)
- [ ] Preencher PUBLIC_SUPABASE_ANON_KEY em .env
- [ ] Validar login/signup/logout Supabase
- [ ] Validar RLS (user so ve proprios dados)
- [ ] Validar PWA instalavel (manifest + sw.js)
- [ ] Validar sync localStorage <-> Supabase
- [ ] Avaliar DX SvelteKit vs Vanilla anterior

## Anti-perda de contexto
- Decisao tomada -> registrar em `docs/decisoes.md` imediatamente
- Ao atualizar qualquer doc -> atualizar `docs/checkpoint.md` junto
- "Recupere o contexto" -> ler CLAUDE.md + docs/* em paralelo
