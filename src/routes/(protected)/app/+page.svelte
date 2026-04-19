<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';
	import { createGtdStore, type GTDData } from '$lib/gtd/store.svelte';
	import type { TypedSupabaseClient } from '$lib/supabase';

	const { data }: { data: PageData } = $props();
	const { supabase } = getContext<{ supabase: TypedSupabaseClient; user: unknown }>('supabase');

	// GTD store (Svelte 5 runes)
	const store = createGtdStore();

	// UI state
	let currentPage = $state('dashboard');
	let sidebarOpen = $state(false);
	let quickCaptureOpen = $state(false);
	let quickCaptureText = $state('');
	let theme = $state('dark');
	let syncStatus = $state<'idle' | 'syncing' | 'ok' | 'error'>('idle');
	let syncTimeout: ReturnType<typeof setTimeout> | null = null;
	let toasts = $state<Array<{ id: string; msg: string; type: string }>>([]);

	// Derived badges
	const badges = $derived({
		inbox: store.data.inbox.length,
		actions: store.data.actions.filter((a) => !a.projectId).length,
		projects: store.data.projects.length,
		waiting: store.data.waiting.length,
		someday: store.data.someday.length,
	});

	// Process wizard state
	let processItem = $state<(typeof store.data.inbox)[0] | null>(null);
	let processStep = $state<'start' | 'actionable' | 'what' | 'multiStep' | 'delegate' | 'defer' | 'context'>('start');

	// Inbox input
	let inboxInput = $state('');

	// Action modal state
	let actionText = $state('');
	let actionContext = $state('');
	let actionEnergy = $state('');
	let actionTime = $state('');
	let actionNotes = $state('');
	let actionDueDate = $state('');
	let actionProjectId = $state<string | null>(null);
	let showActionModal = $state(false);

	// Calendar item state
	let calText = $state('');
	let calDate = $state('');
	let calTime = $state('');

	// Waiting item state
	let waitingText = $state('');
	let waitingPerson = $state('');

	// Someday item state
	let somedayText = $state('');

	// Reference item state
	let refText = $state('');
	let refTags = $state('');
	let refSearch = $state('');

	// Filtered references
	const filteredReference = $derived(
		store.data.reference.filter(
			(r) =>
				!refSearch ||
				r.text.toLowerCase().includes(refSearch.toLowerCase()) ||
				r.tags.toLowerCase().includes(refSearch.toLowerCase()),
		),
	);

	// Filtered actions
	let filterContext = $state('');
	let filterEnergy = $state('');
	let filterTime = $state('');

	const filteredActions = $derived(
		store.data.actions.filter((a) => {
			if (filterContext && a.context !== filterContext) return false;
			if (filterEnergy && a.energy !== filterEnergy) return false;
			if (filterTime && a.time !== filterTime) return false;
			return true;
		}),
	);

	// Calendar sorted by date
	const sortedCalendar = $derived(
		[...store.data.calendar].sort((a, b) => {
			const da = a.date + (a.time ? 'T' + a.time : '');
			const db = b.date + (b.time ? 'T' + b.time : '');
			return da.localeCompare(db);
		}),
	);

	// Overdue calendar items
	const overdueCount = $derived(
		store.data.calendar.filter((c) => {
			if (!c.date) return false;
			return new Date(c.date + 'T23:59:59') < new Date();
		}).length,
	);

	function toast(msg: string, type = 'success') {
		const id = Date.now().toString();
		toasts = [...toasts, { id, msg, type }];
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, 2500);
	}

	function navigate(page: string) {
		currentPage = page;
		sidebarOpen = false;
	}

	function formatDate(d: string) {
		if (!d) return '';
		const dt = new Date(d + 'T00:00:00');
		return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
	}

	function timeAgo(iso: string) {
		if (!iso) return '';
		const diff = Date.now() - new Date(iso).getTime();
		const days = Math.floor(diff / 86400000);
		if (days === 0) return 'hoje';
		if (days === 1) return 'ontem';
		return `${days}d atras`;
	}

	// Sync to Supabase
	function schedulSync() {
		if (syncTimeout) clearTimeout(syncTimeout);
		syncTimeout = setTimeout(doSync, 3000);
	}

	async function doSync() {
		syncStatus = 'syncing';
		try {
			const { error } = await supabase
				.from('user_data')
				.upsert(
					{ user_id: data.user!.id, data: store.data, updated_at: new Date().toISOString() },
					{ onConflict: 'user_id' },
				);
			syncStatus = error ? 'error' : 'ok';
		} catch {
			syncStatus = 'error';
		}
		setTimeout(() => { syncStatus = 'idle'; }, 2000);
	}

	function saveAndSync() {
		store.save();
		schedulSync();
	}

	// Quick capture
	function openQuickCapture() {
		quickCaptureOpen = true;
		quickCaptureText = '';
	}

	function closeQuickCapture() {
		quickCaptureOpen = false;
	}

	function submitQuickCapture() {
		if (!quickCaptureText.trim()) return;
		store.addInboxItem(quickCaptureText.trim());
		saveAndSync();
		toast('Capturado!');
		closeQuickCapture();
	}

	// Inbox
	function addInboxItem() {
		if (!inboxInput.trim()) return;
		store.addInboxItem(inboxInput.trim());
		inboxInput = '';
		saveAndSync();
		toast('Item adicionado ao Inbox');
	}

	function deleteInboxItem(id: string) {
		store.removeInboxItem(id);
		saveAndSync();
	}

	function startProcess(item: (typeof store.data.inbox)[0]) {
		processItem = item;
		processStep = 'start';
		navigate('process');
	}

	// Process wizard actions
	function processDoIt() {
		if (!processItem) return;
		store.removeInboxItem(processItem.id);
		store.data.completedToday = (store.data.completedToday ?? 0) + 1;
		saveAndSync();
		toast('Feito!', 'success');
		processItem = null;
		processStep = 'start';
		navigate('inbox');
	}

	function processTrash() {
		if (!processItem) return;
		store.removeInboxItem(processItem.id);
		saveAndSync();
		toast('Item descartado');
		processItem = null;
		processStep = 'start';
		navigate('inbox');
	}

	function processSomeday() {
		if (!processItem) return;
		store.addSomedayItem(processItem.text);
		store.removeInboxItem(processItem.id);
		saveAndSync();
		toast('Movido para Algum Dia');
		processItem = null;
		processStep = 'start';
		navigate('inbox');
	}

	function processReference() {
		if (!processItem) return;
		store.addReferenceItem({ text: processItem.text, tags: '' });
		store.removeInboxItem(processItem.id);
		saveAndSync();
		toast('Movido para Referencia');
		processItem = null;
		processStep = 'start';
		navigate('inbox');
	}

	function processAsAction() {
		if (!processItem) return;
		actionText = processItem.text;
		actionContext = '';
		actionEnergy = '';
		actionTime = '';
		actionNotes = '';
		actionDueDate = '';
		actionProjectId = null;
		showActionModal = true;
	}

	function confirmAddAction() {
		if (!actionText.trim()) return;
		store.addAction({
			text: actionText.trim(),
			context: actionContext,
			energy: actionEnergy,
			time: actionTime,
			projectId: actionProjectId,
			notes: actionNotes,
			dueDate: actionDueDate,
		});
		if (processItem) {
			store.removeInboxItem(processItem.id);
			processItem = null;
			processStep = 'start';
		}
		showActionModal = false;
		saveAndSync();
		toast('Acao adicionada!');
		navigate('actions');
	}

	function processDelegate() {
		if (!processItem) return;
		if (!waitingPerson.trim()) { toast('Informe a pessoa', 'error'); return; }
		store.addWaitingItem({
			text: processItem.text,
			person: waitingPerson.trim(),
			delegatedAt: new Date().toISOString(),
		});
		store.removeInboxItem(processItem.id);
		saveAndSync();
		toast('Movido para Aguardando');
		waitingPerson = '';
		processItem = null;
		processStep = 'start';
		navigate('inbox');
	}

	function processCalendar() {
		if (!processItem || !calDate) { toast('Informe a data', 'error'); return; }
		store.addCalendarItem({ text: processItem.text, date: calDate, time: calTime });
		store.removeInboxItem(processItem.id);
		saveAndSync();
		toast('Adicionado ao Calendario');
		calDate = '';
		calTime = '';
		processItem = null;
		processStep = 'start';
		navigate('inbox');
	}

	// Logout
	let loggingOut = $state(false);

	async function handleLogout() {
		loggingOut = true;
		await supabase.auth.signOut();
		window.location.href = '/login';
	}

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
		try { localStorage.setItem('gtd-theme', theme); } catch { /* ignore */ }
	}

	// Export / Import
	function exportData() {
		const blob = new Blob([store.exportData()], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `gtd-backup-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
	}

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		const tag = (e.target as HTMLElement).tagName.toLowerCase();
		if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault();
			openQuickCapture();
			return;
		}

		const pageKeys: Record<string, string> = {
			'1': 'dashboard', '2': 'inbox', '3': 'process',
			'4': 'actions', '5': 'projects', '6': 'calendar',
			'7': 'waiting', '8': 'someday', '9': 'review', '0': 'reference',
		};
		if (pageKeys[e.key]) navigate(pageKeys[e.key]);
	}

	onMount(() => {
		store.init();

		// Load cloud data if available
		if (data.cloudData) {
			store.loadCloudData(data.cloudData as GTDData);
		}

		// Restore theme
		try {
			const saved = localStorage.getItem('gtd-theme');
			if (saved) {
				theme = saved;
				document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
			}
		} catch { /* ignore */ }

		// Keyboard shortcuts
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

<svelte:head>
	<title>GTD — Getting Things Done</title>
</svelte:head>

<!-- Quick Capture Modal -->
{#if quickCaptureOpen}
	<div
		class="quick-capture-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Captura rapida"
		onclick={(e) => { if (e.target === e.currentTarget) closeQuickCapture(); }}
		onkeydown={(e) => { if (e.key === 'Escape') closeQuickCapture(); }}
	>
		<div class="quick-capture-box">
			<p class="text-muted text-sm" style="margin-bottom: 10px">Captura Rapida (Ctrl+K)</p>
			<input
				type="text"
				placeholder="O que esta na sua mente?"
				bind:value={quickCaptureText}
				onkeydown={(e) => { if (e.key === 'Enter') submitQuickCapture(); if (e.key === 'Escape') closeQuickCapture(); }}
				autofocus
			/>
			<div style="display:flex; gap:8px; margin-top:10px; justify-content:flex-end">
				<button class="btn" onclick={closeQuickCapture}>Cancelar</button>
				<button class="btn btn-primary" onclick={submitQuickCapture}>Capturar</button>
			</div>
		</div>
	</div>
{/if}

<!-- Action Modal -->
{#if showActionModal}
	<div
		class="quick-capture-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Adicionar acao"
		onclick={(e) => { if (e.target === e.currentTarget) showActionModal = false; }}
	>
		<div class="quick-capture-box" style="width:560px">
			<p style="font-weight:600; margin-bottom:16px">Proxima Acao</p>
			<div style="margin-bottom:12px">
				<input type="text" placeholder="Descricao da acao" bind:value={actionText} />
			</div>
			<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:12px">
				<select bind:value={actionContext}>
					<option value="">Contexto</option>
					{#each store.data.contexts as ctx}
						<option value={ctx}>{ctx}</option>
					{/each}
				</select>
				<select bind:value={actionEnergy}>
					<option value="">Energia</option>
					<option value="Alta">Alta</option>
					<option value="Media">Media</option>
					<option value="Baixa">Baixa</option>
				</select>
				<select bind:value={actionTime}>
					<option value="">Tempo</option>
					<option value="5min">5 min</option>
					<option value="15min">15 min</option>
					<option value="30min">30 min</option>
					<option value="1h">1 hora</option>
					<option value="2h+">2h+</option>
				</select>
			</div>
			<div style="margin-bottom:12px">
				<select bind:value={actionProjectId}>
					<option value={null}>Sem projeto</option>
					{#each store.data.projects as proj}
						<option value={proj.id}>{proj.name}</option>
					{/each}
				</select>
			</div>
			<div style="margin-bottom:12px">
				<input type="date" bind:value={actionDueDate} placeholder="Data limite (opcional)" />
			</div>
			<div style="margin-bottom:16px">
				<textarea placeholder="Notas (opcional)" bind:value={actionNotes} rows={2}></textarea>
			</div>
			<div style="display:flex; gap:8px; justify-content:flex-end">
				<button class="btn" onclick={() => showActionModal = false}>Cancelar</button>
				<button class="btn btn-primary" onclick={confirmAddAction}>Salvar</button>
			</div>
		</div>
	</div>
{/if}

<!-- Toast container -->
<div class="toast-container" aria-live="polite">
	{#each toasts as t (t.id)}
		<div class="toast toast-{t.type}">{t.msg}</div>
	{/each}
</div>

<!-- Sync indicator -->
{#if syncStatus !== 'idle'}
	<div class="sync-indicator" role="status">
		{#if syncStatus === 'syncing'}Sincronizando...{/if}
		{#if syncStatus === 'ok'}Salvo na nuvem{/if}
		{#if syncStatus === 'error'}Erro ao sincronizar{/if}
	</div>
{/if}

<!-- Sidebar backdrop (mobile) -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="sidebar-backdrop"
	class:active={sidebarOpen}
	onclick={() => (sidebarOpen = false)}
></div>

<div class="app">
	<!-- SIDEBAR -->
	<aside class="sidebar" class:open={sidebarOpen} aria-label="Navegacao">
		<div class="sidebar-header">
			<h1>GTD</h1>
			<p>Getting Things Done</p>
		</div>

		<nav class="sidebar-nav">
			<div class="nav-section">
				<div class="nav-section-title">Principal</div>
				<button class="nav-item" class:active={currentPage === 'dashboard'} onclick={() => navigate('dashboard')}>
					<span class="icon">&#9673;</span> Dashboard
				</button>
				<button class="nav-item" class:active={currentPage === 'inbox'} onclick={() => navigate('inbox')}>
					<span class="icon">&#9993;</span> Caixa de Entrada
					{#if badges.inbox > 0}<span class="badge">{badges.inbox}</span>{/if}
				</button>
				<button class="nav-item" class:active={currentPage === 'process'} onclick={() => navigate('process')}>
					<span class="icon">&#9881;</span> Processar Inbox
				</button>
			</div>

			<div class="nav-section">
				<div class="nav-section-title">Listas</div>
				<button class="nav-item" class:active={currentPage === 'actions'} onclick={() => navigate('actions')}>
					<span class="icon">&#9654;</span> Proximas Acoes
					{#if badges.actions > 0}<span class="badge">{badges.actions}</span>{/if}
				</button>
				<button class="nav-item" class:active={currentPage === 'projects'} onclick={() => navigate('projects')}>
					<span class="icon">&#9632;</span> Projetos
					{#if badges.projects > 0}<span class="badge">{badges.projects}</span>{/if}
				</button>
				<button class="nav-item" class:active={currentPage === 'calendar'} onclick={() => navigate('calendar')}>
					<span class="icon">&#128197;</span> Calendario
					{#if overdueCount > 0}<span class="badge" style="background:var(--red-bg);color:var(--red)">{overdueCount}</span>{/if}
				</button>
				<button class="nav-item" class:active={currentPage === 'waiting'} onclick={() => navigate('waiting')}>
					<span class="icon">&#8987;</span> Aguardando
					{#if badges.waiting > 0}<span class="badge">{badges.waiting}</span>{/if}
				</button>
				<button class="nav-item" class:active={currentPage === 'someday'} onclick={() => navigate('someday')}>
					<span class="icon">&#9734;</span> Algum Dia / Talvez
					{#if badges.someday > 0}<span class="badge">{badges.someday}</span>{/if}
				</button>
				<button class="nav-item" class:active={currentPage === 'reference'} onclick={() => navigate('reference')}>
					<span class="icon">&#128194;</span> Referencia
				</button>
			</div>

			<div class="nav-section">
				<div class="nav-section-title">Revisao</div>
				<button class="nav-item" class:active={currentPage === 'review'} onclick={() => navigate('review')}>
					<span class="icon">&#128270;</span> Revisao Semanal
				</button>
			</div>
		</nav>

		<div class="sidebar-footer">
			<div class="user-info">
				<span class="user-name">{data.user?.email}</span>
				<button class="logout-btn" onclick={handleLogout} disabled={loggingOut}>
					{loggingOut ? '...' : 'Sair'}
				</button>
			</div>
			<button class="nav-item" onclick={openQuickCapture} style="color:var(--accent)">
				<span class="icon">&#9889;</span> Captura Rapida
				<span class="badge" style="background:var(--accent-bg);color:var(--accent);font-size:10px">Ctrl+K</span>
			</button>
			<button class="nav-item" onclick={toggleTheme}>
				<span class="icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
				{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
			</button>
			<button class="nav-item" onclick={exportData}>
				<span class="icon">&#128190;</span> Exportar Dados
			</button>
		</div>
	</aside>

	<!-- MAIN -->
	<main class="main">
		<div class="main-header">
			<div style="display:flex; align-items:center; gap:12px">
				<button class="mobile-toggle" onclick={() => (sidebarOpen = !sidebarOpen)} aria-label="Menu">
					&#9776;
				</button>
				<h2>
					{#if currentPage === 'dashboard'}&#9673; Dashboard{/if}
					{#if currentPage === 'inbox'}&#9993; Caixa de Entrada{/if}
					{#if currentPage === 'process'}&#9881; Processar Inbox{/if}
					{#if currentPage === 'actions'}&#9654; Proximas Acoes{/if}
					{#if currentPage === 'projects'}&#9632; Projetos{/if}
					{#if currentPage === 'calendar'}&#128197; Calendario{/if}
					{#if currentPage === 'waiting'}&#8987; Aguardando{/if}
					{#if currentPage === 'someday'}&#9734; Algum Dia / Talvez{/if}
					{#if currentPage === 'reference'}&#128194; Referencia{/if}
					{#if currentPage === 'review'}&#128270; Revisao Semanal{/if}
				</h2>
			</div>
		</div>

		<div class="main-content">

			<!-- DASHBOARD -->
			{#if currentPage === 'dashboard'}
				<div class="dashboard-grid">
					<div class="stat-card stat-blue">
						<div class="stat-number">{store.data.inbox.length}</div>
						<div class="stat-label">Inbox</div>
					</div>
					<div class="stat-card stat-green">
						<div class="stat-number">{store.data.completedToday ?? 0}</div>
						<div class="stat-label">Feitas hoje</div>
					</div>
					<div class="stat-card stat-orange">
						<div class="stat-number">{store.data.actions.length}</div>
						<div class="stat-label">Proximas Acoes</div>
					</div>
					<div class="stat-card stat-purple">
						<div class="stat-number">{store.data.projects.length}</div>
						<div class="stat-label">Projetos Ativos</div>
					</div>
					<div class="stat-card stat-cyan">
						<div class="stat-number">{store.data.waiting.length}</div>
						<div class="stat-label">Aguardando</div>
					</div>
					<div class="stat-card stat-yellow">
						<div class="stat-number">{store.data.someday.length}</div>
						<div class="stat-label">Algum Dia</div>
					</div>
				</div>

				{#if overdueCount > 0}
					<div class="section-title">Alertas</div>
					<div class="card" style="border-color:var(--red)">
						<span style="color:var(--red)">&#9888; {overdueCount} item(s) no Calendario vencidos</span>
					</div>
				{/if}

				{#if store.data.inbox.length > 5}
					<div class="card" style="border-color:var(--yellow)">
						<span style="color:var(--yellow)">&#9888; Inbox com {store.data.inbox.length} itens — processe!</span>
					</div>
				{/if}

				<div class="mt-24 section-title">Proximas 5 acoes</div>
				{#each store.data.actions.slice(0, 5) as action}
					<div class="item">
						<button class="item-btn" onclick={() => { store.completeAction(action.id); saveAndSync(); toast('Acao concluida!'); }} title="Concluir" aria-label="Concluir acao">&#10003;</button>
						<div class="item-text">
							{action.text}
							{#if action.context}<span class="tag tag-context">{action.context}</span>{/if}
						</div>
					</div>
				{/each}
				{#if store.data.actions.length === 0}
					<div class="empty-state"><p>Nenhuma acao pendente. Bom trabalho!</p></div>
				{/if}

			<!-- INBOX -->
			{:else if currentPage === 'inbox'}
				<div class="add-bar">
					<input
						type="text"
						placeholder="Capturar... o que esta na sua mente?"
						bind:value={inboxInput}
						onkeydown={(e) => { if (e.key === 'Enter') addInboxItem(); }}
					/>
					<button class="btn btn-primary" onclick={addInboxItem}>+ Capturar</button>
				</div>

				{#if store.data.inbox.length === 0}
					<div class="empty-state"><p>Inbox limpo! Processe os itens regularmente.</p></div>
				{:else}
					{#each store.data.inbox as item (item.id)}
						<div class="item">
							<div class="item-text">
								{item.text}
								<div class="item-meta">{timeAgo(item.createdAt)}</div>
							</div>
							<button class="btn btn-sm" onclick={() => startProcess(item)} title="Processar">&#9881; Processar</button>
							<button class="item-btn btn-danger" onclick={() => deleteInboxItem(item.id)} title="Deletar" aria-label="Deletar item">&#10005;</button>
						</div>
					{/each}
				{/if}

			<!-- PROCESS WIZARD -->
			{:else if currentPage === 'process'}
				<div class="process-wizard">
					{#if !processItem && store.data.inbox.length === 0}
						<div class="empty-state">
							<p>Inbox vazio! Nenhum item para processar.</p>
							<button class="btn btn-primary" style="margin-top:16px" onclick={() => navigate('inbox')}>Ir para o Inbox</button>
						</div>
					{:else if !processItem}
						<p class="text-muted" style="margin-bottom:16px">Selecione um item do Inbox para processar:</p>
						{#each store.data.inbox as item (item.id)}
							<div class="item">
								<div class="item-text">{item.text}</div>
								<button class="btn btn-sm btn-primary" onclick={() => startProcess(item)}>Processar</button>
							</div>
						{/each}
					{:else}
						<div class="process-item-preview">{processItem.text}</div>

						{#if processStep === 'start'}
							<p class="process-question">Este item e acionavel?</p>
							<div class="process-actions">
								<button class="process-btn" onclick={() => (processStep = 'actionable')}>
									<span class="process-icon">&#9654;</span>
									<div><strong>Sim</strong> — exige uma acao</div>
								</button>
								<button class="process-btn" onclick={processTrash}>
									<span class="process-icon">&#128465;</span>
									<div><strong>Nao — Descartar</strong></div>
								</button>
								<button class="process-btn" onclick={processSomeday}>
									<span class="process-icon">&#9734;</span>
									<div><strong>Nao — Algum Dia / Talvez</strong></div>
								</button>
								<button class="process-btn" onclick={processReference}>
									<span class="process-icon">&#128194;</span>
									<div><strong>Nao — Referencia</strong> (guardar pra consultar)</div>
								</button>
							</div>

						{:else if processStep === 'actionable'}
							<p class="process-question">Leva menos de 2 minutos?</p>
							<div class="process-actions">
								<button class="process-btn" onclick={processDoIt}>
									<span class="process-icon">&#9889;</span>
									<div><strong>Sim — Fazer agora</strong></div>
								</button>
								<button class="process-btn" onclick={() => (processStep = 'what')}>
									<span class="process-icon">&#9654;</span>
									<div><strong>Nao — Definir proxima acao</strong></div>
								</button>
								<button class="process-btn" onclick={() => (processStep = 'delegate')}>
									<span class="process-icon">&#8987;</span>
									<div><strong>Delegar</strong> — Aguardando</div>
								</button>
								<button class="process-btn" onclick={() => (processStep = 'defer')}>
									<span class="process-icon">&#128197;</span>
									<div><strong>Agendar</strong> — Calendario</div>
								</button>
							</div>

						{:else if processStep === 'what'}
							<p class="process-question">Qual e a proxima acao fisica?</p>
							<div style="margin-bottom:16px">
								<input type="text" placeholder="Ex: Ligar para fornecedor, Escrever email para..." bind:value={actionText} />
							</div>
							<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:12px">
								<select bind:value={actionContext}>
									<option value="">Contexto</option>
									{#each store.data.contexts as ctx}
										<option value={ctx}>{ctx}</option>
									{/each}
								</select>
								<select bind:value={actionEnergy}>
									<option value="">Energia</option>
									<option>Alta</option><option>Media</option><option>Baixa</option>
								</select>
								<select bind:value={actionTime}>
									<option value="">Tempo</option>
									<option>5min</option><option>15min</option><option>30min</option><option>1h</option><option>2h+</option>
								</select>
							</div>
							<div style="margin-bottom:12px">
								<select bind:value={actionProjectId}>
									<option value={null}>Sem projeto</option>
									{#each store.data.projects as proj}
										<option value={proj.id}>{proj.name}</option>
									{/each}
								</select>
							</div>
							<div style="display:flex; gap:8px; margin-top:16px">
								<button class="btn" onclick={() => (processStep = 'actionable')}>Voltar</button>
								<button class="btn btn-primary" onclick={confirmAddAction} disabled={!actionText.trim()}>Salvar Acao</button>
							</div>

						{:else if processStep === 'delegate'}
							<p class="process-question">Para quem vai delegar?</p>
							<div style="margin-bottom:16px">
								<input type="text" placeholder="Nome da pessoa" bind:value={waitingPerson} />
							</div>
							<div style="display:flex; gap:8px">
								<button class="btn" onclick={() => (processStep = 'actionable')}>Voltar</button>
								<button class="btn btn-primary" onclick={processDelegate}>Mover para Aguardando</button>
							</div>

						{:else if processStep === 'defer'}
							<p class="process-question">Quando?</p>
							<div style="display:flex; gap:10px; margin-bottom:16px">
								<input type="date" bind:value={calDate} style="flex:1" />
								<input type="time" bind:value={calTime} style="width:120px" />
							</div>
							<div style="display:flex; gap:8px">
								<button class="btn" onclick={() => (processStep = 'actionable')}>Voltar</button>
								<button class="btn btn-primary" onclick={processCalendar} disabled={!calDate}>Agendar</button>
							</div>
						{/if}
					{/if}
				</div>

			<!-- NEXT ACTIONS -->
			{:else if currentPage === 'actions'}
				<div class="add-bar">
					<input
						type="text"
						placeholder="Nova proxima acao..."
						bind:value={actionText}
						onkeydown={(e) => { if (e.key === 'Enter') { showActionModal = true; } }}
					/>
					<button class="btn btn-primary" onclick={() => { showActionModal = true; }}>+ Acao</button>
				</div>

				<div class="filter-bar">
					<label>Contexto:</label>
					<select bind:value={filterContext}>
						<option value="">Todos</option>
						{#each store.data.contexts as ctx}
							<option value={ctx}>{ctx}</option>
						{/each}
					</select>
					<label>Energia:</label>
					<select bind:value={filterEnergy}>
						<option value="">Todas</option>
						<option>Alta</option><option>Media</option><option>Baixa</option>
					</select>
					<label>Tempo:</label>
					<select bind:value={filterTime}>
						<option value="">Todos</option>
						<option>5min</option><option>15min</option><option>30min</option><option>1h</option><option>2h+</option>
					</select>
				</div>

				{#if filteredActions.length === 0}
					<div class="empty-state"><p>Nenhuma acao. Adicione ou processe itens do Inbox.</p></div>
				{:else}
					{#each filteredActions as action (action.id)}
						<div class="item">
							<button class="item-btn" onclick={() => { store.completeAction(action.id); saveAndSync(); toast('Acao concluida!'); }} title="Concluir" aria-label="Concluir acao" style="color:var(--green)">&#10003;</button>
							<div class="item-text">
								{action.text}
								<div style="display:flex; gap:6px; margin-top:4px; flex-wrap:wrap">
									{#if action.context}<span class="tag tag-context">{action.context}</span>{/if}
									{#if action.energy}<span class="tag tag-energy">{action.energy}</span>{/if}
									{#if action.time}<span class="tag tag-time">{action.time}</span>{/if}
									{#if action.dueDate}<span class="tag" style="background:var(--yellow-bg);color:var(--yellow)">&#128197; {formatDate(action.dueDate)}</span>{/if}
								</div>
								{#if action.notes}<div class="item-meta">{action.notes}</div>{/if}
							</div>
							<button class="item-btn btn-danger" onclick={() => { store.removeAction(action.id); saveAndSync(); toast('Acao removida'); }} aria-label="Remover acao">&#10005;</button>
						</div>
					{/each}
				{/if}

			<!-- PROJECTS -->
			{:else if currentPage === 'projects'}
				<div class="add-bar">
					<input type="text" placeholder="Novo projeto..." bind:value={actionText}
						onkeydown={(e) => { if (e.key === 'Enter' && actionText.trim()) { store.addProject(actionText.trim()); actionText = ''; saveAndSync(); toast('Projeto criado!'); } }}
					/>
					<button class="btn btn-primary" onclick={() => { if (actionText.trim()) { store.addProject(actionText.trim()); actionText = ''; saveAndSync(); toast('Projeto criado!'); } }}>+ Projeto</button>
				</div>

				{#if store.data.projects.length === 0}
					<div class="empty-state"><p>Nenhum projeto. Projetos sao metas com 2+ acoes.</p></div>
				{:else}
					{#each store.data.projects as proj (proj.id)}
						<div class="card">
							<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px">
								<strong style="font-size:15px">{proj.name}</strong>
								<button class="item-btn btn-danger" onclick={() => { store.removeProject(proj.id); saveAndSync(); toast('Projeto removido'); }} aria-label="Remover projeto">&#10005;</button>
							</div>
							<div class="text-muted text-sm">
								{store.data.actions.filter((a) => a.projectId === proj.id).length} acoes
							</div>
						</div>
					{/each}
				{/if}

			<!-- CALENDAR -->
			{:else if currentPage === 'calendar'}
				<div class="add-bar" style="flex-wrap:wrap; gap:8px">
					<input type="text" placeholder="Compromisso..." bind:value={calText} style="flex:2; min-width:200px" />
					<input type="date" bind:value={calDate} style="flex:1; min-width:140px" />
					<input type="time" bind:value={calTime} style="width:100px; flex-shrink:0" />
					<button class="btn btn-primary" onclick={() => {
						if (!calText.trim() || !calDate) return;
						store.addCalendarItem({ text: calText.trim(), date: calDate, time: calTime });
						calText = ''; calDate = ''; calTime = '';
						saveAndSync(); toast('Agendado!');
					}}>+ Agendar</button>
				</div>

				{#if sortedCalendar.length === 0}
					<div class="empty-state"><p>Nenhum compromisso. Coisas com data/hora ficam aqui.</p></div>
				{:else}
					{#each sortedCalendar as item (item.id)}
						<div class="calendar-item">
							<span class="calendar-date">{formatDate(item.date)}{item.time ? ' ' + item.time : ''}</span>
							<div class="item-text">{item.text}</div>
							<button class="item-btn btn-danger" onclick={() => { store.removeCalendarItem(item.id); saveAndSync(); }} aria-label="Remover">&#10005;</button>
						</div>
					{/each}
				{/if}

			<!-- WAITING -->
			{:else if currentPage === 'waiting'}
				<div class="add-bar">
					<input type="text" placeholder="O que esta aguardando..." bind:value={waitingText} style="flex:2" />
					<input type="text" placeholder="De quem" bind:value={waitingPerson} style="flex:1" />
					<button class="btn btn-primary" onclick={() => {
						if (!waitingText.trim()) return;
						store.addWaitingItem({ text: waitingText.trim(), person: waitingPerson.trim(), delegatedAt: new Date().toISOString() });
						waitingText = ''; waitingPerson = '';
						saveAndSync(); toast('Adicionado!');
					}}>+ Adicionar</button>
				</div>

				{#if store.data.waiting.length === 0}
					<div class="empty-state"><p>Nenhum item aguardando resposta.</p></div>
				{:else}
					{#each store.data.waiting as item (item.id)}
						<div class="item">
							<div class="item-text">
								{item.text}
								{#if item.person}<div class="item-meta">&#128100; {item.person} — {timeAgo(item.delegatedAt)}</div>{/if}
							</div>
							<button class="item-btn btn-danger" onclick={() => { store.removeWaitingItem(item.id); saveAndSync(); }} aria-label="Remover">&#10005;</button>
						</div>
					{/each}
				{/if}

			<!-- SOMEDAY -->
			{:else if currentPage === 'someday'}
				<div class="add-bar">
					<input type="text" placeholder="Algo para fazer algum dia..." bind:value={somedayText}
						onkeydown={(e) => { if (e.key === 'Enter' && somedayText.trim()) { store.addSomedayItem(somedayText.trim()); somedayText = ''; saveAndSync(); toast('Adicionado!'); } }}
					/>
					<button class="btn btn-primary" onclick={() => {
						if (!somedayText.trim()) return;
						store.addSomedayItem(somedayText.trim()); somedayText = '';
						saveAndSync(); toast('Adicionado!');
					}}>+ Adicionar</button>
				</div>

				{#if store.data.someday.length === 0}
					<div class="empty-state"><p>Nenhum item. Coisas que talvez faca algum dia ficam aqui.</p></div>
				{:else}
					{#each store.data.someday as item (item.id)}
						<div class="item">
							<div class="item-text">
								{item.text}
								<div class="item-meta">{timeAgo(item.createdAt)}</div>
							</div>
							<button class="btn btn-sm" onclick={() => {
								store.addInboxItem(item.text);
								store.removeSomedayItem(item.id);
								saveAndSync(); toast('Movido para Inbox!');
							}}>Ativar</button>
							<button class="item-btn btn-danger" onclick={() => { store.removeSomedayItem(item.id); saveAndSync(); }} aria-label="Remover">&#10005;</button>
						</div>
					{/each}
				{/if}

			<!-- REFERENCE -->
			{:else if currentPage === 'reference'}
				<div class="add-bar">
					<input type="text" placeholder="Titulo ou descricao..." bind:value={refText} style="flex:2" />
					<input type="text" placeholder="Tags (ex: trabalho, ideia)" bind:value={refTags} style="flex:1" />
					<button class="btn btn-primary" onclick={() => {
						if (!refText.trim()) return;
						store.addReferenceItem({ text: refText.trim(), tags: refTags.trim() });
						refText = ''; refTags = '';
						saveAndSync(); toast('Salvo!');
					}}>+ Salvar</button>
				</div>

				<div style="margin-bottom:16px">
					<input type="text" placeholder="Filtrar referencia..." bind:value={refSearch} />
				</div>

				{#if filteredReference.length === 0}
					<div class="empty-state"><p>Nenhum item de referencia. Guarde links, notas e contexto aqui.</p></div>
				{:else}
					{#each filteredReference as item (item.id)}
						<div class="item">
							<div class="item-text">
								{item.text}
								{#if item.tags}<div class="item-meta">&#127991; {item.tags}</div>{/if}
								<div class="item-meta">{timeAgo(item.createdAt)}</div>
							</div>
							<button class="item-btn btn-danger" onclick={() => { store.removeReferenceItem(item.id); saveAndSync(); }} aria-label="Remover">&#10005;</button>
						</div>
					{/each}
				{/if}

			<!-- WEEKLY REVIEW -->
			{:else if currentPage === 'review'}
				{@const reviewItems = [
					{ key: 'collect', text: '1. Coletar e processar todas as entradas — Inbox zerado?' },
					{ key: 'empty-head', text: '2. Esvaziar a cabeca — o que ainda esta la?' },
					{ key: 'review-actions', text: '3. Revisar lista Proximas Acoes — atual?' },
					{ key: 'review-agenda', text: '4. Revisar Calendario — passado e futuro' },
					{ key: 'review-waiting', text: '5. Revisar Aguardando — fazer follow-up?' },
					{ key: 'review-projects', text: '6. Revisar Projetos — proxima acao definida pra cada um?' },
					{ key: 'review-someday', text: '7. Revisar lista Algum Dia/Talvez — ativar ou eliminar?' },
				]}

				<p class="text-muted text-sm" style="margin-bottom:20px">
					Revisao Semanal — marque cada item ao concluir
				</p>

				{#each reviewItems as ri}
					<div
						class="review-item"
						class:done={store.data.reviewState[ri.key]}
						onclick={() => {
							store.data.reviewState[ri.key] = !store.data.reviewState[ri.key];
							saveAndSync();
						}}
						role="checkbox"
						aria-checked={store.data.reviewState[ri.key] ?? false}
						tabindex={0}
						onkeydown={(e) => { if (e.key === ' ' || e.key === 'Enter') { store.data.reviewState[ri.key] = !store.data.reviewState[ri.key]; saveAndSync(); } }}
					>
						<span style="font-size:18px">{store.data.reviewState[ri.key] ? '&#10003;' : '&#9675;'}</span>
						<span>{ri.text}</span>
					</div>
				{/each}

				<button class="btn" style="margin-top:16px" onclick={() => {
					store.data.reviewState = {};
					saveAndSync();
					toast('Revisao reiniciada');
				}}>Reiniciar Revisao</button>
			{/if}

		</div>
	</main>
</div>
