<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/app');
	});
</script>

<svelte:head>
	<title>GTD — Getting Things Done</title>
</svelte:head>

<!-- Redirect para /app (protegido) — hooks.server.ts redireciona para /login se nao autenticado -->
<p>Carregando...</p>
