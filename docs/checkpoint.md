# Checkpoint

## Estado atual (05/03/2026 ~21:00)
App GTD deployed em https://sal.dev.br (+ https://metodogtd.pages.dev). DNS propagado, SSL ativo, Resend verificado.

## O que foi feito (sessao 05/03/2026 noite 2)
- Chrome DevTools MCP: remote debugging ativado e conexao confirmada
- Teste criar conta: OK — email confirmacao enviado via Resend
- Teste login: OK — com senha teste123
- Teste reset de senha: OK — email enviado, nova senha funciona
- Fix: PASSWORD_RECOVERY handler (isRecoveryFlow flag para nao pular o formulario)
- Fix: 2FA login (loginInProgress flag para evitar auto-login no listener)
- Botao mostrar/esconder senha nos 4 campos de password
- Templates de email Supabase traduzidos para PT-BR:
  - Confirm sign up: "Confirme seu cadastro - GTD App"
  - Magic link (2FA): "Seu codigo de verificacao - GTD App" (mostra codigo {{ .Token }})
  - Reset password: "Redefinir sua senha - GTD App"
  - Change email: "Confirmar alteracao de e-mail - GTD App"
- Teste 2FA: formulario de codigo aparece, email OTP enviado

## Credenciais de teste
- Email: salomaostudart@gmail.com
- Senha: teste123
- 2FA: ativado

## O que foi feito (sessao 05/03/2026 noite 3)
- Commit + push GitHub (auth fixes + password toggle)
- Teste 2FA completo: login → OTP enviado → codigo inserido → login OK
- Fix: campo OTP maxlength 6 → 8 (Supabase envia 8 digitos)
- Fix: validacao JS code.length !== 6 → aceita 6 a 8 digitos
- Deploy com correcoes OTP

## O que foi feito (sessao 05/03/2026 noite 4)
- Fix iPhone: app-container escondido por default (display:none), so mostra apos auth
- Fix iPhone: sidebar-backdrop overlay para fechar sidebar no mobile (touch)
- Fix: closeSidebar() e toggleSidebar() funcooes dedicadas
- Deploy Cloudflare Pages com ambas correcoes
- Teste emulador iPhone 14 Pro: login + sidebar OK

## O que foi feito (sessao 05/03/2026 noite 5)
- Fix: auth-overlay visivel por default (sem display:none inline)
- Fix: FAB e review-btn movidos para dentro do app-container
- Fix: sidebar-backdrop movido para dentro do app-container
- Fix: try-catch no getSession(), handleLogin() e handleRegister()
- Fix: SW cache bumped v3 → v4 (forca download versao nova)
- Deploy 3x com correcoes incrementais
- Resultado: login aparece no iPhone, mas app ainda nao funciona bem no mobile real
- Emulador Chrome OK, iPhone real com problemas persistentes

## Proximo passo
1. **PRIORIDADE: Bugs Mobile/iPhone** — app nao funciona corretamente no Safari mobile real
   - Testar com iPhone fisico ou Safari remote debugging
   - Emulador Chrome nao reproduz os bugs reais do Safari
2. Futuro: Migracao banco JSONB → rows individuais (habilita Realtime + CLI)
