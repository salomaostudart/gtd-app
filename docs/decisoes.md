# Decisoes arquiteturais — GTD SvelteKit

Data de migracao: 19/04/2026

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 (runes) |
| Auth | @supabase/ssr (server-side cookies) |
| DB | Supabase Postgres — tabela `user_data` JSONB com RLS |
| Hosting | Cloudflare Workers + Workers Assets (@sveltejs/adapter-cloudflare GA) |
| Lint/Format | Biome v1.9 |
| Testes unit | Vitest |
| Testes E2E | Playwright (5 projetos) |

## Motivacao da migracao Vanilla JS -> SvelteKit

O app original era um HTML monolitico (193KB index.html) com JS inline. Funcional, mas:
- Auth no cliente era insegura (token JWT exposto, sem PKCE)
- Sem RLS real: client-side Supabase key podia ser abusada
- Nenhuma separacao de rotas; manutencao crescia linear com o app
- Sem SSR: primeiro render era sempre "Carregando..." no cliente

SvelteKit resolve todos os pontos: auth server-side, rotas declarativas, SSR nativo, adapter-cloudflare GA.

## Decisoes tecnicas

### Svelte 5 runes
$state, $derived, $effect substituem stores e reactive declarations do Svelte 4.
Razao: API mais explicita, melhor DX em componentes grandes (ex: +page.svelte do /app com 1034 linhas).

### @supabase/ssr vs direct client
Cookies HttpOnly gerenciados pelo servidor (hooks.server.ts). O browser client nunca toca em tokens JWT diretamente.
Razao: CSRF-safe, XSS nao consegue roubar sessao.

### sw.js self-destruct
O sw.js atual (static/) desregistra qualquer service worker existente (heranca do PWA Vanilla JS).
Decisao: nao implementar PWA offline real neste momento. Diferir para apos validacao em producao.
Quando implementar: usar Workbox via Vite plugin, estrategia network-first para dados Supabase.

### Store unico (lib/gtd/store.svelte.ts)
localStorage como fallback offline + sync automatico para Supabase JSONB no reconectar.
Razao: evita multiplos pontos de verdade. O load() do server retorna cloudData; o store decide merge.

### Logout via server action
form method=POST action=?/logout + use:enhance. O server chama supabase.auth.signOut() e invalida o cookie.
Razao: client-side signOut() nao invalida o cookie HttpOnly, deixando sessao residual.

### Server-side redirect / -> /app
+page.server.ts na raiz retorna redirect(303, '/app').
Razao: elimina o flash "Carregando..." que aparecia enquanto o onMount navegava para /app.

### Auth callback route
GET /auth/callback?code=xxx troca o code por sessao via exchangeCodeForSession.
Usado para: email confirmation, magic link, OAuth (se habilitado futuramente).

### Reset de senha
Fluxo em 2 rotas: /reset-password (envia email) -> /reset-password/confirm (define nova senha via updateUser).
/reset-password/confirm recebe o code via email confirmation link e trata a troca no /auth/callback.

## Seguranca

Ver SECURITY.md na raiz e docs/security/ para politicas completas.
Resumo: RLS Supabase + cookies HttpOnly + CSP via wrangler.jsonc headers + gitleaks pre-commit.

## Links

- cloudflare-bootstrap: github.com/salomaostudart/cloudflare-bootstrap (template com docs/security/ canonicos)
- SECURITY.md: raiz do projeto
- docs/security/: 11 arquivos defense-in-depth
