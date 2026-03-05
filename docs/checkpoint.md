# Checkpoint

## Estado atual (05/03/2026 ~19:10)
App GTD deployed em https://sal.dev.br (+ https://metodogtd.pages.dev). DNS propagado, SSL ativo.

## O que foi feito nesta sessao (05/03/2026 noite)
- DNS sal.dev.br: confirmado propagado (nameservers Cloudflare ativos, SSL provisionado)
- Supabase Site URL: atualizada para https://sal.dev.br
- Supabase SMTP sender: atualizado para noreply@sal.dev.br
- Resend: DNS records validados, verificacao interna em andamento
- Removidos GTD.bat e GTD.command (launchers locais desnecessarios)
- Analise de estrutura de documentos (tudo OK)

## Credenciais de teste
- Email: salomaostudart@gmail.com
- Senha usada: Gtd2025!

## Proximo passo
1. Resend: aguardar verificacao interna completar (automatico)
2. Testes pendentes:
   - Envio de email via Resend (criar conta ou reset de senha)
   - Reset de senha: clicar link do email → formulario nova senha → login
   - 2FA: ativar → logout → login com codigo OTP
3. Correcoes PT-BR pendentes:
   - "Nao tem conta?" na tela de login (falta acento)
   - Revisao geral de pontuacao e frases
4. Futuro:
   - Migracao banco JSONB → rows individuais (habilita Realtime + CLI)
