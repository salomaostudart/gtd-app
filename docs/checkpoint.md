# Checkpoint

## Estado atual (05/03/2026 ~13:45)
App GTD deployed em https://metodogtd.pages.dev/ com CSP headers + 2FA opcional + reset de senha + SMTP Resend configurado (mas ainda nao funcional — falta DNS).

## Onde paramos
- SMTP customizado configurado: Resend (smtp.resend.com:465, sender: noreply@resend.dev, nome: GTD App)
- Rate limit de email aumentado de 2/hora para 30/hora
- E2E encryption removida (UX ruim para app publico)
- 2FA opcional via email OTP implementado (Supabase signInWithOtp)
- Configuracao de Seguranca na sidebar (ativar/desativar 2FA)
- Reset de senha padrao via email + formulario de nova senha (PASSWORD_RECOVERY handler)
- CSP headers mantidos via _headers (Cloudflare Pages)
- Deploy feito via Wrangler CLI (conta: salomaomstudart@gmail.com, account_id: 90b9fa2fb0b4591bb79e75032e26d029)
- Bug corrigido: user-info sumia apos reload (race condition onAuthStateChange vs getSession — reordenado para getSession primeiro)
- Mensagens de erro do Supabase traduzidas para PT-BR (rate limit, login, registro, reset)
- Usuarios de teste deletados do Supabase — base limpa

## Testes realizados no navegador
- [x] Captura Rapida (Ctrl+K)
- [x] Caixa de Entrada (adicionar/excluir)
- [x] Processar Inbox (wizard completo: acionavel > projeto? > proxima acao > 2min > delegar/adiar > configurar acao)
- [x] Proximas Acoes (com contexto/energia/tempo)
- [x] Modal Seguranca (2FA toggle)
- [x] Logout
- [x] Criar conta (com confirmacao email real — salomaostudart@gmail.com)
- [x] Login (apos confirmacao)
- [x] Welcome screen (novo usuario)
- [x] User-info na sidebar (nome + Sair)
- [x] Esqueci minha senha (envio email OK)
- [x] Mensagens de erro traduzidas (rate limit testado)
- [ ] Formulario nova senha (PASSWORD_RECOVERY — nao testado, precisa clicar link do email)
- [ ] 2FA com OTP (precisa ativar e testar login com codigo)

## Pendente para testar
- Criar conta nova com salomaostudart@gmail.com (base limpa)
- Testar esqueci senha → clicar link → formulario nova senha → login
- Testar 2FA: ativar na seguranca → logout → login → digitar codigo OTP

## DNS sal.dev.br — aguardando transicao (~15:30 de 05/03/2026)
Modo avancado ativado no Registro.br. Quando estabilizar, adicionar:
1. CNAME @ → metodogtd.pages.dev (Cloudflare Pages)
2. TXT resend._domainkey → chave DKIM (copiar do Resend)
3. MX send → feedback-smtp.sa-east-1.amazonses.com (prioridade 10)
4. TXT send → v=spf1 include:amazonses.com ~all
Depois: atualizar sender email no Supabase SMTP para noreply@sal.dev.br

## Credenciais de teste
- Email: salomaostudart@gmail.com
- Senha usada: Gtd2025!

## Melhorias implementadas (05/03/2026 ~14:30)
10 features novas no index.html (3136 → 4192 linhas):
1. Busca Global (Ctrl+F) — overlay com busca em todas as listas
2. Vista detalhada de Projeto — modal com acoes, aguardando, progresso
3. Drag & Drop — reordenar Inbox e Proximas Acoes (vanilla JS)
4. Notificacoes do navegador — alertas para itens do calendario
5. Tema claro/escuro — toggle na sidebar, salva no localStorage
6. Revisao Semanal interativa — passos navegam para listas, botao flutuante "Voltar a Revisao"
7. Melhoria mobile — FAB para captura rapida, swipe gestures (concluir/excluir)
8. Estatisticas expandidas — grafico semanal de itens concluidos no dashboard
9. Onboarding tutorial interativo — tour guiado com spotlight nos elementos
10. Atalhos de teclado extras — "?" para lista de atalhos, gestos touch

## Proximo passo
- Corrigir 14 bugs UX + iOS/Mac (lista em tarefas.md)
- Deploy das melhorias + correcoes PT-BR + importacao
- Migracao banco JSONB → rows individuais (futuro — habilita Realtime + CLI)
- Aguardar transicao DNS do Registro.br, adicionar registros, verificar dominio no Resend
