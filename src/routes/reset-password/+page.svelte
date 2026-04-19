<script lang="ts">
	import { getContext } from 'svelte';
	import type { TypedSupabaseClient } from '$lib/supabase';

	// Client-side: resetPasswordForEmail DEVE ser chamado pelo browser
	// para que o code_verifier seja armazenado no sessionStorage do browser.
	// Se chamado via server action, o code_verifier nao existe no browser
	// e o exchange subsequente falha com otp_expired.
	const { supabase } = getContext<{ supabase: TypedSupabaseClient }>('supabase');

	let email = $state('');
	let loading = $state(false);
	let success = $state(false);
	let error = $state('');

	async function handleReset(e: Event) {
		e.preventDefault();
		if (!email) {
			error = 'Informe seu email.';
			return;
		}

		loading = true;
		error = '';

		const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/reset-password/confirm`
		});

		loading = false;

		if (resetError) {
			error = 'Nao foi possivel enviar o email. Tente novamente.';
		} else {
			success = true;
		}
	}
</script>

<svelte:head>
	<title>Recuperar senha — GTD</title>
</svelte:head>

<div class="auth-overlay">
	<div class="auth-box">
		<div class="auth-logo">GTD</div>
		<div class="auth-subtitle">Recuperar senha</div>

		{#if success}
			<div class="auth-message auth-message-success" role="status">
				Email enviado! Verifique sua caixa de entrada e clique no link para redefinir a senha.
			</div>
			<p class="auth-toggle"><a href="/login">Voltar ao login</a></p>
		{:else}
			{#if error}
				<div class="auth-message auth-message-error" role="alert" aria-live="polite">
					{error}
				</div>
			{/if}

			<form onsubmit={handleReset}>
				<div class="form-group">
					<label for="email">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						placeholder="seu@email.com"
						autocomplete="email"
						required
						disabled={loading}
						bind:value={email}
					/>
				</div>

				<button type="submit" class="btn btn-primary auth-submit" disabled={loading}>
					{loading ? 'Enviando...' : 'Enviar link de recuperacao'}
				</button>
			</form>

			<p class="auth-toggle"><a href="/login">Voltar ao login</a></p>
		{/if}
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

	.auth-message-success {
		background: var(--green-bg);
		border: 1px solid var(--green);
		color: var(--green);
	}
</style>
