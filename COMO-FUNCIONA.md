# Como o GTD App funciona como site real na internet

## Visao geral

O app e um **unico arquivo HTML** (`index.html`, ~5200 linhas) com todo o CSS e JavaScript embutido. Nao tem framework (React, Vue, etc.), nao tem processo de build, nao tem `npm install`. Abriu o arquivo no navegador = funciona.

---

## 1. Hospedagem — Cloudflare Pages (gratis)

O site esta no ar em **https://metodogtd.pages.dev/**. A hospedagem e pela Cloudflare Pages, que:

- Serve arquivos estaticos (HTML, JS, CSS) gratuitamente
- Fornece **HTTPS automatico** (certificado SSL sem configurar nada)
- Distribui o conteudo por uma **CDN global** (servidor mais proximo do usuario carrega o site)
- Permite **deploy por upload direto** ou **conectar com GitHub** (cada `git push` atualiza o site automaticamente)

Para fazer deploy, so precisa subir 3 arquivos: `index.html`, `manifest.json` e `sw.js`.

---

## 2. Backend — Supabase (gratis)

O Supabase e um "Firebase open source" que fornece:

- **Banco de dados PostgreSQL** na nuvem
- **Autenticacao** pronta (login com email/senha)
- **API REST automatica** (nao precisa escrever backend)

**Estrutura do banco:** Uma unica tabela `user_data` com:
```sql
id        UUID (chave primaria)
user_id   UUID (referencia ao usuario autenticado)
data      JSONB (todos os dados GTD do usuario em um JSON)
updated_at TIMESTAMPTZ
```

A decisao de usar **uma coluna JSONB** em vez de varias tabelas (uma pra inbox, outra pra projetos, etc.) foi proposital: simplicidade. Nao precisa de migracoes, nao precisa de queries complexas. Cada usuario tem uma linha no banco, e o JSON inteiro e lido/salvo de uma vez.

---

## 3. Sincronizacao e dados offline

O fluxo de dados funciona assim:

1. **Local first:** o app salva tudo em `localStorage` do navegador imediatamente
2. **Sync para nuvem:** apos salvar local, agenda um `syncToCloud()` que faz `upsert` na tabela do Supabase
3. **Carregar da nuvem:** no login, o app puxa os dados do Supabase e sobrescreve o local
4. **Fallback offline:** se nao tem internet, o app continua funcionando com os dados locais

Isso significa que o app funciona mesmo sem internet temporariamente.

---

## 4. Seguranca

Varias camadas:

### Autenticacao
- Login com email + senha via Supabase (senhas com hash **bcrypt**, nunca armazenadas em texto)
- Tokens **JWT** para manter a sessao
- **2FA opcional** via email OTP (codigo enviado por email para confirmar login)
- Reset de senha por email

### Isolamento de dados — Row Level Security (RLS)
```sql
CREATE POLICY "Users manage own data"
  ON user_data FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```
Isso garante que **cada usuario so consegue ler/escrever seus proprios dados**, mesmo que alguem tente manipular a API. E uma protecao no nivel do banco, nao do codigo.

### Headers de seguranca (arquivo `_headers`, aplicados pelo Cloudflare)
- **CSP (Content Security Policy):** restringe de onde scripts, estilos e conexoes podem vir. Bloqueia XSS.
- **X-Frame-Options: DENY** — impede que o site seja embutido em iframe (previne clickjacking)
- **HSTS** — forca HTTPS por 1 ano
- **nosniff, no-referrer** — previne sniffing de tipo e vazamento de URL
- **Permissions-Policy** — desabilita camera, microfone, geolocalizacao

### Sobre a chave `anon` exposta no HTML
Parece inseguro, mas e por design do Supabase. Essa chave so permite operacoes que passam pelo RLS — ou seja, so faz o que as politicas de seguranca permitem.

### Visibilidade
Meta tag `noindex, nofollow` — o site nao aparece em buscadores.

---

## 5. PWA (Progressive Web App)

O app pode ser **instalado no celular** como se fosse um app nativo:

- **`manifest.json`** — define nome, icone, cor do tema, e que o app roda em modo standalone (sem barra do navegador)
- **Service Worker (`sw.js`)** — neste caso esta em modo "self-destruct" (limpa caches antigos), porque o caching e feito via `localStorage` + headers HTTP
- No celular, o navegador oferece "Adicionar a Tela Inicial"

---

## 6. Boas praticas aplicadas

| Pratica | Implementacao |
|---------|--------------|
| Zero dependencias de build | HTML unico, abre direto no navegador |
| Offline first | localStorage + sync assincrono |
| Seguranca em camadas | RLS + CSP + HTTPS + JWT + 2FA |
| Deploy simples | 3 arquivos, sem CI/CD obrigatorio |
| Custo zero | Supabase free + Cloudflare free |
| Responsivo | Layout adaptativo pra mobile, tablet, desktop |
| Acessibilidade | Atalhos de teclado, Ctrl+K para captura rapida |
| Undo | Snapshot do estado antes de cada acao |
| Versionamento | `APP_VERSION` no HTML forca reload quando atualiza |

---

## 7. Stack resumida

```
Usuario → HTTPS (Cloudflare) → index.html (CDN global)
                                    ↓
                              JavaScript no navegador
                                    ↓
                    localStorage (offline) + Supabase API (nuvem)
                                                ↓
                                    PostgreSQL com RLS (dados isolados)
```

---

## 8. Custos

Tudo gratis dentro dos limites:
- **Supabase Free:** 500MB de banco, 50K requisicoes/mes, 50K usuarios
- **Cloudflare Pages Free:** ilimitado para sites estaticos
- Unico custo seria um dominio customizado (opcional — o `.pages.dev` ja funciona)
