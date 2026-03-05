# GTD App - Guia de Deploy

## Arquitetura

O GTD App usa:
- **Frontend:** Arquivo HTML unico com CSS e JS embutidos
- **Backend:** Supabase (gratis) para autenticacao e armazenamento na nuvem
- **Hospedagem:** Cloudflare Pages (gratis) com dominio personalizado

Cada usuario tem login com email+senha. Seus dados GTD ficam sincronizados na nuvem e acessiveis de qualquer dispositivo.

**Arquivos para deploy:**
- `index.html` — App principal (com credenciais Supabase configuradas)
- `manifest.json` — Manifesto PWA
- `sw.js` — Service Worker (offline + cache)

---

## Passo 1: Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (gratis)
2. Clique em **New project**
3. Configure:
   - **Name:** `gtd`
   - **Database Password:** crie uma senha forte (anote-a)
   - **Region:** escolha a mais proxima (ex: South America - Sao Paulo)
4. Aguarde a criacao (~2 minutos)

---

## Passo 2: Criar tabela no banco de dados

1. No projeto Supabase, va em **SQL Editor** (menu lateral)
2. Clique em **New query**
3. Cole o SQL abaixo e clique **Run**:

```sql
-- Tabela para armazenar dados GTD de cada usuario
CREATE TABLE user_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (cada usuario so ve seus dados)
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Politica: usuarios so podem ler/escrever seus proprios dados
CREATE POLICY "Users manage own data"
  ON user_data
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

4. Verifique que apareceu "Success" na execucao

---

## Passo 3: Configurar autenticacao

1. No Supabase, va em **Authentication** > **Providers**
2. Verifique que **Email** esta habilitado (padrao)
3. Va em **Authentication** > **URL Configuration**
4. Em **Site URL**, coloque a URL final do seu app:
   - Ex: `https://gtd.seudominio.com`
5. Em **Redirect URLs**, adicione:
   - `https://gtd.seudominio.com`

**Opcional — Desabilitar registro publico (somente convites):**
1. Va em **Authentication** > **Settings**
2. Desabilite **"Allow new users to sign up"**
3. Para adicionar usuarios: va em **Authentication** > **Users** > **Invite user**
4. O usuario recebera um email com link para criar senha

---

## Passo 4: Obter credenciais e configurar o app

1. No Supabase, va em **Settings** > **API**
2. Copie:
   - **Project URL** (ex: `https://abc123.supabase.co`)
   - **anon public key** (a chave longa que comeca com `eyJ...`)
3. Abra o arquivo `index.html` e substitua as credenciais no topo do `<script>`:

```javascript
const SUPABASE_URL = 'https://abc123.supabase.co';       // ← Cole sua URL aqui
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...';    // ← Cole sua chave aqui
```

4. Salve o arquivo

---

## Passo 5: Deploy no Cloudflare Pages

### 5a. Criar conta no Cloudflare

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com) e crie uma conta (gratis)
2. Se voce ja tem dominio no Cloudflare, pule para 5b

**Se seu dominio ainda nao esta no Cloudflare:**
1. Clique em **"Add a site"** e digite seu dominio
2. Selecione o plano **Free**
3. O Cloudflare vai mostrar os nameservers para configurar
4. Va no seu registrador de dominio e troque os nameservers para os do Cloudflare
5. Aguarde a propagacao (pode levar ate 24h, geralmente menos de 1h)

### 5b. Fazer deploy

**Opcao A — Upload direto (mais simples):**

1. No dashboard do Cloudflare, va em **Workers & Pages** > **Create**
2. Clique na aba **Pages** > **Upload assets**
3. Nomeie o projeto (ex: `gtd`)
4. Arraste os 3 arquivos (`index.html`, `manifest.json`, `sw.js`) para a area de upload
5. Clique **Deploy site**
6. Pronto! Voce recebera uma URL tipo `gtd-xyz.pages.dev`

**Opcao B — Via GitHub (atualizacao automatica):**

1. Crie um repositorio **privado** no GitHub com os 3 arquivos
2. No Cloudflare, va em **Workers & Pages** > **Create**
3. Clique na aba **Pages** > **Connect to Git**
4. Selecione o repositorio
5. Deixe as configuracoes padrao (nao precisa de build command)
6. Clique **Save and Deploy**
7. Vantagem: cada `git push` atualiza o app automaticamente

### 5c. Conectar dominio

