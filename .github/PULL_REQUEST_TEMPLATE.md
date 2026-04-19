## Tipo de mudanca

- [ ] `feat` — nova funcionalidade
- [ ] `fix` — correcao de bug
- [ ] `docs` — documentacao apenas
- [ ] `chore` — build, deps, config (sem logica de produto)
- [ ] `refactor` — refatoracao sem mudanca de comportamento
- [ ] `test` — testes apenas
- [ ] `perf` — melhoria de performance
- [ ] `style` — formatacao, sem mudanca de logica

## O que muda

<!-- Descricao objetiva: o que foi feito e por que -->

## Como testar

<!-- Passos para reproduzir / verificar a mudanca -->

1.
2.
3.

## Impacto de seguranca

Essa mudanca tem impacto em seguranca?

- [ ] Nao — nenhuma mudanca em autenticacao, autorizacao, dados sensiveis ou superficie de ataque
- [ ] Sim — descrever abaixo:

<!-- Se sim: qual o impacto? Foi revisado por alguem com foco em seguranca? -->

## Checklist pre-merge

- [ ] CI passou (lint + type-check + tests + build)
- [ ] Cobertura de testes nao regrediu
- [ ] Docs atualizados (se a mudanca afeta comportamento publico)
- [ ] Commit segue Conventional Commits (`feat:`, `fix:`, `docs:` etc.)
- [ ] PR title segue o mesmo padrao do commit (`feat(scope): descricao`)
- [ ] Review feito por pelo menos 1 pessoa (ou auto-review documentado)
- [ ] Nenhum secret / credencial no codigo ou historico git
