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

## O que foi feito (sessao 06/03/2026 madrugada)
- Fix: auth-overlay visivel por default (sem display:none inline)
- Fix: FAB e review-btn movidos para dentro do app-container
- Fix: sidebar-backdrop movido para dentro do app-container
- Fix: try-catch no getSession(), handleLogin() e handleRegister()
- Fix: SW self-destruct (sw.js limpa caches e se desregistra)
- Fix: CSP headers — adicionado wss:// para WebSocket do Supabase
- Fix: Supabase createClient com lock no-op (evita Web Locks deadlock no Safari)
- Fix: Realtime desabilitado no createClient
- Fix: getSession com timeout de 5s no initApp
- Fix: handleLogin com fetch direto (bypass do SDK signInWithPassword)
- Fix: script killer de SW no <head> do index.html
- Teste minimo (test-login.html) funciona perfeitamente no iPhone — tanto SDK quanto fetch
- Teste minimo deployado no Cloudflare com CSP — tambem funciona
- DIAGNOSTICO: Service Worker antigo serve JS cacheado, impede codigo novo de rodar
- EM ANDAMENTO: usuario precisa acessar sal.dev.br 3x no Safari normal para matar SW

## Causa raiz identificada
O Service Worker antigo (gtd-v3/v4) cacheia o index.html e serve versao velha do JS.
Mesmo com sw.js self-destruct deployado, o SW antigo precisa de multiplas visitas para:
1. Detectar que sw.js mudou (browser faz check periodico)
2. Instalar novo SW (self-destruct)
3. Ativar e limpar caches
4. Pagina recarrega com codigo novo
Script killer no <head> do index.html ajuda a acelerar o processo.

## O que foi feito (sessao 06/03/2026 madrugada 2)
- Diagnostico completo do bug de login no iPhone usando debug overlay
- Causa raiz REAL: Safari/WebKit TDZ bug — `let` no escopo global causa "Cannot access before initialization" dentro de functions
- Fix: 20 variáveis globais `let` → `var`
- Fix: handleLogin reescrito com XHR callback puro (sem async/await)
- Fix: validação de formato de email no login
- Fix: meta tags no-cache para Safari
- Fix: mensagens de erro traduzidas (email incorreto, conexão, timeout)
- Login no iPhone Safari: FUNCIONANDO

## Causa raiz REAL (bug do Safari)
Safari/WebKit tem bug com `let` no escopo global de `<script>` inline.
Variáveis declaradas com `let` lançam "Cannot access before initialization" quando
acessadas dentro de function declarations no mesmo escopo, mesmo estando declaradas antes.
Solução: usar `var` para variáveis globais. Bug conhecido do WebKit.

## O que foi feito (sessao 06/03/2026 tarde)
- Teste sidebar backdrop iPhone: OK
- Teste cadastro novo usuario iPhone: OK
- Welcome screen: overflow scroll + layout compacto mobile
- Tutorial tooltips: reposiciona se nao cabe na tela
- Landscape: scroll habilitado em telas curtas
- FAB "+": menu expansivel com 4 opcoes (Captura, Inbox, Processar, Buscar)
- Sidebar reorganizada: Configuracoes (Tema+Seguranca) e Importar/Exportar agrupados
- Rever Tutorial: botao na sidebar + funcao restartTutorial()
- Shortcuts mobile: esconde Ctrl+K/Ctrl+F, tutorial fala do botao "+"
- Cadastro email duplicado: detecta identities vazio do Supabase
- Session preload CSS: evita flash do login ao recarregar (verifica localStorage)
- localStorage session fallback: usa token salvo se getSession trava
- APP_VERSION cache-bust: force reload quando versao desatualizada
- Cache-Control: no-cache adicionado ao _headers
- SW re-registration desabilitada (evita loop killer/register)
- FAB movido para fora do #global-search (estava herdando visibility:hidden)

## Problema em aberto
Safari iOS serve HTML cacheado pelo Service Worker antigo mesmo apos "Limpar Historico".
Solucao requer: Configuracoes > Safari > Avancado > Dados de Sites > Remover Todos.
Mecanismo APP_VERSION + cache-bust deve resolver para proximas atualizacoes uma vez que o cache antigo for limpo.

## Proximo passo
1. Usuario deve limpar dados de sites do Safari (Avancado > Dados de Sites > Remover Todos)
2. Testar welcome compacto + dashboard reload apos limpeza completa
3. Se persistir: adicionar debug overlay visivel no iPhone para diagnosticar
4. Commit + push GitHub
5. Futuro: Migracao banco JSONB → rows individuais (habilita Realtime + CLI)
