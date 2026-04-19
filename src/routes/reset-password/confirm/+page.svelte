<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { getContext } from 'svelte';
	import type { TypedSupabaseClient } from '$lib/supabase';
	import type { ActionData, PageData } from './$types';

	const { form, data }: { form: ActionData; data: PageData } = $props();

	const { supabase } = getContext<{ supabase: TypedSupabaseClient }>('supabase');

	let loading = $state(false);
	let exchangeError = $state('');
	let exchangeDone = $state(false);

	// O @supabase/ssr createBrowserClient ja tem detectSessionInUrl: true.
	// Isso significa que ao carregar a pagina com ?code=..., o Supabase
	// automaticamente chama exchangeCodeForSession internamente durante initialize().
	// Nao devemos chamar manualmente — isso causaria dupla tentativa e falha no
	// segundo chamado (code_verifier ja consumido pelo primeiro).
	//
	// Em vez disso, ouvimos o evento onAuthStateChange:
	// - PASSWORD_RECOVERY: exchange ok, usuario autenticado — exibir form
	// - SIGNED_OUT / erro de URL: mostrar mensagem de erro
	onMount(async () => {
		const urlError = new URLSearchParams(window.location.search).get('error');
		const code = new URLSearchParams(window.location.search).get('code');

		if (urlError) {
			exchangeError = 'Link de recuperacao invalido ou expirado. Solicite um novo.';
			exchangeDone = true;
			return;
		}

		if (!code) {
			exchangeError = 'Codigo de recuperacao nao encontrado. Solicite um novo link.';
			exchangeDone = true;
			return;
		}

		// Ouvir evento PASSWORD_RECOVERY — disparado pelo detectSessionInUrl automatico
		// Nota: onAuthStateChange dispara INITIAL_SESSION imediatamente com o estado atual.
		// Se o detectSessionInUrl ja rodou (antes do onMount), a sessao ja esta estabelecida
		// e INITIAL_SESSION chega com session valido. PASSWORD_RECOVERY nao sera re-disparado.
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'PASSWORD_RECOVERY') {
				// Exchange bem-sucedido, sessao estabelecida pelo detectSessionInUrl
				exchangeDone = true;
			} else if (event === 'INITIAL_SESSION' && session) {
				// detectSessionInUrl ja rodou antes do onMount — sessao valida disponivel
				// Verificar se e uma sessao de recuperacao (user com recovery_sent_at recente)
				exchangeDone = true;
			} else if (event === 'INITIAL_SESSION' && !session) {
				// Nenhuma sessao — exchange falhou ou link invalido
				if (!exchangeDone) {
					exchangeError = 'Link invalido ou expirado. Solicite um novo link de recuperacao.';
					exchangeDone = true;
				}
			} else if (event === 'SIGNED_OUT') {
				if (!exchangeDone) {
					exchangeError = 'Link invalido ou expirado. Solicite um novo link de recuperacao.';
					exchangeDone = true;
				}
			}
		});

		// Timeout de seguranca: se nenhum evento chegar em 5s, reportar erro
		const timeout = setTimeout(() => {
			if (!exchangeDone) {
				exchangeError = 'Tempo esgotado ao verificar o link. Solicite um novo.';
				exchangeDone = true;
			}
		}, 5000);

		return () => {
			subscription.unsubscribe();
			clearTimeout(timeout);
		};
	});
</script>

<svelte:head>
	<title>Nova senha — GTD</title>
</svelte:head>

<div class="auth-overlay">
	<div class="auth-box">
		<div class="auth-logo">GTD</div>
		<div class="auth-subtitle">Definir nova senha</div>

		{#if !exchangeDone}
			<div class="auth-message auth-message-info" role="status">
				Verificando link...
			</div>
		{:else if exchangeError}
			<div class="auth-message auth-message-error" role="alert" aria-live="polite">
				{exchangeError}
			</div>
			<p class="auth-toggle"><a href="/reset-password">Solicitar novo link</a></p>
		{:else}
			{#if form?.error}
				<div class="auth-message auth-message-error" role="alert" aria-live="polite">
					{form.error}
				</div>
			{/if}

			<form
				method="POST"
				action="?/update"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						loading = false;
						await update();
					};
				}}
			>
				<div class="form-group">
					<label for="password">Nova senha</label>
					<input
						id="password"
						name="password"
						type="password"
						placeholder="Minimo 8 caracteres"
						autocomplete="new-password"
						required
						minlength={8}
						disabled={loading}
					/>
				</div>

				<div class="form-group">
					<label for="confirm">Confirmar nova senha</label>
					<input
						id="confirm"
						name="confirm"
						type="password"
						placeholder="Repita a senha"
						autocomplete="new-password"
						required
						minlength={8}
						disabled={loading}
					/>
				</div>

				<button type="submit" class="btn btn-primary auth-submit" disabled={loading}>
					{loading ? 'Salvando...' : 'Salvar nova senha'}
				</button>
			</form>
		{/if}

		<p class="auth-toggle"><a href="/login">Voltar ao login</a></p>
	</div>
</div>

<style>
	.auth-overlay {
		position: fixed;
		inset: 0;
		background: var(--bg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 500;
	}

	.auth-box {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 32px;
		width: 380px;
		max-width: 95vw;
		box-shadow: var(--shadow);
	}

	.auth-logo {
		font-size: 32px;
		font-weight: 800;
		color: var(--accent);
		letter-spacing: 4px;
		text-align: center;
		margin-bottom: 4px;
	}

	.auth-subtitle {
		font-size: 12px;
		color: var(--text-muted);
		text-align: center;
		margin-bottom: 24px;
	}

	.form-group {
		margin-bottom: 16px;
	}

	.form-group label {
		display: block;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		margin-bottom: 6px;
	}

	.auth-submit {
		width: 100%;
		padding: 10px;
		font-size: 14px;
		justify-content: center;
		margin-top: 8px;
	}

	.auth-toggle {
		text-align: center;
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 12px;
	}

	.auth-toggle a {
		color: var(--accent);
		text-decoration: none;
	}

	.auth-message {
		border-radius: var(--radius-sm);
		padding: 10px 14px;
		font-size: 13px;
		margin-bottom: 16px;
	}

	.auth-message-error {
		background: var(--red-bg);
		border: 1px solid var(--red);
		color: var(--red);
	}

	.auth-message-info {
		background: var(--bg-tertiary, #2a2a2a);
		border: 1px solid var(--border);
		color: var(--text-secondary);
	}
</style>
