# Decisoes

## Arquitetura
- HTML unico com CSS/JS embutidos (simplicidade de deploy, sem build step)
- Supabase como backend (auth + banco gratuito, RLS nativo)
- Cloudflare Pages para hospedagem (gratuito, HTTPS automatico)
- PWA com Service Worker (offline + instalavel)

## Design
- Tema escuro por padrao (variaveis CSS em :root)
- Favicon SVG inline (sem arquivo extra)

## Dados
- Tabela unica `user_data` com coluna JSONB (flexivel, sem migracoes)
- Row Level Security: cada usuario isolado
- localStorage como fallback offline
- Sync automatico com Supabase quando online

## Metodo GTD
- Seguir fielmente o metodo original de David Allen (GTD_REGRAS.md)
- Contextos: @escritorio, @casa, @telefone, @computador, @rua, @online
- Calendario somente para compromissos com data/hora fixa

## Seguranca
- CSP headers: restrict scripts/connect/frame via _headers (Cloudflare Pages)
- Row Level Security (RLS) no Supabase: cada usuario isolado
- HTTPS automatico via Cloudflare Pages
- 2FA opcional via email OTP (Supabase signInWithOtp)
- Reset de senha padrao via email (Supabase auth)
- E2E encryption foi removida (Recovery Key era UX ruim para app publico)

## Auth Init
- getSession() roda ANTES do onAuthStateChange para evitar race condition
- onAuthStateChange so trata mudancas futuras (login/logout/password_recovery)
- SIGNED_OUT handler tem guard `if (!currentUser) return` para evitar falso logout na init

## Workflow do Claude Code
- Anti-perda de contexto via docs/ (tarefas.md, decisoes.md, checkpoint.md)
- MCP Chrome DevTools para acesso ao navegador (porta 9222)
- Windows: `claude mcp add` com `cmd /c` requer fix manual — o CLI parseia `/c` como `C:/`
