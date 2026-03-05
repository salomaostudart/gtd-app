# Tarefas

## Deploy
- [x] Projeto Supabase criado
- [x] Credenciais configuradas no index.html
- [x] Tabela `user_data` criada com RLS
- [x] Autenticacao configurada (email habilitado)
- [x] Deploy no Cloudflare Pages (3 arquivos: index.html, manifest.json, sw.js)
- [x] Dominio personalizado sal.dev.br (DNS propagado, SSL ativo)
- [x] URL do site atualizada no Supabase (Authentication > URL Configuration)
- [x] Teste: criar conta, login, sync verificado no banco

## Seguranca
- [x] CSP headers via _headers
- [x] E2E encryption removida (decisao: UX ruim para app publico)
- [x] 2FA opcional via email OTP implementado
- [x] Reset de senha padrao via email + formulario nova senha
- [x] Configuracao de Seguranca na sidebar
- [x] Redeploy com alteracoes de seguranca
- [x] Bug fix: user-info race condition (getSession antes do onAuthStateChange)
- [x] Mensagens de erro traduzidas para PT-BR
- [x] Usuarios de teste deletados do Supabase
- [ ] Teste: fluxo completo reset de senha (clicar link email → nova senha)
- [ ] Teste: 2FA ativar/desativar + login com codigo

## Email
- [x] SMTP customizado via Resend configurado no Supabase (smtp.resend.com:465)
- [x] Rate limit aumentado para 30 emails/hora
- [x] Dominio sal.dev.br adicionado no Resend (sa-east-1)
- [x] Adicionar 4 registros DNS no Cloudflare (DKIM + MX + SPF + DMARC)
- [x] Verificar dominio no Resend (verificado 05/03/2026 19:05)
- [x] Atualizar sender email no Supabase para noreply@sal.dev.br
- [ ] Testar envio de email via Resend (criar conta ou reset de senha)

## Melhorias (05/03/2026)
- [x] Busca Global (Ctrl+F) — busca em todas as listas
- [x] Vista detalhada de Projeto — modal com acoes, aguardando, progresso
- [x] Drag & Drop — reordenar Inbox e Proximas Acoes
- [x] Notificacoes do navegador — alertas para calendario
- [x] Tema claro/escuro — toggle na sidebar
- [x] Revisao Semanal interativa — navegar para listas, botao "Voltar a Revisao"
- [x] Melhoria mobile — FAB, swipe para concluir/excluir
- [x] Estatisticas expandidas — grafico semanal de itens concluidos
- [x] Onboarding tutorial interativo — tour guiado com spotlight
- [x] Atalhos de teclado extras — "?" para ajuda, gestos touch
- [x] Deploy das melhorias

## Importacao de tarefas
- [x] Modal "Importar Tarefas" com 3 modos (CSV, texto livre, texto estruturado)
- [x] Parser CSV (content, project, labels, due_date, priority)
- [x] Parser texto livre (cada linha → item no Inbox)
- [x] Parser texto estruturado (# Projeto, - Tarefa, @contexto, [data], >> delegado, ~algum dia)
- [x] Tela de preview antes de confirmar importacao
- [x] Botao na sidebar

## Migracao banco de dados (JSONB → rows)
- [ ] Criar tabela `tasks` no Supabase (1 row por tarefa, com RLS)
- [ ] Migrar dados existentes do JSONB → rows individuais
- [ ] Reescrever camada de sync no index.html
- [ ] Adicionar Supabase Realtime (WebSocket — site atualiza em tempo real)
- [ ] Integracao CLI: Claude adiciona/edita tarefas via API direto no banco
- [ ] Testar: multiplas abas, CLI + site simultaneo

## Correcoes de texto PT-BR
- [x] Acentuacao corrigida (14 fixes via script Python)
- [x] "Não tem conta?" na tela de login (ja estava corrigido)
- [x] Revisao geral de pontuacao e frases (verificado — textos visiveis OK)

## Bugs UX (encontrados na revisao visual)
- [x] 1. "@@rua" duplicado na lista de Proximas Acoes (fix parser CSV + sanitize dados)
- [x] 2. "0 acoes" sem acento na tela de Projetos (corrigido para "0 ações")
- [x] 3. "1 aco" sem acento no projeto Financas (corrigido para "1 ação")
- [x] 4. Filtros de Proximas Acoes apertados no mobile (flex-wrap + gap)
- [x] 5. Calendario mobile — input responsivo (flex-wrap)
- [x] 6. CSV due_date agora vincula acao ao projeto (cria action + calendar)

## Compatibilidade iOS/Mac
- [x] 7. Atalhos Cmd no Mac (ja existia isMac + modKeyProp)
- [x] 8. CSS -webkit-user-select adicionado
- [x] 9. touch-action: pan-y nos items
- [x] 10. safe-area-inset para notch/home indicator do iPhone
- [x] 11. apple-touch-icon adicionado
- [x] 12. maximum-scale=1.0 no viewport
- [x] 13. 100vh -> 100dvh com fallback
- [x] 14. Dashboard grid 2 colunas no mobile (forcado via media query)

## Infraestrutura
- [x] MCP Chrome DevTools instalado (claude mcp add)
- [x] Bug Windows corrigido: `/c` → `C:/` no args do MCP (fix manual em ~/.claude.json)
- [x] Pacote MCP corrigido: `@anthropic-ai/mcp-chrome-devtools` → `chrome-devtools-mcp`
- [x] Atalho "Google Claude" criado no Desktop (Chrome com debug porta 9222)
- [x] Abrir Chrome pelo atalho + reiniciar Claude Code → verificar MCP funcionando
