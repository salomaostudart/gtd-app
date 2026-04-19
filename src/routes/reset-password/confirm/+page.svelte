<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	const { form }: { form: ActionData } = $props();

	let loading = $state(false);
</script>

<svelte:head>
	<title>Nova senha — GTD</title>
</svelte:head>

<div class="auth-overlay">
	<div class="auth-box">
		<div class="auth-logo">GTD</div>
		<div class="auth-subtitle">Definir nova senha</div>

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

	.auth-toggle a:hover {
		text-decoration: underline;
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
</style>
