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

## Proximo passo
1. Futuro: Migracao banco JSONB → rows individuais (habilita Realtime + CLI)
