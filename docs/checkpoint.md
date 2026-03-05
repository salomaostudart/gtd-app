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

## Proximo passo
1. Testar 2FA completo: inserir codigo OTP e confirmar login
2. Commit + push GitHub
3. Futuro:
   - Migracao banco JSONB → rows individuais (habilita Realtime + CLI)
