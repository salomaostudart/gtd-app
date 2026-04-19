<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	const { form }: { form: ActionData } = $props();

	let loading = $state(false);
	let showPassword = $state(false);
</script>

<svelte:head>
	<title>Criar conta — GTD</title>
</svelte:head>

<div class="auth-overlay">
	<div class="auth-box">
		<div class="auth-logo">GTD</div>
		<div class="auth-subtitle">Getting Things Done</div>

		{#if form?.success}
			<div class="auth-message auth-message-success" role="status">
				<p>Conta criada! Verifique seu email para confirmar o cadastro.</p>
				<a href="/login">Ir para o login</a>
			</div>
		{:else}
			{#if form?.error}
				<div class="auth-message auth-message-error" role="alert" aria-live="polite">
					{form.error}
				</div>
			{/if}

			<form
				method="POST"
				action="?/signup"
				use:enhance={() => {
					loading = true;
					return async ({ result, update }) => {
						loading = false;
						if (result.type !== 'success') await update({ reset: false });
					};
				}}
			>
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
						value={form?.email ?? ''}
					/>
				</div>

				<div class="form-group">
					<label for="password">Senha</label>
					<div class="password-wrapper">
						<input
							id="password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							placeholder="Minimo 6 caracteres"
							autocomplete="new-password"
							required
							disabled={loading}
							minlength={6}
						/>
						<button
							type="button"
							class="password-toggle"
							onclick={() => (showPassword = !showPassword)}
							tabindex={-1}
							aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
						>
							{showPassword ? '🙈' : '👁'}
						</button>
					</div>
				</div>

				<button type="submit" class="btn btn-primary auth-submit" disabled={loading}>
					{loading ? 'Criando conta...' : 'Criar conta'}
				</button>
			</form>

			<p class="auth-toggle">Ja tem conta? <a href="/login">Entrar</a></p>
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

	.password-wrapper {
		position: relative;
	}

	.password-wrapper input {
		padding-right: 40px;
	}

	.password-toggle {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		cursor: pointer;
		font-size: 16px;
		padding: 0;
		color: var(--text-muted);
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

	.auth-message-success a {
		color: var(--green);
		display: block;
		margin-top: 8px;
	}
</style>
