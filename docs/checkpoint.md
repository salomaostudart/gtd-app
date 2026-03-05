# Checkpoint

## Estado atual (05/03/2026 ~17:30)
App GTD deployed em https://metodogtd.pages.dev/ com todas as features implementadas. README.md criado. GitHub atualizado (salomaostudart/gtd-app, privado).

## O que foi feito nesta sessao (05/03/2026)
- 14 bugs UX + iOS/Mac corrigidos (via script Python para eficiencia)
- Importacao de tarefas (CSV, texto livre, texto estruturado)
- 10 features novas (busca, drag&drop, tema, notificacoes, etc.)
- Deploy no Cloudflare Pages (wrangler)
- GitHub repo criado e pushado (salomaostudart/gtd-app)
- DNS sal.dev.br: nameservers transferidos para Cloudflare (aleena/owen)
- Cloudflare: CNAME sal.dev.br → metodogtd.pages.dev + custom domain adicionado
- Resend: 4 DNS records adicionados no Cloudflare (DKIM, SPF, MX, DMARC)
- README.md criado para o repositorio

## DNS sal.dev.br — em transicao
- Nameservers: aleena.ns.cloudflare.com / owen.ns.cloudflare.com (salvos no Registro.br ~15:55)
- Transicao estimada: ~2h a partir de 15:55 (deve completar ~18:00 de 05/03/2026)
- Cloudflare DNS records configurados: CNAME (@), TXT (resend._domainkey), MX (send), TXT (send), TXT (_dmarc)
- Cloudflare Pages custom domain: sal.dev.br adicionado (status: Inactive, ativa apos DNS)
- Resend: status "Pending" — verifica automaticamente apos propagacao

## Credenciais de teste
- Email: salomaostudart@gmail.com
- Senha usada: Gtd2025!

## Proximo passo (proxima sessao)
1. Verificar se DNS propagou: acessar https://sal.dev.br
2. Se propagou:
   - Verificar dominio no Resend (clicar "Verify DNS Records")
   - Atualizar sender email no Supabase SMTP para noreply@sal.dev.br
   - Atualizar URL do site no Supabase Auth para https://sal.dev.br
   - Testar envio de email (reset de senha ou criar conta)
3. Testes pendentes:
   - Reset de senha: clicar link do email → formulario nova senha → login
   - 2FA: ativar → logout → login com codigo OTP
4. Correcoes PT-BR pendentes:
   - "Nao tem conta?" na tela de login (falta acento)
   - Revisao geral de pontuacao e frases
5. Futuro:
   - Migracao banco JSONB → rows individuais (habilita Realtime + CLI)
