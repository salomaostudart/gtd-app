> Complementa: Projetos/CLAUDE.md (regras globais sempre aplicaveis)

# GTD App - Getting Things Done

## Sobre o Projeto
Aplicacao web GTD baseada no metodo de David Allen.
- **Tipo:** Single-page app (HTML unico com CSS/JS embutidos)
- **Backend:** Supabase (autenticacao + banco JSONB)
- **Hospedagem:** Cloudflare Pages
- **PWA:** Service Worker para cache offline

## Arquivos
- `index.html` — App completo (frontend + logica + estilos)
- `manifest.json` — Manifesto PWA
- `sw.js` — Service Worker (cache network-first para HTML, cache-first para assets)
- `GTD_REGRAS.md` — Regras completas do metodo GTD de David Allen
- `DEPLOY.md` — Guia passo a passo de deploy (Supabase + Cloudflare Pages)

## Supabase
- **Projeto:** `cxnziboaviahmfcajqcz.supabase.co`
- **Tabela:** `user_data` (id, user_id, data JSONB, updated_at)
- **Seguranca:** Row Level Security - cada usuario so acessa seus dados
- **Auth:** Email + senha (JWT)

## Arquitetura do index.html
- Linha ~1205: Credenciais Supabase (URL + anon key)
- CSS embutido no `<style>` (tema escuro, variaveis CSS)
- JS embutido no `<script>` (logica GTD, sync Supabase, localStorage fallback)

## Metodo GTD implementado
- 5 passos: Capturar > Clarificar > Organizar > Refletir > Engajar
- Listas: Inbox, Proximas Acoes, Projetos, Aguardando, Algum Dia/Talvez, Referencia
- Calendario: somente compromissos com data/hora fixa
- Contextos: @escritorio, @casa, @telefone, @computador, @rua, @online
- Revisao Semanal

## Checklist de Deploy
Ver `docs/tarefas.md` para status atualizado.

## Convencoes
- Idioma do app e docs: Portugues brasileiro (sem acentos em nomes de arquivo)
- Codigo: tudo em um unico HTML para simplicidade de deploy
- Tema: escuro por padrao (variaveis CSS em :root)

## Regras de Workflow
- Ler CLAUDE.md e docs/ antes de qualquer tarefa
- Nunca implementar sem aprovar plano para features novas
- Tarefa ambigua → perguntar antes
- Sem dependencias extras sem motivo
- Sem refatoracao nao pedida
- Falhou 2x → parar, repensar ou perguntar
- Complexidade da resposta <= complexidade da tarefa
- NUNCA apagar ou modificar codigo existente sem autorizacao

## Anti-perda de contexto
- Decisao tomada → registrar em `docs/decisoes.md` imediatamente
- Tarefa mudou de status → atualizar `docs/tarefas.md` imediatamente
- Ao atualizar qualquer doc → atualizar `docs/checkpoint.md` junto
- "Recupere o contexto" → ler docs/* em paralelo, resumir estado
- Apos compactacao de contexto → reler docs/
