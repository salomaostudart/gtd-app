<script lang="ts">
	import type { LayoutData } from './$types';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { setContext } from 'svelte';
	import '$lib/styles/gtd.css';

	const { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const supabase = createSupabaseBrowserClient();

	setContext('supabase', {
		supabase,
		get user() {
			return data.user;
		},
	});
</script>

{@render children()}