1. Na pagina do projeto Pages, va em **Custom domains**
2. Clique **Set up a custom domain**
3. Digite o subdominio desejado (ex: `gtd.seudominio.com`)
4. Confirme — o Cloudflare configura o DNS automaticamente
5. HTTPS e configurado automaticamente

---

## Passo 6: Atualizar URL no Supabase

Apos conectar o dominio, volte ao Supabase:
1. Va em **Authentication** > **URL Configuration**
2. Atualize **Site URL** para `https://gtd.seudominio.com`
3. Atualize **Redirect URLs** tambem

---

## Passo 7: Testar

1. Acesse `https://gtd.seudominio.com`
2. Voce vera a tela de login do app
3. Crie uma conta com email e senha
4. Confirme o email (verifique sua caixa de entrada)
5. Faca login — a tela de boas-vindas aparecera
6. Adicione itens, navegue pelas secoes
7. Abra outro navegador/dispositivo e faca login com a mesma conta
8. Os dados devem estar sincronizados!

---

## Atualizar o app

**Upload direto:**
1. Va no projeto Pages > **Deployments** > **Upload new assets**
2. Arraste os arquivos atualizados
3. Deploy instantaneo

**Via Git:**
1. Faca `git push` — o deploy e automatico

---

## Informacoes Importantes

### Sobre os dados
- Cada pessoa tem login individual com dados isolados na nuvem
- Os dados sincronizam automaticamente a cada alteracao (indicador "Salvo na nuvem")
- O app tambem salva localmente (funciona offline temporariamente)
- Export/Import continua disponivel como backup extra

### Sobre o PWA
- Apos acessar pelo celular, o navegador pode oferecer **"Adicionar a Tela Inicial"**
- O app funciona offline (dados locais) e sincroniza quando voltar online
- No Chrome desktop: clique no icone de instalacao na barra de endereco

### Sobre seguranca
- Autenticacao via Supabase (bcrypt + JWT)
- Row Level Security: cada usuario so acessa seus proprios dados
- HTTPS automatico e obrigatorio (Cloudflare)
- Meta tags `noindex`/`nofollow` para nao aparecer em buscadores
- A chave `anon` no HTML e segura — ela so permite operacoes autorizadas pelo RLS
- Senhas nunca sao armazenadas em texto — Supabase usa hash bcrypt

### Sobre custos (gratis)
- **Supabase Free:** 500MB banco, 50K requisicoes/mes, 50K usuarios — suficiente para equipes
- **Cloudflare Pages Free:** ilimitado para sites estaticos
- **Dominio:** unico custo (voce ja tem)

---

## Checklist de Deploy

- [ ] Projeto Supabase criado
- [ ] Tabela `user_data` criada com RLS
- [ ] Autenticacao configurada (email habilitado)
- [ ] Credenciais (URL + anon key) colocadas no `index.html`
- [ ] Projeto Cloudflare Pages criado com os 3 arquivos
- [ ] Dominio personalizado conectado (ex: gtd.seudominio.com)
- [ ] URL do site atualizada no Supabase
- [ ] Testado: criar conta, confirmar email, login
- [ ] Testado: sincronizacao entre dispositivos
- [ ] PWA testada no celular

---

## Gerenciar usuarios

Para adicionar/remover colegas:

**Se registro publico esta habilitado:**
- Colegas criam conta diretamente na tela de login
- Voce pode ver todos os usuarios em: Supabase > Authentication > Users

**Se registro esta desabilitado (somente convites):**
1. Supabase > Authentication > Users > **Invite user**
2. Digite o email do colega
3. Ele recebera um email com link para criar senha

**Para remover acesso:**
1. Supabase > Authentication > Users
2. Encontre o usuario e clique em **Delete user**
3. Os dados GTD dele serao removidos automaticamente (CASCADE)

---

## Compartilhar com os colegas

Apos o deploy, envie esta mensagem:

> Ola! Disponibilizei um app GTD (Getting Things Done) para organizarmos nossas tarefas.
>
> Acesse: **https://gtd.seudominio.com**
>
> 1. Clique em "Criar conta" e registre-se com seu email e uma senha
> 2. Confirme seu email (verifique a caixa de entrada e spam)
> 3. Faca login — uma tela de boas-vindas explica como funciona
> 4. Seus dados ficam salvos na nuvem e acessiveis de qualquer dispositivo
> 5. No celular, voce pode instalar como app (clique em "Adicionar a Tela Inicial")
>
> Qualquer duvida, me procure!
