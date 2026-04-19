// ==========================================================================
// CONFIGURACAO SUPABASE — Credenciais carregadas de config.js (gitignored).
// Setup local: cp config.example.js config.js && editar com credenciais reais.
// Instrucoes completas: veja DEPLOY.md
// ==========================================================================

const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

// ==========================================================================
// GTD APP - DATA LAYER
// ==========================================================================

const SUPABASE_CONFIGURED = SUPABASE_URL && !SUPABASE_URL.includes('SEU-PROJETO');
let supabaseClient = null;
let currentUser = null;

if (SUPABASE_CONFIGURED && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      lock: async (name, acquireTimeout, fn) => await fn(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: { params: { eventsPerSecond: 0 } }
  });
}

const DEFAULT_CONTEXTS = ['@Escritório','@Casa','@Computador','@Telefone','@Online','@Rua','@Qualquer Lugar'];

function loadData() {
  const d = localStorage.getItem('gtd-data');
  if (d) return JSON.parse(d);
  return {
    inbox: [],
    actions: [],
    projects: [],
    calendar: [],
    waiting: [],
    someday: [],
    reference: [],
    contexts: [...DEFAULT_CONTEXTS],
    reviewState: {},
    completedToday: 0,
    lastDate: new Date().toDateString()
  };
}

function saveData() {
  localStorage.setItem('gtd-data', JSON.stringify(data));
  scheduleCloudSync();
}

let data = loadData();

// Reset daily counter
if (data.lastDate !== new Date().toDateString()) {
  data.completedToday = 0;
  data.lastDate = new Date().toDateString();
  localStorage.setItem('gtd-data', JSON.stringify(data));
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

let undoSnapshot = null;
let undoPage = null;

function saveUndoSnapshot() {
  undoSnapshot = JSON.stringify(data);
  undoPage = document.querySelector('.nav-item.active')?.dataset?.page || 'dashboard';
}

function performUndo() {
  if (!undoSnapshot) return;
  data = JSON.parse(undoSnapshot);
  undoSnapshot = null;
  localStorage.setItem('gtd-data', JSON.stringify(data));
  scheduleCloudSync();
  const page = undoPage || 'dashboard';
  navigateTo(page);
  updateBadges();
  toast('Desfeito!', 'info');
}

function toast(msg, type = 'success', showUndo = false) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  const span = document.createElement('span');
  span.textContent = msg;
  t.appendChild(span);
  if (showUndo && undoSnapshot) {
    const btn = document.createElement('button');
    btn.className = 'undo-btn';
    btn.textContent = 'Desfazer';
    btn.onclick = () => { t.remove(); performUndo(); };
    t.appendChild(btn);
  }
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, showUndo ? 5000 : 2500);
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ==========================================================================
// NAVIGATION
// ==========================================================================

const pageConfig = {
  dashboard:  { icon: '&#9673;', title: 'Dashboard' },
  inbox:      { icon: '&#9993;', title: 'Caixa de Entrada' },
  process:    { icon: '&#9881;', title: 'Processar Inbox' },
  actions:    { icon: '&#9654;', title: 'Próximas Ações' },
  projects:   { icon: '&#9632;', title: 'Projetos' },
  calendar:   { icon: '&#128197;', title: 'Calendário' },
  waiting:    { icon: '&#8987;', title: 'Aguardando' },
  someday:    { icon: '&#9734;', title: 'Algum Dia / Talvez' },
  reference:  { icon: '&#128194;', title: 'Referência' },
  review:     { icon: '&#128270;', title: 'Revisão Semanal' }
};

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  sidebar.classList.toggle('open');
  backdrop.classList.toggle('active', sidebar.classList.contains('open'));
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').classList.remove('active');
}

// FAB menu
function toggleFabMenu() {
  const c = document.getElementById('fab-container');
  const b = document.getElementById('fab-backdrop');
  c.classList.toggle('open');
  b.classList.toggle('open');
}
function closeFabMenu() {
  document.getElementById('fab-container').classList.remove('open');
  document.getElementById('fab-backdrop').classList.remove('open');
}

// Sidebar collapsible groups
function toggleSidebarGroup(el) {
  const group = el.parentElement;
  const items = group.querySelector('.sidebar-group-items');
  const isOpen = group.classList.contains('open');
  group.classList.toggle('open');
  items.style.display = isOpen ? 'none' : 'block';
}

document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', () => {
    navigateTo(item.dataset.page);
    closeSidebar();
  });
});

function navigateTo(page) {
  document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  const cfg = pageConfig[page];
  if (cfg) {
    document.getElementById('page-icon').innerHTML = cfg.icon;
    document.getElementById('page-title').textContent = cfg.title;
  }
  document.getElementById('header-actions').innerHTML = '';
  if (page === 'review') { reviewActive = true; }
  else if (page !== 'review' && !reviewActive) { /* keep reviewActive as is */ }
  renderPage(page);
  updateReviewBackButton();
}

function renderPage(page) {
  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'inbox': renderInbox(); break;
    case 'process': renderProcess(); break;
    case 'actions': renderActions(); break;
    case 'projects': renderProjects(); break;
    case 'calendar': renderCalendar(); break;
    case 'waiting': renderWaiting(); break;
    case 'someday': renderSomeday(); break;
    case 'reference': renderReference(); break;
    case 'review': renderReview(); break;
  }
  updateBadges();
}

function updateBadges() {
  document.getElementById('badge-inbox').textContent = data.inbox.length;
  document.getElementById('badge-actions').textContent = data.actions.filter(a => !a.done).length;
  document.getElementById('badge-projects').textContent = data.projects.filter(p => !p.done).length;
  document.getElementById('badge-waiting').textContent = data.waiting.filter(w => !w.done).length;
  document.getElementById('badge-someday').textContent = data.someday.length;
}

// ==========================================================================
// MODAL
// ==========================================================================

function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ==========================================================================
// INBOX
// ==========================================================================

function addInboxItem() {
  const input = document.getElementById('inbox-input');
  const text = input.value.trim();
  if (!text) return;
  data.inbox.push({ id: genId(), text, createdAt: new Date().toISOString() });
  input.value = '';
  saveData();
  renderInbox();
  updateBadges();
  toast('Capturado!');
}

function renderInbox() {
  const list = document.getElementById('inbox-list');
  if (data.inbox.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#9993;</div><p>Caixa de entrada vazia. Mente limpa!</p></div>';
    return;
  }
  list.innerHTML = data.inbox.map(item => `
    <div class="item" draggable="true" data-id="${item.id}">
      <span class="drag-handle" title="Arrastar para reordenar">&#9776;</span>
      <div class="item-body">
        <div class="item-title">${esc(item.text)}</div>
        <div class="item-meta"><span class="tag tag-date">${timeAgo(item.createdAt)}</span></div>
      </div>
      <div class="item-actions">
        <button class="item-btn" title="Processar" onclick="navigateTo('process')">&#9881;</button>
        <button class="item-btn delete" title="Excluir" onclick="deleteInbox('${item.id}')">&#10005;</button>
      </div>
    </div>
  `).join('');
  initDragDrop(list, 'inbox');
  initSwipeGestures(list, {
    onSwipeLeft: id => { deleteInbox(id); },
    onSwipeRight: id => { navigateTo('process'); }
  });
}

function deleteInbox(id) {
  saveUndoSnapshot();
  data.inbox = data.inbox.filter(i => i.id !== id);
  saveData(); renderInbox(); updateBadges();
  toast('Item excluído!', 'success', true);
}

// ==========================================================================
// PROCESS INBOX (GTD Workflow)
// ==========================================================================

let processStep = 'start';
let processItem = null;
let processActionText = '';
let processProjectId = null;

function renderProcess() {
  const area = document.getElementById('process-area');
  if (data.inbox.length === 0) {
    area.innerHTML = '<div class="empty-state"><div class="empty-icon">&#10003;</div><p>Nada para processar! Sua caixa de entrada está vazia.</p></div>';
    processStep = 'start';
    processItem = null;
    return;
  }
  if (!processItem || !data.inbox.find(i => i.id === processItem.id)) {
    processItem = data.inbox[0];
    processStep = 'actionable';
    processActionText = '';
    processProjectId = null;
  }

  const wizard = document.createElement('div');
  wizard.className = 'wizard';

  const remaining = data.inbox.length;
  const header = `<p class="text-sm text-muted" style="margin-bottom:16px">Restam ${remaining} ite${remaining > 1 ? 'ns' : 'm'} na caixa de entrada</p>`;

  if (processStep === 'actionable') {
    wizard.innerHTML = header + `
      <div class="wizard-step">
        <h3>O que é isso?</h3>
        <div class="wizard-item-title">${esc(processItem.text)}</div>
        <p>Esse item requer alguma ação da sua parte?</p>
        <div class="wizard-buttons">
          <button class="btn btn-primary" onclick="processAnswer('actionable-yes')">Sim, é acionável</button>
          <button class="btn" onclick="processAnswer('actionable-no')">Não é acionável</button>
        </div>
      </div>`;
  }
  else if (processStep === 'not-actionable') {
    wizard.innerHTML = header + `
      <div class="wizard-step">
        <h3>O que fazer com isso?</h3>
        <div class="wizard-item-title">${esc(processItem.text)}</div>
        <p>Escolha o destino para este item:</p>
        <div class="wizard-buttons">
          <button class="btn btn-danger" onclick="processAnswer('trash')">&#128465; Lixo</button>
          <button class="btn" onclick="processAnswer('someday')" style="color:var(--yellow)">&#9734; Algum Dia/Talvez</button>
          <button class="btn" onclick="processAnswer('reference-direct')" style="color:var(--purple)">&#128194; Referência</button>
        </div>
      </div>`;
  }
  else if (processStep === 'define-action') {
    wizard.innerHTML = header + `
      <div class="wizard-step">
        <h3>Qual a Próxima Ação?</h3>
        <div class="wizard-item-title">${esc(processItem.text)}</div>
        <p>Defina a próxima ação <strong>física e visível</strong>. Alguém poderia observar você fazendo isso?</p>
        <div class="wizard-form">
          <div class="form-group">
            <label>Próxima ação concreta:</label>
            <input type="text" id="proc-define-action" value="${esc(processItem.text)}" placeholder="Ex: Ligar para João no 11-9999-0000 pedindo orçamento">
          </div>
          <p class="text-sm text-muted" style="margin-top:8px">
            Ruim: "Resolver situação do carro" <br>
            Bom: "Ligar para oficina e agendar revisão - 11-8888-0000"
          </p>
          <div class="wizard-buttons">
            <button class="btn btn-primary" onclick="processAnswer('save-defined-action')">Continuar</button>
          </div>
        </div>
      </div>`;
  }
  else if (processStep === 'two-minutes') {
    wizard.innerHTML = header + `
      <div class="wizard-step">
        <h3>Regra dos 2 Minutos</h3>
        <div class="wizard-item-title">${esc(processActionText || processItem.text)}</div>
        <p>Essa ação pode ser feita em <strong>menos de 2 minutos</strong>?</p>
        <div class="wizard-buttons">
          <button class="btn btn-green" onclick="processAnswer('do-now')">Sim - Fazer agora!</button>
          <button class="btn" onclick="processAnswer('more-than-2')">Não — Precisa de mais tempo</button>
        </div>
      </div>`;
  }
  else if (processStep === 'do-now') {
    wizard.innerHTML = header + `
      <div class="wizard-step">
        <h3>Faça agora!</h3>
        <div class="wizard-item-title">${esc(processActionText || processItem.text)}</div>
        <p>Execute esta ação agora mesmo (menos de 2 minutos).<br>Clique em "Feito!" quando terminar.</p>
        <div class="wizard-buttons">
          <button class="btn btn-green" onclick="processAnswer('done-now')">&#10003; Feito!</button>
        </div>
      </div>`;
  }
  else if (processStep === 'delegate-or-defer') {
    wizard.innerHTML = header + `
      <div class="wizard-step">
        <h3>Delegar ou Adiar?</h3>
        <div class="wizard-item-title">${esc(processActionText || processItem.text)}</div>
        <p>Você é a melhor pessoa para fazer isso?</p>
        <div class="wizard-buttons">
          <button class="btn" onclick="processAnswer('delegate')" style="color:var(--cyan)">&#8987; Delegar (Aguardando)</button>
          <button class="btn btn-primary" onclick="processAnswer('defer')">&#9654; Adiar (Próxima Ação)</button>
          <button class="btn" onclick="processAnswer('calendar-item')" style="color:var(--orange)">&#128197; Agendar (Calendário)</button>
        </div>
      </div>`;
  }
  else if (processStep === 'defer-form') {
    const ctxOptions = data.contexts.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    const prjOptions = '<option value="">(nenhum)</option>' + data.projects.filter(p=>!p.done).map(p => `<option value="${p.id}"${p.id===processProjectId?' selected':''}>${esc(p.name)}</option>`).join('');
    wizard.innerHTML = header + `
      <div class="wizard-step">
        <h3>Adiar — Configurar Ação</h3>
        <div class="wizard-item-title">${esc(processActionText || processItem.text)}</div>
        <p>Configure os detalhes da próxima ação:</p>
        <div class="wizard-form">
          <div class="form-group">
            <label>Próxima ação (ajuste se necessário):</label>
            <input type="text" id="proc-action" value="${esc(processActionText || processItem.text)}" placeholder="Ex: Ligar para João — 11-9999-0000">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>Contexto:</label>
              <select id="proc-context">${ctxOptions}</select>
            </div>
            <div class="form-group">
              <label>Energia:</label>
              <select id="proc-energy">
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tempo estimado (min):</label>
              <select id="proc-time">
                <option value="5">5 min</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1h+</option>
              </select>
            </div>
            <div class="form-group">
              <label>Projeto:</label>
              <select id="proc-project">${prjOptions}</select>
            </div>
          </div>
          <div class="wizard-buttons">
            <button class="btn btn-primary" onclick="processAnswer('save-action')">&#9654; Salvar Ação</button>
          </div>
        </div>
      </div>`;
  }
  else if (processStep === 'delegate-form') {
    const delPrjOptions = '<option value="">(nenhum)</option>' + data.projects.filter(p=>!p.done).map(p => `<option value="${p.id}"${p.id===processProjectId?' selected':''}>${esc(p.name)}</option>`).join('');
    wizard.innerHTML = header + `
      <div class="wizard-step">
        <h3>Delegar - Aguardando</h3>
        <div class="wizard-item-title">${esc(processActionText || processItem.text)}</div>
        <div class="wizard-form">
          <div class="form-group">
            <label>O que foi delegado:</label>
            <input type="text" id="proc-wf-what" value="${esc(processActionText || processItem.text)}">
          </div>
          <div class="form-group">
            <label>Para quem:</label>
            <input type="text" id="proc-wf-who" placeholder="Nome da pessoa">
          </div>
          <div class="form-group">
            <label>Projeto (opcional):</label>
            <select id="proc-wf-prj">${delPrjOptions}</select>
          </div>
          <div class="wizard-buttons">
            <button class="btn btn-primary" onclick="processAnswer('save-waiting')">&#8987; Salvar em Aguardando</button>
          </div>
        </div>
      </div>`;
  }
  else if (processStep === 'calendar-form') {
    wizard.innerHTML = header + `
      <div class="wizard-step">
        <h3>Agendar no Calendário</h3>
        <div class="wizard-item-title">${esc(processActionText || processItem.text)}</div>
        <div class="wizard-form">
          <div class="form-group">
            <label>Descrição:</label>
            <input type="text" id="proc-cal-text" value="${esc(processActionText || processItem.text)}">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>Data:</label>
              <input type="date" id="proc-cal-date">
            </div>
            <div class="form-group">
              <label>Hora (opcional):</label>
              <input type="time" id="proc-cal-time">
            </div>
          </div>
          <div class="wizard-buttons">
            <button class="btn btn-primary" onclick="processAnswer('save-calendar')">&#128197; Salvar no Calendário</button>
          </div>
        </div>
      </div>`;
  }
  else if (processStep === 'is-project') {
    wizard.innerHTML = header + `
      <div class="wizard-step">
        <h3>Isso é um projeto?</h3>
        <div class="wizard-item-title">${esc(processItem.text)}</div>
        <p>Requer <strong>mais de uma ação</strong> para concluir?</p>
        <div class="wizard-buttons">
          <button class="btn btn-primary" onclick="processAnswer('yes-project')">Sim - Criar projeto</button>
          <button class="btn" onclick="processAnswer('no-project')">Não — Ação única</button>
        </div>
      </div>`;
  }
  else if (processStep === 'reference-form') {
    wizard.innerHTML = header + `
      <div class="wizard-step">
        <h3>Salvar como Referência</h3>
        <div class="wizard-item-title">${esc(processItem.text)}</div>
        <div class="wizard-form">
          <div class="form-group">
            <label>Título:</label>
            <input type="text" id="proc-ref-title" value="${esc(processItem.text)}">
          </div>
          <div class="form-group">
            <label>Notas / Conteúdo:</label>
            <textarea id="proc-ref-notes" placeholder="Informações de referência..."></textarea>
          </div>
          <div class="wizard-buttons">
            <button class="btn btn-primary" onclick="processAnswer('save-reference')">&#128194; Salvar Referência</button>
          </div>
        </div>
      </div>`;
  }

  area.innerHTML = '';
  area.appendChild(wizard);
}

function processAnswer(answer) {
  switch(answer) {
    case 'actionable-yes':
      processStep = 'is-project';
      break;
    case 'actionable-no':
      processStep = 'not-actionable';
      break;
    case 'trash':
      removeFromInbox();
      toast('Descartado!');
      return;
    case 'someday':
      data.someday.push({ id: genId(), text: processItem.text, createdAt: new Date().toISOString() });
      removeFromInbox();
      toast('Movido para Algum Dia/Talvez');
      return;
    case 'reference-direct':
      processStep = 'reference-form';
      break;
    case 'save-reference':
      data.reference.push({
        id: genId(),
        title: document.getElementById('proc-ref-title').value || processItem.text,
        notes: document.getElementById('proc-ref-notes').value,
        createdAt: new Date().toISOString()
      });
      removeFromInbox();
      toast('Salvo em Referência');
      return;
    case 'yes-project': {
      const newProject = { id: genId(), name: processItem.text, done: false, createdAt: new Date().toISOString() };
      data.projects.push(newProject);
      processProjectId = newProject.id;
      processStep = 'define-action';
      toast('Projeto criado! Agora defina a próxima ação.');
      break;
    }
    case 'no-project':
      processStep = 'define-action';
      break;
    case 'save-defined-action':
      processActionText = document.getElementById('proc-define-action').value.trim() || processItem.text;
      processStep = 'two-minutes';
      break;
    case 'do-now':
      processStep = 'do-now';
      break;
    case 'done-now':
      // Record the completed action so it's tracked in the project (if any)
      data.actions.push({
        id: genId(),
        text: processActionText || processItem.text,
        context: '',
        energy: '',
        time: '',
        projectId: processProjectId || null,
        done: true,
        createdAt: new Date().toISOString()
      });
      data.completedToday++;
      recordCompletion();
      removeFromInbox();
      toast('Feito! Próximo item...');
      return;
    case 'more-than-2':
      processStep = 'delegate-or-defer';
      break;
    case 'delegate':
      processStep = 'delegate-form';
      break;
    case 'defer':
      processStep = 'defer-form';
      break;
    case 'calendar-item':
      processStep = 'calendar-form';
      break;
    case 'save-action':
      data.actions.push({
        id: genId(),
        text: document.getElementById('proc-action').value || processItem.text,
        context: document.getElementById('proc-context').value,
        energy: document.getElementById('proc-energy').value,
        time: document.getElementById('proc-time').value,
        projectId: document.getElementById('proc-project').value || null,
        done: false,
        createdAt: new Date().toISOString()
      });
      removeFromInbox();
      toast('Próxima ação criada!');
      return;
    case 'save-waiting': {
      const wfPrjEl = document.getElementById('proc-wf-prj');
      data.waiting.push({
        id: genId(),
        text: document.getElementById('proc-wf-what').value || processItem.text,
        person: document.getElementById('proc-wf-who').value,
        projectId: (wfPrjEl ? wfPrjEl.value : null) || processProjectId || null,
        delegatedAt: new Date().toISOString().split('T')[0],
        done: false,
        createdAt: new Date().toISOString()
      });
      removeFromInbox();
      toast('Adicionado em Aguardando!');
      return;
    }
    case 'save-calendar':
      if (!document.getElementById('proc-cal-date').value) { toast('Informe a data!', 'info'); return; }
      data.calendar.push({
        id: genId(),
        text: document.getElementById('proc-cal-text').value || processItem.text,
        date: document.getElementById('proc-cal-date').value,
        time: document.getElementById('proc-cal-time').value || null,
        projectId: processProjectId || null,
        createdAt: new Date().toISOString()
      });
      removeFromInbox();
      toast('Adicionado ao Calendário!');
      return;
  }
  saveData();
  renderProcess();
}

function removeFromInbox() {
  saveUndoSnapshot();
  data.inbox = data.inbox.filter(i => i.id !== processItem.id);
  processItem = null;
  processStep = 'start';
  processActionText = '';
  processProjectId = null;
  saveData();
  renderProcess();
  updateBadges();
}

// ==========================================================================
// NEXT ACTIONS
// ==========================================================================

function renderActions() {
  const list = document.getElementById('actions-list');
  const fCtx = document.getElementById('filter-context').value;
  const fEnergy = document.getElementById('filter-energy').value;
  const fTime = document.getElementById('filter-time').value;

  // Update context filter options
  const ctxSelect = document.getElementById('filter-context');
  const currentVal = ctxSelect.value;
  const usedContexts = [...new Set(data.actions.filter(a => !a.done).map(a => a.context))];
  ctxSelect.innerHTML = '<option value="">Todos</option>' + usedContexts.map(c => `<option value="${esc(c)}" ${c===currentVal?'selected':''}>${esc(c)}</option>`).join('');

  let actions = data.actions.filter(a => !a.done);
  if (fCtx) actions = actions.filter(a => a.context === fCtx);
  if (fEnergy) actions = actions.filter(a => a.energy === fEnergy);
  if (fTime) actions = actions.filter(a => parseInt(a.time) <= parseInt(fTime));

  if (actions.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#9654;</div><p>Nenhuma próxima ação. Processe sua caixa de entrada!</p></div>';
    return;
  }

  // Group by context
  const groups = {};
  actions.forEach(a => {
    const ctx = a.context || '@Sem Contexto';
    if (!groups[ctx]) groups[ctx] = [];
    groups[ctx].push(a);
  });

  list.innerHTML = Object.entries(groups).map(([ctx, items]) => `
    <div class="context-group">
      <div class="context-group-header">
        <h3>${esc(ctx)}</h3>
        <span class="count">${items.length} ite${items.length > 1 ? 'ns' : 'm'}</span>
      </div>
      ${items.map(a => renderActionItem(a)).join('')}
    </div>
  `).join('');
  initDragDrop(list, 'actions');
  initSwipeGestures(list, {
    onSwipeRight: id => { toggleAction(id); },
    onSwipeLeft: id => { deleteAction(id); }
  });
}

function renderActionItem(a) {
  const project = a.projectId ? data.projects.find(p => p.id === a.projectId) : null;
  return `
    <div class="item" draggable="true" data-id="${a.id}">
      <span class="drag-handle" title="Arrastar para reordenar">&#9776;</span>
      <div class="item-check ${a.done ? 'checked' : ''}" onclick="toggleAction('${a.id}')"></div>
      <div class="item-body">
        <div class="item-title ${a.done ? 'done' : ''}">${esc(a.text)}</div>
        <div class="item-meta">
          ${a.energy ? `<span class="tag tag-energy-${a.energy}">${a.energy}</span>` : ''}
          ${a.time ? `<span class="tag tag-date">${a.time} min</span>` : ''}
          ${project ? `<span class="tag tag-project">${esc(project.name)}</span>` : ''}
        </div>
      </div>
      <div class="item-actions">
        <button class="item-btn" title="Editar" onclick="editAction('${a.id}')">&#9998;</button>
        <button class="item-btn delete" title="Excluir" onclick="deleteAction('${a.id}')">&#10005;</button>
      </div>
    </div>`;
}

function toggleAction(id) {
  const a = data.actions.find(x => x.id === id);
  if (a) {
    saveUndoSnapshot();
    a.done = !a.done;
    if (a.done) {
      data.completedToday++;
      recordCompletion();
      toast('Ação concluída!', 'success', true);
    } else {
      data.completedToday = Math.max(0, data.completedToday - 1);
    }
    saveData(); renderActions(); updateBadges();
  }
}

function deleteAction(id) {
  saveUndoSnapshot();
  data.actions = data.actions.filter(a => a.id !== id);
  saveData(); renderActions(); updateBadges();
  toast('Ação excluída!', 'success', true);
}

function showAddActionModal() {
  const text = document.getElementById('action-input').value;
  const ctxOptions = data.contexts.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const prjOptions = '<option value="">(nenhum)</option>' + data.projects.filter(p=>!p.done).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  openModal(`
    <h3>Nova Próxima Ação</h3>
    <div class="form-group"><label>Ação (física e visível):</label><input type="text" id="modal-action-text" value="${esc(text)}" placeholder="Ex: Enviar email para..."></div>
    <div class="form-group"><label>Contexto:</label><select id="modal-action-ctx">${ctxOptions}</select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label>Energia:</label><select id="modal-action-energy"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></div>
      <div class="form-group"><label>Tempo:</label><select id="modal-action-time"><option value="5">5 min</option><option value="15">15 min</option><option value="30">30 min</option><option value="60">1h+</option></select></div>
    </div>
    <div class="form-group"><label>Projeto:</label><select id="modal-action-prj">${prjOptions}</select></div>
    <div class="modal-buttons">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveNewAction()">Salvar</button>
    </div>
  `);
}

function saveNewAction() {
  const text = document.getElementById('modal-action-text').value.trim();
  if (!text) return;
  data.actions.push({
    id: genId(),
    text,
    context: document.getElementById('modal-action-ctx').value,
    energy: document.getElementById('modal-action-energy').value,
    time: document.getElementById('modal-action-time').value,
    projectId: document.getElementById('modal-action-prj').value || null,
    done: false,
    createdAt: new Date().toISOString()
  });
  document.getElementById('action-input').value = '';
  saveData(); closeModal(); renderActions(); updateBadges();
  toast('Próxima ação criada!');
}

function editAction(id) {
  const a = data.actions.find(x => x.id === id);
  if (!a) return;
  const ctxOptions = data.contexts.map(c => `<option value="${esc(c)}" ${c===a.context?'selected':''}>${esc(c)}</option>`).join('');
  const prjOptions = '<option value="">(nenhum)</option>' + data.projects.filter(p=>!p.done).map(p => `<option value="${p.id}" ${p.id===a.projectId?'selected':''}>${esc(p.name)}</option>`).join('');
  openModal(`
    <h3>Editar Ação</h3>
    <div class="form-group"><label>Ação:</label><input type="text" id="modal-edit-text" value="${esc(a.text)}"></div>
    <div class="form-group"><label>Contexto:</label><select id="modal-edit-ctx">${ctxOptions}</select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label>Energia:</label><select id="modal-edit-energy"><option value="baixa" ${a.energy==='baixa'?'selected':''}>Baixa</option><option value="media" ${a.energy==='media'?'selected':''}>Média</option><option value="alta" ${a.energy==='alta'?'selected':''}>Alta</option></select></div>
      <div class="form-group"><label>Tempo:</label><select id="modal-edit-time"><option value="5" ${a.time==='5'?'selected':''}>5 min</option><option value="15" ${a.time==='15'?'selected':''}>15 min</option><option value="30" ${a.time==='30'?'selected':''}>30 min</option><option value="60" ${a.time==='60'?'selected':''}>1h+</option></select></div>
    </div>
    <div class="form-group"><label>Projeto:</label><select id="modal-edit-prj">${prjOptions}</select></div>
    <div class="modal-buttons">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="updateAction('${id}')">Salvar</button>
    </div>
  `);
}

function updateAction(id) {
  const a = data.actions.find(x => x.id === id);
  if (!a) return;
  a.text = document.getElementById('modal-edit-text').value.trim();
  a.context = document.getElementById('modal-edit-ctx').value;
  a.energy = document.getElementById('modal-edit-energy').value;
  a.time = document.getElementById('modal-edit-time').value;
  a.projectId = document.getElementById('modal-edit-prj').value || null;
  saveData(); closeModal(); renderActions();
  toast('Ação atualizada!');
}

// ==========================================================================
// PROJECTS
// ==========================================================================

function addProject() {
  const input = document.getElementById('project-input');
  const name = input.value.trim();
  if (!name) return;
  data.projects.push({ id: genId(), name, done: false, createdAt: new Date().toISOString() });
  input.value = '';
  saveData(); renderProjects(); updateBadges();
  toast('Projeto criado!');
}

function renderProjects() {
  const list = document.getElementById('projects-list');
  const active = data.projects.filter(p => !p.done);
  const completed = data.projects.filter(p => p.done);

  if (data.projects.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#9632;</div><p>Nenhum projeto. Projetos são resultados que exigem mais de 1 ação.</p></div>';
    return;
  }

  list.innerHTML = active.map(p => {
    const actions = data.actions.filter(a => a.projectId === p.id);
    const done = actions.filter(a => a.done).length;
    const total = actions.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const nextAction = actions.find(a => !a.done);
    const waitingItems = data.waiting.filter(w => w.projectId === p.id && !w.done);
    const hasNextOrWaiting = nextAction || waitingItems.length > 0;
    return `
      <div class="card" style="cursor:pointer" onclick="openProjectDetail('${p.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:15px;font-weight:600">${esc(p.name)}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
              ${total} ${total !== 1 ? 'ações' : 'ação'} ${total > 0 ? `(${done}/${total} concluídas)` : ''}
              ${waitingItems.length > 0 ? ` | ${waitingItems.length} aguardando` : ''}
              ${!hasNextOrWaiting && total > 0 ? '<span style="color:var(--red)"> - SEM PRÓXIMA AÇÃO!</span>' : ''}
              ${!hasNextOrWaiting && total === 0 ? '<span style="color:var(--yellow)"> - Defina a próxima ação</span>' : ''}
            </div>
            ${nextAction ? `<div style="font-size:12px;color:var(--green);margin-top:2px">Próxima: ${esc(nextAction.text)}</div>` : ''}
            ${!nextAction && waitingItems.length > 0 ? `<div style="font-size:12px;color:var(--cyan);margin-top:2px">Aguardando: ${esc(waitingItems[0].text)}${waitingItems[0].person ? ' (' + esc(waitingItems[0].person) + ')' : ''}</div>` : ''}
          </div>
          <div style="display:flex;gap:4px" onclick="event.stopPropagation()">
            <button class="btn btn-sm" onclick="addActionToProject('${p.id}')">+ Ação</button>
            <button class="btn btn-sm btn-green" onclick="completeProject('${p.id}')">&#10003;</button>
            <button class="btn btn-sm btn-danger" onclick="deleteProject('${p.id}')">&#10005;</button>
          </div>
        </div>
        ${total > 0 ? `<div class="project-bar"><div class="project-bar-fill" style="width:${pct}%"></div></div>` : ''}
      </div>`;
  }).join('');

  if (completed.length > 0) {
    list.innerHTML += `<hr class="divider"><div class="section-title">Concluídos</div>` +
      completed.map(p => `
        <div class="card" style="opacity:0.5">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="text-decoration:line-through">${esc(p.name)}</div>
            <div style="display:flex;gap:4px">
              <button class="btn btn-sm" onclick="reactivateProject('${p.id}')" title="Reativar">&#8634;</button>
              <button class="btn btn-sm btn-danger" onclick="deleteProject('${p.id}')">&#10005;</button>
            </div>
          </div>
        </div>`).join('');
  }
}

function completeProject(id) {
  const p = data.projects.find(x => x.id === id);
  if (!p) return;
  saveUndoSnapshot();
  const pendingActions = data.actions.filter(a => a.projectId === id && !a.done).length;
  const pendingWaiting = data.waiting.filter(w => w.projectId === id && !w.done).length;
  if (pendingActions > 0 || pendingWaiting > 0) {
    const msgs = [];
    if (pendingActions) msgs.push(pendingActions + ' ação(ões) pendente(s)');
    if (pendingWaiting) msgs.push(pendingWaiting + ' item(ns) aguardando');
    if (!confirm(`Este projeto ainda tem ${msgs.join(' e ')}. Concluir mesmo assim?`)) return;
    // Mark pending actions as done and count them
    const pendingActionsList = data.actions.filter(a => a.projectId === id && !a.done);
    pendingActionsList.forEach(a => a.done = true);
    data.completedToday += pendingActionsList.length;
    data.waiting.filter(w => w.projectId === id && !w.done).forEach(w => w.done = true);
  }
  p.done = true;
  saveData(); renderProjects(); renderActions(); updateBadges();
  toast('Projeto concluído!', 'success', true);
}

function deleteProject(id) {
  const hasActions = data.actions.some(a => a.projectId === id);
  const hasWaiting = data.waiting.some(w => w.projectId === id);
  if (hasActions || hasWaiting) {
    if (!confirm('Este projeto tem ações/itens vinculados. Excluir tudo?')) return;
  }
  saveUndoSnapshot();
  // Remove orphaned actions and waiting items
  data.actions = data.actions.filter(a => a.projectId !== id);
  data.waiting = data.waiting.filter(w => w.projectId !== id);
  data.projects = data.projects.filter(p => p.id !== id);
  saveData(); renderProjects(); renderActions(); renderWaiting(); updateBadges();
}

function reactivateProject(id) {
  const p = data.projects.find(x => x.id === id);
  if (p) { p.done = false; saveData(); renderProjects(); updateBadges(); toast('Projeto reativado!'); }
}

function addActionToProject(projectId) {
  const ctxOptions = data.contexts.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  openModal(`
    <h3>Nova Ação para o Projeto</h3>
    <div class="form-group"><label>Próxima ação (física e visível):</label><input type="text" id="modal-pa-text" placeholder="Ex: Pesquisar precos no site..."></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label>Contexto:</label><select id="modal-pa-ctx">${ctxOptions}</select></div>
      <div class="form-group"><label>Energia:</label><select id="modal-pa-energy"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></div>
    </div>
    <div class="form-group"><label>Tempo:</label><select id="modal-pa-time"><option value="5">5 min</option><option value="15">15 min</option><option value="30">30 min</option><option value="60">1h+</option></select></div>
    <div class="modal-buttons">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveProjectAction('${projectId}')">Salvar</button>
    </div>
  `);
}

function saveProjectAction(projectId) {
  const text = document.getElementById('modal-pa-text').value.trim();
  if (!text) return;
  data.actions.push({
    id: genId(), text,
    context: document.getElementById('modal-pa-ctx').value,
    energy: document.getElementById('modal-pa-energy').value,
    time: document.getElementById('modal-pa-time').value,
    projectId, done: false,
    createdAt: new Date().toISOString()
  });
  saveData(); closeModal(); renderProjects(); updateBadges();
  toast('Ação adicionada ao projeto!');
}

// ==========================================================================
// PROJECT DETAIL VIEW
// ==========================================================================

function openProjectDetail(id) {
  const p = data.projects.find(x => x.id === id);
  if (!p) return;
  const actions = data.actions.filter(a => a.projectId === id);
  const pendingActions = actions.filter(a => !a.done);
  const doneActions = actions.filter(a => a.done);
  const waitingItems = data.waiting.filter(w => w.projectId === id && !w.done);
  const total = actions.length;
  const done = doneActions.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  let html = `
    <h3 style="margin-bottom:8px">${esc(p.name)}</h3>
    ${total > 0 ? `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${pct===100?'var(--green)':'var(--accent)'};border-radius:3px"></div>
        </div>
        <span style="font-size:12px;color:var(--text-muted)">${done}/${total} (${pct}%)</span>
      </div>
    ` : ''}`;

  // Pending actions
  if (pendingActions.length > 0) {
    html += `<div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Próximas Ações</div>`;
    pendingActions.forEach(a => {
      html += `
        <div class="item" style="margin-bottom:6px">
          <div class="item-check" onclick="toggleAction('${a.id}');openProjectDetail('${id}')"></div>
          <div class="item-body">
            <div class="item-title">${esc(a.text)}</div>
            <div class="item-meta">
              ${a.context ? `<span class="tag tag-context">${esc(a.context)}</span>` : ''}
              ${a.energy ? `<span class="tag tag-energy-${a.energy}">${a.energy}</span>` : ''}
              ${a.time ? `<span class="tag tag-date">${a.time} min</span>` : ''}
            </div>
          </div>
          <div class="item-actions" style="opacity:1">
            <button class="item-btn delete" onclick="deleteAction('${a.id}');openProjectDetail('${id}')">&#10005;</button>
          </div>
        </div>`;
    });
  }

  // Waiting items
  if (waitingItems.length > 0) {
    html += `<div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin:12px 0 6px">Aguardando</div>`;
    waitingItems.forEach(w => {
      html += `
        <div class="item" style="margin-bottom:6px">
          <div class="item-check" onclick="toggleWaiting('${w.id}');openProjectDetail('${id}')"></div>
          <div class="item-body">
            <div class="item-title">${esc(w.text)}</div>
            <div class="item-meta">
              ${w.person ? `<span class="tag tag-person">${esc(w.person)}</span>` : ''}
              <span class="tag tag-date">Delegado: ${formatDate(w.delegatedAt)}</span>
            </div>
          </div>
        </div>`;
    });
  }

  // Done actions (collapsed)
  if (doneActions.length > 0) {
    html += `<div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin:12px 0 6px">Concluidas (${doneActions.length})</div>`;
    doneActions.forEach(a => {
      html += `
        <div class="item" style="margin-bottom:4px;opacity:0.5">
          <div class="item-check checked" onclick="toggleAction('${a.id}');openProjectDetail('${id}')"></div>
          <div class="item-body"><div class="item-title done">${esc(a.text)}</div></div>
        </div>`;
    });
  }

  // Empty state
  if (pendingActions.length === 0 && waitingItems.length === 0 && doneActions.length === 0) {
    html += `<div class="empty-state" style="padding:20px"><p class="text-muted text-sm">Nenhuma ação vinculada. Adicione a primeira ação!</p></div>`;
  }

  // Action buttons
  html += `
    <div style="display:flex;gap:8px;margin-top:16px;border-top:1px solid var(--border);padding-top:16px">
      <button class="btn btn-primary btn-sm" onclick="closeModal();addActionToProject('${id}')">+ Nova Ação</button>
      <button class="btn btn-sm" onclick="closeModal();addWaitingToProject('${id}')">+ Aguardando</button>
      <button class="btn btn-sm" style="margin-left:auto" onclick="closeModal()">Fechar</button>
    </div>`;

  openModal(html);
}

function addWaitingToProject(projectId) {
  const p = data.projects.find(x => x.id === projectId);
  openModal(`
    <h3>Aguardando - ${esc(p?.name || '')}</h3>
    <div class="form-group"><label>O que está aguardando:</label><input type="text" id="modal-pwf-what" placeholder="Ex: Orçamento do fornecedor"></div>
    <div class="form-group"><label>De quem:</label><input type="text" id="modal-pwf-who" placeholder="Nome da pessoa"></div>
    <div class="modal-buttons">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveProjectWaiting('${projectId}')">Salvar</button>
    </div>
  `);
}

function saveProjectWaiting(projectId) {
  const text = document.getElementById('modal-pwf-what').value.trim();
  if (!text) return;
  data.waiting.push({
    id: genId(), text,
    person: document.getElementById('modal-pwf-who').value,
    projectId,
    delegatedAt: new Date().toISOString().split('T')[0],
    done: false,
    createdAt: new Date().toISOString()
  });
  saveData(); closeModal(); renderProjects(); updateBadges();
  toast('Adicionado em Aguardando!');
}

// ==========================================================================
// CALENDAR
// ==========================================================================

function addCalendarItem() {
  const text = document.getElementById('cal-input').value.trim();
  const date = document.getElementById('cal-date').value;
  if (!text || !date) { toast('Preencha descrição e data', 'info'); return; }
  data.calendar.push({
    id: genId(), text, date,
    time: document.getElementById('cal-time').value || null,
    createdAt: new Date().toISOString()
  });
  document.getElementById('cal-input').value = '';
  document.getElementById('cal-date').value = '';
  document.getElementById('cal-time').value = '';
  saveData(); renderCalendar();
  toast('Adicionado ao calendário!');
}

function renderCalendar() {
  const list = document.getElementById('calendar-list');
  const items = [...data.calendar].sort((a, b) => {
    const da = a.date + (a.time || '99:99');
    const db = b.date + (b.time || '99:99');
    return da.localeCompare(db);
  });

  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128197;</div><p>Calendário vazio. Somente itens com data/hora específica.</p></div>';
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const groups = {};
  items.forEach(i => {
    const label = i.date === today ? 'Hoje' : i.date < today ? 'Atrasado' : formatDate(i.date);
    if (!groups[label]) groups[label] = [];
    groups[label].push(i);
  });

  list.innerHTML = Object.entries(groups).map(([label, items]) => `
    <div class="context-group">
      <div class="context-group-header">
        <h3 style="${label === 'Atrasado' ? 'color:var(--red)' : ''}">${label}</h3>
      </div>
      ${items.map(i => `
        <div class="item">
          <div class="item-body">
            <div class="item-title">${esc(i.text)}</div>
            <div class="item-meta">
              <span class="tag tag-date">${formatDate(i.date)}${i.time ? ' ' + i.time : ''}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="item-btn delete" onclick="deleteCalendar('${i.id}')">&#10005;</button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function deleteCalendar(id) {
  saveUndoSnapshot();
  data.calendar = data.calendar.filter(i => i.id !== id);
  saveData(); renderCalendar();
  toast('Item excluído!', 'success', true);
}

// ==========================================================================
// WAITING FOR
// ==========================================================================

function showAddWaitingModal() {
  const prjOptions = '<option value="">(nenhum)</option>' + data.projects.filter(p=>!p.done).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  openModal(`
    <h3>Novo Item - Aguardando</h3>
    <div class="form-group"><label>O que está aguardando:</label><input type="text" id="modal-wf-what" placeholder="Ex: Orçamento do fornecedor"></div>
    <div class="form-group"><label>De quem:</label><input type="text" id="modal-wf-who" placeholder="Nome da pessoa"></div>
    <div class="form-group"><label>Data de solicitação:</label><input type="date" id="modal-wf-date" value="${new Date().toISOString().split('T')[0]}"></div>
    <div class="form-group"><label>Projeto (opcional):</label><select id="modal-wf-prj">${prjOptions}</select></div>
    <div class="modal-buttons">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveWaiting()">Salvar</button>
    </div>
  `);
}

function saveWaiting() {
  const text = document.getElementById('modal-wf-what').value.trim();
  if (!text) return;
  data.waiting.push({
    id: genId(), text,
    person: document.getElementById('modal-wf-who').value,
    projectId: document.getElementById('modal-wf-prj').value || null,
    delegatedAt: document.getElementById('modal-wf-date').value || new Date().toISOString().split('T')[0],
    done: false,
    createdAt: new Date().toISOString()
  });
  saveData(); closeModal(); renderWaiting(); updateBadges();
  toast('Adicionado em Aguardando!');
}

function renderWaiting() {
  const list = document.getElementById('waiting-list');
  const items = data.waiting.filter(w => !w.done);
  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#8987;</div><p>Nada aguardando. Tudo sob controle!</p></div>';
    return;
  }
  list.innerHTML = items.map(w => {
    const project = w.projectId ? data.projects.find(p => p.id === w.projectId) : null;
    return `
    <div class="item">
      <div class="item-check ${w.done?'checked':''}" onclick="toggleWaiting('${w.id}')"></div>
      <div class="item-body">
        <div class="item-title">${esc(w.text)}</div>
        <div class="item-meta">
          ${w.person ? `<span class="tag tag-person">${esc(w.person)}</span>` : ''}
          <span class="tag tag-date">Delegado: ${formatDate(w.delegatedAt)}</span>
          ${project ? `<span class="tag tag-project">${esc(project.name)}</span>` : ''}
        </div>
      </div>
      <div class="item-actions">
        <button class="item-btn delete" onclick="deleteWaiting('${w.id}')">&#10005;</button>
      </div>
    </div>`;
  }).join('');
}

function toggleWaiting(id) {
  const w = data.waiting.find(x => x.id === id);
  if (w) { saveUndoSnapshot(); w.done = true; saveData(); renderWaiting(); updateBadges(); toast('Recebido!', 'success', true); }
}

function deleteWaiting(id) {
  saveUndoSnapshot();
  data.waiting = data.waiting.filter(w => w.id !== id);
  saveData(); renderWaiting(); updateBadges();
  toast('Item excluído!', 'success', true);
}

// ==========================================================================
// SOMEDAY / MAYBE
// ==========================================================================

function addSomedayItem() {
  const input = document.getElementById('someday-input');
  const text = input.value.trim();
  if (!text) return;
  data.someday.push({ id: genId(), text, createdAt: new Date().toISOString() });
  input.value = '';
  saveData(); renderSomeday(); updateBadges();
  toast('Adicionado em Algum Dia/Talvez');
}

function renderSomeday() {
  const list = document.getElementById('someday-list');
  if (data.someday.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#9734;</div><p>Lista vazia. Sonhos e ideias para o futuro vao aqui.</p></div>';
    return;
  }
  list.innerHTML = data.someday.map(s => `
    <div class="item">
      <div class="item-body">
        <div class="item-title">${esc(s.text)}</div>
        <div class="item-meta"><span class="tag tag-date">${timeAgo(s.createdAt)}</span></div>
      </div>
      <div class="item-actions">
        <button class="item-btn btn-green" title="Ativar como Projeto" onclick="activateSomeday('${s.id}')">&#9654;</button>
        <button class="item-btn" title="Mover para Inbox" onclick="somedayToInbox('${s.id}')">&#9993;</button>
        <button class="item-btn delete" onclick="deleteSomeday('${s.id}')">&#10005;</button>
      </div>
    </div>
  `).join('');
}

function activateSomeday(id) {
  const s = data.someday.find(x => x.id === id);
  if (s) {
    data.projects.push({ id: genId(), name: s.text, done: false, createdAt: new Date().toISOString() });
    data.someday = data.someday.filter(x => x.id !== id);
    saveData(); renderSomeday(); updateBadges();
    toast('Ativado como projeto!');
  }
}

function somedayToInbox(id) {
  const s = data.someday.find(x => x.id === id);
  if (s) {
    data.inbox.push({ id: genId(), text: s.text, createdAt: new Date().toISOString() });
    data.someday = data.someday.filter(x => x.id !== id);
    saveData(); renderSomeday(); updateBadges();
    toast('Movido para Caixa de Entrada');
  }
}

function deleteSomeday(id) {
  saveUndoSnapshot();
  data.someday = data.someday.filter(s => s.id !== id);
  saveData(); renderSomeday(); updateBadges();
  toast('Item excluído!', 'success', true);
}

// ==========================================================================
// REFERENCE
// ==========================================================================

function showAddReferenceModal() {
  openModal(`
    <h3>Nova Referência</h3>
    <div class="form-group"><label>Título:</label><input type="text" id="modal-ref-title" placeholder="Título da referência"></div>
    <div class="form-group"><label>Notas / Conteúdo:</label><textarea id="modal-ref-notes" placeholder="Informações de referência..." rows="5"></textarea></div>
    <div class="modal-buttons">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveReference()">Salvar</button>
    </div>
  `);
}

function saveReference() {
  const title = document.getElementById('modal-ref-title').value.trim();
  if (!title) return;
  data.reference.push({
    id: genId(), title,
    notes: document.getElementById('modal-ref-notes').value,
    createdAt: new Date().toISOString()
  });
  saveData(); closeModal(); renderReference();
  toast('Referência salva!');
}

function renderReference() {
  const list = document.getElementById('reference-list');
  const search = (document.getElementById('ref-search')?.value || '').toLowerCase();
  let items = data.reference;
  if (search) {
    items = items.filter(r => r.title.toLowerCase().includes(search) || (r.notes||'').toLowerCase().includes(search));
  }
  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128194;</div><p>Nenhuma referência salva.</p></div>';
    return;
  }
  list.innerHTML = items.map(r => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-weight:600">${esc(r.title)}</div>
          ${r.notes ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:6px;white-space:pre-wrap">${esc(r.notes)}</div>` : ''}
          <div style="font-size:11px;color:var(--text-muted);margin-top:6px">${timeAgo(r.createdAt)}</div>
        </div>
        <button class="btn btn-sm btn-danger" onclick="deleteReference('${r.id}')">&#10005;</button>
      </div>
    </div>
  `).join('');
}

function deleteReference(id) {
  saveUndoSnapshot();
  data.reference = data.reference.filter(r => r.id !== id);
  saveData(); renderReference();
  toast('Referência excluída!', 'success', true);
}

// ==========================================================================
// WEEKLY REVIEW
// ==========================================================================

const reviewSteps = [
  { phase: 'Ficar Limpo (Get Clear)', items: [
    { text: 'Coletar papéis e materiais soltos', page: 'inbox' },
    { text: 'Processar todas as anotações (cadernos, apps, post-its)', page: 'inbox' },
    { text: 'Esvaziar caixa de entrada do e-mail', page: 'inbox' },
    { text: 'Esvaziar a cabeça — capturar pensamentos pendentes', page: 'inbox' }
  ]},
  { phase: 'Ficar Atualizado (Get Current)', items: [
    { text: 'Revisar lista de Próximas Ações — riscar feitas', page: 'actions' },
    { text: 'Revisar calendário passado — ações pendentes?', page: 'calendar' },
    { text: 'Revisar calendário futuro (2 semanas) — preparação?', page: 'calendar' },
    { text: 'Revisar lista de Aguardando — fazer follow-up?', page: 'waiting' },
    { text: 'Revisar lista de Projetos — cada um tem próxima ação?', page: 'projects' }
  ]},
  { phase: 'Ficar Criativo (Get Creative)', items: [
    { text: 'Revisar lista Algum Dia/Talvez — ativar ou eliminar?', page: 'someday' },
    { text: 'Ser criativo e corajoso — novas ideias, projetos, metas?', page: null }
  ]}
];

let reviewActive = false;

function renderReview() {
  const container = document.getElementById('review-list');
  const state = data.reviewState || {};
  let totalSteps = 0;
  let doneSteps = 0;

  reviewActive = true;
  updateReviewBackButton();

  let html = '';
  reviewSteps.forEach((phase, pi) => {
    html += `<div class="review-phase"><h3>${phase.phase}</h3>`;
    phase.items.forEach((item, ii) => {
      const key = `${pi}-${ii}`;
      const done = state[key] || false;
      totalSteps++;
      if (done) doneSteps++;
      html += `
        <div class="review-item ${done ? 'done' : ''}" onclick="toggleReviewItem('${key}')">
          <div class="review-check"></div>
          <span>${item.text}</span>
          ${item.page ? `<span class="review-navigate" onclick="event.stopPropagation();reviewNavigateTo('${item.page}')">Abrir &#8594;</span>` : ''}
        </div>`;
    });
    html += '</div>';
  });
  container.innerHTML = html;

  const pct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
  document.getElementById('review-progress').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
      <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${pct===100?'var(--green)':'var(--accent)'};border-radius:4px;transition:width 0.4s"></div>
      </div>
      <span style="font-size:13px;font-weight:600;color:${pct===100?'var(--green)':'var(--text-secondary)'}">${pct}%</span>
    </div>
    ${pct === 100 ? '<p style="color:var(--green);font-size:13px;margin-top:8px;font-weight:600">Revisão Semanal completa! Parabéns!</p>' : ''}
  `;
}

function toggleReviewItem(key) {
  if (!data.reviewState) data.reviewState = {};
  data.reviewState[key] = !data.reviewState[key];
  saveData(); renderReview();
}

function resetReview() {
  data.reviewState = {};
  saveData(); renderReview();
  toast('Revisão reiniciada!');
}

function reviewNavigateTo(page) {
  reviewActive = true;
  navigateTo(page);
  updateReviewBackButton();
}

function updateReviewBackButton() {
  const btn = document.getElementById('review-back-btn');
  if (!btn) return;
  const currentPage = document.querySelector('.nav-item.active')?.dataset?.page;
  if (reviewActive && currentPage !== 'review') {
    btn.classList.add('visible');
  } else {
    btn.classList.remove('visible');
  }
}

function reviewCapture() {
  const input = document.getElementById('review-capture-input');
  const text = input.value.trim();
  if (!text) return;
  data.inbox.push({ id: genId(), text, createdAt: new Date().toISOString() });
  input.value = '';
  saveData(); updateBadges();
  toast('Capturado na Caixa de Entrada!');
}

// ==========================================================================
// DASHBOARD
// ==========================================================================

function renderDashboard() {
  const stats = document.getElementById('dashboard-stats');
  const inbox = data.inbox.length;
  const actions = data.actions.filter(a => !a.done).length;
  const projects = data.projects.filter(p => !p.done).length;
  const waiting = data.waiting.filter(w => !w.done).length;
  const someday = data.someday.length;
  const completed = data.completedToday || 0;

  // Projects without next action (considers waiting-for items as having activity)
  const projectsNoAction = data.projects.filter(p => !p.done
    && !data.actions.find(a => a.projectId === p.id && !a.done)
    && !data.waiting.find(w => w.projectId === p.id && !w.done)
  ).length;

  stats.innerHTML = `
    <div class="stat-card stat-accent"><div class="stat-number">${inbox}</div><div class="stat-label">Caixa de Entrada</div></div>
    <div class="stat-card stat-green"><div class="stat-number">${actions}</div><div class="stat-label">Próximas Ações</div></div>
    <div class="stat-card stat-purple"><div class="stat-number">${projects}</div><div class="stat-label">Projetos Ativos</div></div>
    <div class="stat-card stat-cyan"><div class="stat-number">${waiting}</div><div class="stat-label">Aguardando</div></div>
    <div class="stat-card stat-yellow"><div class="stat-number">${someday}</div><div class="stat-label">Algum Dia</div></div>
    <div class="stat-card stat-green"><div class="stat-number">${completed}</div><div class="stat-label">Feitas Hoje</div></div>
  `;

  // Alerts
  const alerts = [];
  if (inbox > 0) alerts.push(`<div class="item" style="cursor:pointer" onclick="navigateTo('inbox')"><div class="item-body"><div class="item-title" style="color:var(--accent)">&#9993; ${inbox} ite${inbox>1?'ns':'m'} na Caixa de Entrada para processar</div></div></div>`);
  if (projectsNoAction > 0) alerts.push(`<div class="item" style="cursor:pointer" onclick="navigateTo('projects')"><div class="item-body"><div class="item-title" style="color:var(--red)">&#9888; ${projectsNoAction} projeto${projectsNoAction>1?'s':''} sem próxima ação definida</div></div></div>`);

  // Calendar today
  const today = new Date().toISOString().split('T')[0];
  const todayItems = data.calendar.filter(c => c.date === today);
  todayItems.forEach(c => {
    alerts.push(`<div class="item"><div class="item-body"><div class="item-title" style="color:var(--orange)">&#128197; Hoje: ${esc(c.text)}${c.time ? ' as ' + c.time : ''}</div></div></div>`);
  });

  const recent = document.getElementById('dashboard-recent');
  recent.innerHTML = alerts.length > 0 ? alerts.join('') : '<div class="text-muted text-sm">Nenhum alerta. Sistema limpo!</div>';

  // Weekly chart
  renderWeeklyChart();

  // Active projects
  const prjDiv = document.getElementById('dashboard-projects');
  const activeProjects = data.projects.filter(p => !p.done).slice(0, 5);
  if (activeProjects.length === 0) {
    prjDiv.innerHTML = '<div class="text-muted text-sm">Nenhum projeto ativo.</div>';
  } else {
    prjDiv.innerHTML = activeProjects.map(p => {
      const acts = data.actions.filter(a => a.projectId === p.id);
      const done = acts.filter(a => a.done).length;
      const total = acts.length;
      const pct = total > 0 ? Math.round((done/total)*100) : 0;
      return `
        <div class="card" style="cursor:pointer" onclick="navigateTo('projects')">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13px;font-weight:600">${esc(p.name)}</span>
            <span class="text-sm text-muted">${total > 0 ? done+'/'+total : 'sem ações'}</span>
          </div>
          ${total > 0 ? `<div class="project-bar"><div class="project-bar-fill" style="width:${pct}%"></div></div>` : ''}
        </div>`;
    }).join('');
  }
}

// ==========================================================================
// WEEKLY CHART & HISTORY
// ==========================================================================

function recordCompletion() {
  if (!data.completionHistory) data.completionHistory = {};
  const today = new Date().toISOString().split('T')[0];
  data.completionHistory[today] = (data.completionHistory[today] || 0) + 1;
  // Keep only last 30 days
  const keys = Object.keys(data.completionHistory).sort();
  if (keys.length > 30) {
    keys.slice(0, keys.length - 30).forEach(k => delete data.completionHistory[k]);
  }
}

function renderWeeklyChart() {
  const container = document.getElementById('dashboard-weekly-chart');
  if (!container) return;
  const history = data.completionHistory || {};
  const days = [];
  const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const count = history[key] || 0;
    days.push({ label: dayNames[d.getDay()], count, isToday: i === 0 });
  }

  const max = Math.max(...days.map(d => d.count), 1);
  const total = days.reduce((s, d) => s + d.count, 0);

  container.innerHTML = `
    <div class="card">
      <div class="weekly-chart">
        ${days.map(d => `
          <div class="weekly-chart-bar">
            <span class="bar-label">${d.count}</span>
            <div class="bar" style="height:${Math.max((d.count / max) * 80, 2)}px;${d.isToday ? 'background:var(--green)' : ''}"></div>
            <span class="bar-day" style="${d.isToday ? 'color:var(--green);font-weight:600' : ''}">${d.label}</span>
          </div>
        `).join('')}
      </div>
      <div style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:8px">
        Total: <strong style="color:var(--text-primary)">${total}</strong> concluídas na semana
        ${total > 0 ? ` | Media: <strong style="color:var(--text-primary)">${(total/7).toFixed(1)}</strong>/dia` : ''}
      </div>
    </div>`;
}

// ==========================================================================
// EXPORT / IMPORT
// ==========================================================================

function showSecuritySettings() {
  if (!currentUser) { toast('Faça login para acessar configurações de segurança.', 'info'); return; }
  const checked = data.twoFactorEnabled ? 'checked' : '';
  openModal(`
    <h3>&#128274; Seguranca</h3>
    <div style="margin:16px 0">
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px">
        <input type="checkbox" id="2fa-toggle" ${checked} onchange="toggle2FA(this.checked)" style="width:18px;height:18px;cursor:pointer">
        Verificação em duas etapas (2FA)
      </label>
      <p style="font-size:12px;color:var(--text-secondary);margin:8px 0 0 28px">
        Ao ativar, um código será enviado ao seu e-mail a cada login para confirmar sua identidade.
      </p>
    </div>
    <div class="modal-buttons">
      <button class="btn btn-primary" onclick="closeModal()">Fechar</button>
    </div>
  `);
}

async function toggle2FA(enabled) {
  data.twoFactorEnabled = enabled;
  saveData();
  toast(enabled ? 'Verificação em duas etapas ativada!' : 'Verificação em duas etapas desativada.');
}

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gtd-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Dados exportados!');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (typeof imported !== 'object' || imported === null || Array.isArray(imported)) {
        toast('Arquivo inválido: formato incorreto.', 'info');
        return;
      }
      // Validate and sanitize all array fields
      if (!Array.isArray(imported.inbox)) imported.inbox = [];
      if (!Array.isArray(imported.actions)) imported.actions = [];
      if (!Array.isArray(imported.projects)) imported.projects = [];
      if (!Array.isArray(imported.calendar)) imported.calendar = [];
      if (!Array.isArray(imported.waiting)) imported.waiting = [];
      if (!Array.isArray(imported.someday)) imported.someday = [];
      if (!Array.isArray(imported.reference)) imported.reference = [];
      if (!imported.contexts || !Array.isArray(imported.contexts)) imported.contexts = [...DEFAULT_CONTEXTS];
      if (!imported.reviewState || typeof imported.reviewState !== 'object') imported.reviewState = {};
      if (typeof imported.completedToday !== 'number') imported.completedToday = 0;
      if (!imported.lastDate) imported.lastDate = new Date().toDateString();
      if (!imported.completionHistory || typeof imported.completionHistory !== 'object') imported.completionHistory = {};
      data = imported;
      saveData();
      navigateTo('dashboard');
      toast('Dados importados com sucesso!');
    } catch(err) {
      toast('Erro ao importar arquivo', 'info');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ==========================================================================
// UTILITIES
// ==========================================================================

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return mins + ' min atras';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h atras';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + 'd atras';
  return formatDate(dateStr.split('T')[0]);
}

// ==========================================================================
// INTERACTIVE TUTORIAL
// ==========================================================================

const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
const tutorialSteps = [
  {
    target: '.nav-item[data-page="inbox"]',
    title: '1. Capture Tudo',
    text: 'Coloque aqui qualquer coisa que esta na sua cabeça. Compromissos, ideias, tarefas — tudo vai para a Caixa de Entrada primeiro.'
  },
  {
    target: '.nav-item[data-page="process"]',
    title: '2. Processe o Inbox',
    text: 'Use o assistente para decidir o que fazer com cada item: é acionável? Leva menos de 2 minutos? Delegue, adie ou descarte.'
  },
  {
    target: '.nav-item[data-page="actions"]',
    title: '3. Próximas Ações',
    text: 'Suas ações concretas ficam aqui, organizadas por contexto (@Casa, @Escritório...), energia e tempo estimado.'
  },
  {
    target: '.nav-item[data-page="projects"]',
    title: '4. Projetos',
    text: 'Qualquer resultado que exija mais de 1 ação é um projeto. Cada projeto deve ter sempre uma próxima ação definida.'
  },
  {
    target: '.nav-item[data-page="review"]',
    title: '5. Revisão Semanal',
    text: 'O hábito mais importante do GTD! Reserve 1-2 horas por semana para revisar tudo e manter o sistema atualizado.'
  },
  {
    target: isMobileDevice ? '#fab-btn' : '#shortcut-badge-capture',
    title: 'Captura Rápida',
    text: isMobileDevice
      ? 'Toque no botão + para capturar algo rapidamente, acessar a Caixa de Entrada, processar itens ou buscar.'
      : 'Use Ctrl+K (ou Cmd+K) a qualquer momento para capturar algo rapidamente. Ctrl+F abre a busca global.'
  }
];

let tutorialCurrentStep = 0;

function startTutorial() {
  tutorialCurrentStep = 0;
  document.getElementById('tutorial-overlay').classList.add('active');
  // Make sure sidebar is visible on mobile
  document.getElementById('sidebar').classList.add('open');
  showTutorialStep();
}

function showTutorialStep() {
  const step = tutorialSteps[tutorialCurrentStep];
  const el = document.querySelector(step.target);
  const overlay = document.getElementById('tutorial-overlay');
  const spotlight = document.getElementById('tutorial-spotlight');
  const tooltip = document.getElementById('tutorial-tooltip');

  if (el) {
    const rect = el.getBoundingClientRect();
    const pad = 6;
    spotlight.style.top = (rect.top - pad) + 'px';
    spotlight.style.left = (rect.left - pad) + 'px';
    spotlight.style.width = (rect.width + pad * 2) + 'px';
    spotlight.style.height = (rect.height + pad * 2) + 'px';

    // Position tooltip — prefer below, but flip above if no room
    let tooltipTop = rect.bottom + 12;
    const tooltipLeft = Math.min(Math.max(rect.left, 10), window.innerWidth - 340);
    // Estimate tooltip height (~180px) and check if it fits
    const estimatedHeight = 180;
    if (tooltipTop + estimatedHeight > window.innerHeight - 10) {
      tooltipTop = Math.max(10, rect.top - estimatedHeight - 12);
    }
    tooltip.style.top = tooltipTop + 'px';
    tooltip.style.left = tooltipLeft + 'px';
  }

  const dots = tutorialSteps.map((_, i) =>
    `<span class="tutorial-dot ${i === tutorialCurrentStep ? 'active' : ''}"></span>`
  ).join('');

  tooltip.innerHTML = `
    <h4>${step.title}</h4>
    <p>${step.text}</p>
    <div class="tutorial-nav">
      <div class="tutorial-dots">${dots}</div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm" onclick="endTutorial()">Pular</button>
        ${tutorialCurrentStep < tutorialSteps.length - 1
          ? `<button class="btn btn-primary btn-sm" onclick="nextTutorialStep()">Próximo</button>`
          : `<button class="btn btn-primary btn-sm" onclick="endTutorial()">Concluir</button>`
        }
      </div>
    </div>
  `;
}

function nextTutorialStep() {
  tutorialCurrentStep++;
  if (tutorialCurrentStep >= tutorialSteps.length) {
    endTutorial();
    return;
  }
  showTutorialStep();
}

function endTutorial() {
  document.getElementById('tutorial-overlay').classList.remove('active');
  closeSidebar();
}

// ==========================================================================
// THEME TOGGLE
// ==========================================================================

function initTheme() {
  const saved = localStorage.getItem('gtd-theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  updateThemeButton(theme);
}

function updateThemeButton(theme) {
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (icon && label) {
    if (theme === 'light') {
      icon.innerHTML = '&#9790;';
      label.textContent = 'Tema Escuro';
    } else {
      icon.innerHTML = '&#9788;';
      label.textContent = 'Tema Claro';
    }
  }
}

function toggleTheme() {
  const current = localStorage.getItem('gtd-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('gtd-theme', next);
  applyTheme(next);
}

initTheme();

// ==========================================================================
// GLOBAL SEARCH
// ==========================================================================

function openGlobalSearch() {
  const overlay = document.getElementById('global-search');
  overlay.classList.add('open');
  setTimeout(() => document.getElementById('global-search-input').focus(), 100);
}

function closeGlobalSearch() {
  document.getElementById('global-search').classList.remove('open');
  document.getElementById('global-search-input').value = '';
  document.getElementById('search-results').innerHTML = '<div class="empty-state" style="padding:20px"><p class="text-muted text-sm">Digite para buscar em Inbox, Ações, Projetos, Calendário, Aguardando, Algum Dia e Referência.</p></div>';
}

function handleSearchKey(e) {
  if (e.key === 'Escape') { closeGlobalSearch(); e.preventDefault(); }
}

function highlightMatch(text, query) {
  if (!query) return esc(text);
  const escaped = esc(text);
  const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}

function performGlobalSearch() {
  const query = document.getElementById('global-search-input').value.trim().toLowerCase();
  const container = document.getElementById('search-results');
  if (!query || query.length < 2) {
    container.innerHTML = '<div class="empty-state" style="padding:20px"><p class="text-muted text-sm">Digite ao menos 2 caracteres para buscar.</p></div>';
    return;
  }

  const results = [];

  // Inbox
  data.inbox.filter(i => i.text.toLowerCase().includes(query)).forEach(i => {
    results.push({ group: 'Caixa de Entrada', text: i.text, meta: timeAgo(i.createdAt), page: 'inbox' });
  });

  // Actions
  data.actions.filter(a => !a.done && a.text.toLowerCase().includes(query)).forEach(a => {
    const project = a.projectId ? data.projects.find(p => p.id === a.projectId) : null;
    results.push({ group: 'Próximas Ações', text: a.text, meta: [a.context, project?.name].filter(Boolean).join(' | '), page: 'actions' });
  });

  // Projects
  data.projects.filter(p => !p.done && p.name.toLowerCase().includes(query)).forEach(p => {
    const acts = data.actions.filter(a => a.projectId === p.id && !a.done).length;
    results.push({ group: 'Projetos', text: p.name, meta: acts + ' ações pendentes', page: 'projects' });
  });

  // Calendar
  data.calendar.filter(c => c.text.toLowerCase().includes(query)).forEach(c => {
    results.push({ group: 'Calendário', text: c.text, meta: formatDate(c.date) + (c.time ? ' ' + c.time : ''), page: 'calendar' });
  });

  // Waiting
  data.waiting.filter(w => !w.done && (w.text.toLowerCase().includes(query) || (w.person||'').toLowerCase().includes(query))).forEach(w => {
    results.push({ group: 'Aguardando', text: w.text, meta: w.person ? 'De: ' + w.person : '', page: 'waiting' });
  });

  // Someday
  data.someday.filter(s => s.text.toLowerCase().includes(query)).forEach(s => {
    results.push({ group: 'Algum Dia / Talvez', text: s.text, meta: timeAgo(s.createdAt), page: 'someday' });
  });

  // Reference
  data.reference.filter(r => r.title.toLowerCase().includes(query) || (r.notes||'').toLowerCase().includes(query)).forEach(r => {
    results.push({ group: 'Referência', text: r.title, meta: r.notes ? r.notes.substring(0, 60) + (r.notes.length > 60 ? '...' : '') : '', page: 'reference' });
  });

  if (results.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:20px"><p class="text-muted text-sm">Nenhum resultado para "' + esc(query) + '"</p></div>';
    return;
  }

  // Group results
  const grouped = {};
  results.forEach(r => {
    if (!grouped[r.group]) grouped[r.group] = [];
    grouped[r.group].push(r);
  });

  container.innerHTML = Object.entries(grouped).map(([group, items]) => `
    <div class="search-group-title">${group} (${items.length})</div>
    ${items.map(item => `
      <div class="search-result-item" onclick="closeGlobalSearch();navigateTo('${item.page}')">
        <div>${highlightMatch(item.text, query)}</div>
        ${item.meta ? `<div class="search-result-meta">${esc(item.meta)}</div>` : ''}
      </div>
    `).join('')}
  `).join('');
}

// ==========================================================================
// DRAG & DROP
// ==========================================================================

let draggedItemId = null;
let draggedList = null;

function initDragDrop(container, listName) {
  if (!container) return;
  const items = container.querySelectorAll('.item[draggable="true"]');
  items.forEach(item => {
    item.addEventListener('dragstart', e => {
      draggedItemId = item.dataset.id;
      draggedList = listName;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      container.querySelectorAll('.item').forEach(i => i.classList.remove('drag-over'));
      draggedItemId = null;
      draggedList = null;
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (item.dataset.id !== draggedItemId) {
        item.classList.add('drag-over');
      }
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (!draggedItemId || item.dataset.id === draggedItemId) return;
      const arr = data[listName];
      const fromIdx = arr.findIndex(i => i.id === draggedItemId);
      const toIdx = arr.findIndex(i => i.id === item.dataset.id);
      if (fromIdx === -1 || toIdx === -1) return;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      saveData();
      if (listName === 'inbox') renderInbox();
      else if (listName === 'actions') renderActions();
    });
  });
}

// ==========================================================================
// PLATFORM DETECTION
// ==========================================================================

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
              navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? 'Cmd' : 'Ctrl';
const modKeyProp = isMac ? 'metaKey' : 'ctrlKey';

// Update shortcut hints in UI
function updateShortcutHints() {
  let el = document.getElementById('shortcut-hint-capture');
  let badge = document.getElementById('shortcut-badge-capture');
  let searchHint = document.getElementById('shortcut-hint-search');
  if (isMobileDevice) {
    // Hide keyboard shortcut hints on mobile
    if (el) el.style.display = 'none';
    if (badge) badge.style.display = 'none';
    if (searchHint) searchHint.style.display = 'none';
  } else {
    if (el) el.textContent = `${modKey}+K para abrir / Esc para fechar`;
    if (badge) badge.textContent = `${modKey}+K`;
    if (searchHint) searchHint.textContent = `${modKey}+F / Esc para fechar`;
  }
}

// ==========================================================================
// QUICK CAPTURE (global - accessible from any page)
// ==========================================================================

function openQuickCapture() {
  const overlay = document.getElementById('quick-capture');
  overlay.classList.add('open');
  setTimeout(() => document.getElementById('quick-capture-input').focus(), 100);
}

function closeQuickCapture() {
  document.getElementById('quick-capture').classList.remove('open');
  document.getElementById('quick-capture-input').value = '';
}

function handleQuickCaptureKey(e) {
  if (e.key === 'Enter') {
    const input = document.getElementById('quick-capture-input');
    const text = input.value.trim();
    if (!text) return;
    data.inbox.push({ id: genId(), text, createdAt: new Date().toISOString() });
    saveData();
    updateBadges();
    input.value = '';
    toast('Capturado na Caixa de Entrada!');
    // Keep open for rapid capture - user can press Esc to close
  }
  if (e.key === 'Escape') {
    closeQuickCapture();
  }
}

// ==========================================================================
// KEYBOARD SHORTCUTS (cross-platform)
// ==========================================================================

document.addEventListener('keydown', function(e) {
  // Don't process shortcuts when auth overlay is visible
  if (document.getElementById('auth-overlay').style.display !== 'none') return;

  // Don't trigger shortcuts when typing in inputs (except specific combos)
  const isInput = ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);

  // Escape: close search / modal / quick capture / mobile sidebar
  if (e.key === 'Escape') {
    if (document.getElementById('global-search').classList.contains('open')) {
      closeGlobalSearch();
      e.preventDefault();
      return;
    }
    if (document.getElementById('quick-capture').classList.contains('open')) {
      closeQuickCapture();
      e.preventDefault();
      return;
    }
    if (document.getElementById('modal-overlay').classList.contains('open')) {
      closeModal();
      e.preventDefault();
      return;
    }
    closeSidebar();
    return;
  }

  // Mod+F: Global Search
  if (e[modKeyProp] && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    if (document.getElementById('global-search').classList.contains('open')) {
      closeGlobalSearch();
    } else {
      openGlobalSearch();
    }
    return;
  }

  // Mod+K: Quick Capture
  if (e[modKeyProp] && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (document.getElementById('quick-capture').classList.contains('open')) {
      closeQuickCapture();
    } else {
      openQuickCapture();
    }
    return;
  }

  // Mod+Shift+P: Process inbox
  if (e[modKeyProp] && e.shiftKey && e.key.toLowerCase() === 'p') {
    e.preventDefault();
    navigateTo('process');
    return;
  }

  // Skip remaining shortcuts if typing
  if (isInput) return;

  // ? : Show keyboard shortcuts help
  if (e.key === '?' && !e[modKeyProp]) {
    showKeyboardHelp();
    return;
  }

  // Number keys 1-9 for navigation (when not in input)
  const navMap = { '1':'dashboard', '2':'inbox', '3':'process', '4':'actions', '5':'projects', '6':'calendar', '7':'waiting', '8':'someday', '9':'review', '0':'reference' };
  if (navMap[e.key] && !e[modKeyProp] && !e.shiftKey && !e.altKey) {
    navigateTo(navMap[e.key]);
    return;
  }
});

// ==========================================================================
// KEYBOARD SHORTCUTS HELP
// ==========================================================================

function showKeyboardHelp() {
  const shortcuts = [
    [`${modKey}+K`, 'Captura Rápida'],
    [`${modKey}+F`, 'Busca Global'],
    [`${modKey}+Shift+P`, 'Processar Inbox'],
    ['1-9, 0', 'Navegar entre páginas'],
    ['?', 'Mostrar atalhos (esta tela)'],
    ['Escape', 'Fechar modal/overlay'],
  ];

  const mobileHints = ('ontouchstart' in window) ? `
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Gestos Touch</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div style="font-size:12px;color:var(--text-secondary)">Deslizar &#8594;</div><div style="font-size:12px;color:var(--green)">Concluir item</div>
        <div style="font-size:12px;color:var(--text-secondary)">Deslizar &#8592;</div><div style="font-size:12px;color:var(--red)">Excluir item</div>
      </div>
    </div>
  ` : '';

  openModal(`
    <h3>&#9000; Atalhos de Teclado</h3>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;align-items:center">
      ${shortcuts.map(([key, desc]) => `
        <span><span class="kbd" style="font-size:12px;padding:4px 8px">${key}</span></span>
        <span style="font-size:13px;color:var(--text-secondary)">${desc}</span>
      `).join('')}
    </div>
    <div style="margin-top:12px;font-size:11px;color:var(--text-muted)">
      Números funcionam fora de campos de texto: 1=Dashboard, 2=Inbox, 3=Processar, 4=Ações, 5=Projetos, 6=Calendário, 7=Aguardando, 8=Algum Dia, 9=Revisão, 0=Referência
    </div>
    ${mobileHints}
    <div class="modal-buttons">
      <button class="btn btn-primary" onclick="closeModal()">Fechar</button>
    </div>
  `);
}

// ==========================================================================
// MOBILE SWIPE GESTURES
// ==========================================================================

function initSwipeGestures(container, options) {
  if (!container || !('ontouchstart' in window)) return;
  const THRESHOLD = 80;
  let startX = 0, currentX = 0, swiping = false, target = null;

  container.addEventListener('touchstart', e => {
    const item = e.target.closest('.item[data-id]');
    if (!item) return;
    target = item;
    startX = e.touches[0].clientX;
    swiping = false;
  }, { passive: true });

  container.addEventListener('touchmove', e => {
    if (!target) return;
    currentX = e.touches[0].clientX;
    const dx = currentX - startX;
    if (Math.abs(dx) > 20) swiping = true;
    if (!swiping) return;

    if (dx > 0 && options.onSwipeRight) {
      target.classList.add('swiping-right');
      target.classList.remove('swiping-left');
      target.style.setProperty('--swipe-x', Math.min(dx, 120) + 'px');
    } else if (dx < 0 && options.onSwipeLeft) {
      target.classList.add('swiping-left');
      target.classList.remove('swiping-right');
      target.style.setProperty('--swipe-x', Math.max(dx, -120) + 'px');
    }
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (!target || !swiping) { target = null; return; }
    const dx = currentX - startX;
    if (dx > THRESHOLD && options.onSwipeRight) {
      options.onSwipeRight(target.dataset.id);
    } else if (dx < -THRESHOLD && options.onSwipeLeft) {
      options.onSwipeLeft(target.dataset.id);
    }
    target.classList.remove('swiping-right', 'swiping-left');
    target.style.removeProperty('--swipe-x');
    target.style.transform = '';
    target = null;
    swiping = false;
  });
}

// ==========================================================================
// BROWSER NOTIFICATIONS
// ==========================================================================

let notificationPermission = Notification?.permission || 'default';
let notificationInterval = null;

function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    notificationPermission = 'granted';
    startNotificationCheck();
    return;
  }
  if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      notificationPermission = permission;
      if (permission === 'granted') startNotificationCheck();
    });
  }
}

function startNotificationCheck() {
  if (notificationInterval) return;
  checkCalendarNotifications();
  notificationInterval = setInterval(checkCalendarNotifications, 5 * 60 * 1000); // every 5 min
}

function checkCalendarNotifications() {
  if (notificationPermission !== 'granted') return;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const hhmm = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  const notifiedKey = 'gtd-notified-' + today;
  const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');

  data.calendar.forEach(item => {
    if (notified.includes(item.id)) return;
    // Notify for today's items
    if (item.date === today) {
      // If item has a time, notify within 15 min window
      if (item.time) {
        const diff = timeDiffMinutes(hhmm, item.time);
        if (diff >= -5 && diff <= 15) {
          sendNotification('Calendário GTD', item.text + ' as ' + item.time);
          notified.push(item.id);
        }
      } else {
        // Items without time — notify once in the morning (before 10:00)
        if (hhmm < '10:00') {
          sendNotification('Calendário GTD - Hoje', item.text);
          notified.push(item.id);
        }
      }
    }
    // Notify for overdue items
    if (item.date < today && !notified.includes('overdue-' + item.id)) {
      sendNotification('GTD - Atrasado!', item.text + ' (' + formatDate(item.date) + ')');
      notified.push('overdue-' + item.id);
    }
  });

  localStorage.setItem(notifiedKey, JSON.stringify(notified));
}

function timeDiffMinutes(now, target) {
  const [nh, nm] = now.split(':').map(Number);
  const [th, tm] = target.split(':').map(Number);
  return (th * 60 + tm) - (nh * 60 + nm);
}

function sendNotification(title, body) {
  try {
    new Notification(title, {
      body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%236c8cff"/><text x="50" y="68" font-size="48" font-weight="bold" text-anchor="middle" fill="white" font-family="sans-serif">GTD</text></svg>',
      tag: title + body
    });
  } catch(e) {}
}

// ==========================================================================
// PWA SERVICE WORKER
// ==========================================================================

// SW registration disabled — self-destruct mode until all old caches are cleared
// if ('serviceWorker' in navigator && location.protocol !== 'file:') {
//   navigator.serviceWorker.register('sw.js').catch(() => {});
// }

// ==========================================================================
// WELCOME / ONBOARDING
// ==========================================================================

function showWelcomeIfNeeded() {
  const key = currentUser ? 'gtd-welcomed-' + currentUser.id : 'gtd-welcomed';
  if (!localStorage.getItem(key)) {
    document.getElementById('welcome-overlay').style.display = 'flex';
  }
}

function dismissWelcome() {
  const key = currentUser ? 'gtd-welcomed-' + currentUser.id : 'gtd-welcomed';
  localStorage.setItem(key, '1');
  const overlay = document.getElementById('welcome-overlay');
  overlay.classList.add('hiding');
  setTimeout(() => overlay.style.display = 'none', 500);
}

function restartTutorial() {
  closeSidebar();
  const key = currentUser ? 'gtd-welcomed-' + currentUser.id : 'gtd-welcomed';
  localStorage.removeItem(key);
  const overlay = document.getElementById('welcome-overlay');
  overlay.classList.remove('hiding');
  overlay.style.display = 'flex';
  overlay.scrollTop = 0;
}

// ==========================================================================
// IMPORT TASKS
// ==========================================================================

let importParsedData = null;

function openImportModal() {
  importParsedData = null;
  document.getElementById('import-preview').style.display = 'none';
  document.getElementById('import-confirm-btn').style.display = 'none';
  document.getElementById('import-parse-btn').style.display = '';
  document.getElementById('import-texto-input').value = '';
  document.getElementById('import-estruturado-input').value = '';
  document.getElementById('import-csv-name').textContent = 'Nenhum arquivo selecionado';
  document.getElementById('import-csv-file').value = '';
  switchImportTab('todoist');
  document.getElementById('import-overlay').classList.add('open');
}

function closeImportModal() {
  document.getElementById('import-overlay').classList.remove('open');
  importParsedData = null;
}

function switchImportTab(tab) {
  document.querySelectorAll('.import-tab').forEach(t => t.classList.toggle('active', t.dataset.importTab === tab));
  document.querySelectorAll('.import-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('import-tab-' + tab).classList.add('active');
  document.getElementById('import-preview').style.display = 'none';
  document.getElementById('import-confirm-btn').style.display = 'none';
  document.getElementById('import-parse-btn').style.display = '';
  importParsedData = null;
}

function handleCsvFileSelect(event) {
  const file = event.target.files[0];
  document.getElementById('import-csv-name').textContent = file ? file.name : 'Nenhum arquivo selecionado';
}

function getActiveImportTab() {
  const active = document.querySelector('.import-tab.active');
  return active ? active.dataset.importTab : 'todoist';
}

function parseImport() {
  const tab = getActiveImportTab();
  if (tab === 'todoist') parseTodoistCSV();
  else if (tab === 'texto') parseTextoLivre();
  else if (tab === 'estruturado') parseTextoEstruturado();
}

// --- Texto Livre ---
function parseTextoLivre() {
  const text = document.getElementById('import-texto-input').value.trim();
  if (!text) { toast('Cole algum texto para importar.', 'info'); return; }
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  importParsedData = {
    inbox: lines.map(l => ({ id: genId(), text: l, createdAt: new Date().toISOString() })),
    actions: [], projects: [], calendar: [], waiting: [], someday: []
  };
  showImportPreview();
}

// --- Texto Estruturado ---
function parseTextoEstruturado() {
  const text = document.getElementById('import-estruturado-input').value.trim();
  if (!text) { toast('Cole algum texto estruturado para importar.', 'info'); return; }

  const result = { inbox: [], actions: [], projects: [], calendar: [], waiting: [], someday: [] };
  let currentProject = null;

  const lines = text.split('\n');
  for (let line of lines) {
    line = line.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Project heading: # Nome do Projeto
    if (/^#\s+/.test(trimmed)) {
      const name = trimmed.replace(/^#\s+/, '').trim();
      if (name) {
        const proj = { id: genId(), name, done: false, createdAt: new Date().toISOString() };
        result.projects.push(proj);
        currentProject = proj;
      }
      continue;
    }

    // Remove leading "- " if present
    let content = trimmed.replace(/^-\s*/, '');

    // Someday/Maybe: ~Tarefa or - ~Tarefa
    if (content.startsWith('~')) {
      content = content.slice(1).trim();
      if (content) {
        result.someday.push({ id: genId(), text: content, createdAt: new Date().toISOString() });
      }
      continue;
    }

    // Waiting: >> Pessoa
    const waitingMatch = content.match(/^(.+?)\s*>>\s*(.+)$/);
    if (waitingMatch) {
      const taskText = waitingMatch[1].trim();
      const person = waitingMatch[2].trim();
      result.waiting.push({
        id: genId(), text: taskText, person,
        projectId: currentProject ? currentProject.id : null,
        delegatedAt: new Date().toISOString().split('T')[0],
        done: false, createdAt: new Date().toISOString()
      });
      continue;
    }

    // Calendar: [2026-03-10] or [2026-03-10 14:00]
    const calMatch = content.match(/^(.+?)\s*\[(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?\](.*)$/);
    if (calMatch) {
      let taskText = (calMatch[1] + (calMatch[4] || '')).trim();
      const date = calMatch[2];
      const time = calMatch[3] || null;
      // Also extract context if present
      const ctxMatch = taskText.match(/\s+@(\S+)/);
      if (ctxMatch) taskText = taskText.replace(/\s+@\S+/, '').trim();
      result.calendar.push({
        id: genId(), text: taskText, date, time, createdAt: new Date().toISOString()
      });
      continue;
    }

    // Context extraction: @contexto
    let context = '';
    const ctxMatch = content.match(/\s+@(\S+)/);
    if (ctxMatch) {
      context = '@' + ctxMatch[1];
      content = content.replace(/\s+@\S+/, '').trim();
    }

    // If under a project, create an action; otherwise inbox
    if (currentProject && trimmed.startsWith('-')) {
      result.actions.push({
        id: genId(), text: content, context, energy: '', time: '',
        projectId: currentProject.id, done: false, createdAt: new Date().toISOString()
      });
    } else if (context) {
      // Has context → action in inbox-like but with context = goes to actions
      result.actions.push({
        id: genId(), text: content, context, energy: '', time: '',
        projectId: null, done: false, createdAt: new Date().toISOString()
      });
    } else {
      result.inbox.push({ id: genId(), text: content, createdAt: new Date().toISOString() });
    }
  }

  importParsedData = result;
  showImportPreview();
}

// --- CSV ---
function parseTodoistCSV() {
  const fileInput = document.getElementById('import-csv-file');
  if (!fileInput.files || !fileInput.files[0]) {
    toast('Selecione um arquivo CSV primeiro.', 'info');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const rows = parseCSVRows(e.target.result);
      if (rows.length < 2) { toast('Arquivo CSV vazio ou inválido.', 'info'); return; }
      const headers = rows[0].map(h => h.trim().toLowerCase());
      const colIdx = {};
      ['content','description','priority','due_date','project_name','section_name','labels','is_completed'].forEach(col => {
        colIdx[col] = headers.indexOf(col);
      });
      if (colIdx.content === -1) { toast('Coluna "content" não encontrada no CSV.', 'info'); return; }

      const result = { inbox: [], actions: [], projects: [], calendar: [], waiting: [], someday: [] };
      const projectMap = {};

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length <= 1 && !row[0]) continue;

        const get = col => colIdx[col] >= 0 && row[colIdx[col]] ? row[colIdx[col]].trim() : '';

        // Skip completed tasks
        const completed = get('is_completed');
        if (completed === '1' || completed.toLowerCase() === 'true' || completed.toLowerCase() === 'yes') continue;

        const content = get('content');
        if (!content) continue;

        const projectName = get('project_name');
        const labels = get('labels');
        const dueDate = get('due_date');
        const description = get('description');

        let text = content;
        if (description) text += ' — ' + description;

        // Create project if needed
        let projectId = null;
        if (projectName && projectName.toLowerCase() !== 'inbox') {
          if (!projectMap[projectName]) {
            const proj = { id: genId(), name: projectName, done: false, createdAt: new Date().toISOString() };
            result.projects.push(proj);
            projectMap[projectName] = proj.id;
          }
          projectId = projectMap[projectName];
        }

        // Parse context from labels
        let context = '';
        if (labels) {
          const firstLabel = labels.split(',')[0].trim();
          if (firstLabel) context = '@' + firstLabel.replace(/^@/, '');
        }

        // Calendar items (have due date)
        if (dueDate) {
          let parsedDate = null, parsedTime = null;
          const dateMatch = dueDate.match(/(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/);
          if (dateMatch) { parsedDate = dateMatch[1]; parsedTime = dateMatch[2] || null; }
          else {
            const altMatch = dueDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (altMatch) parsedDate = altMatch[3] + '-' + altMatch[2] + '-' + altMatch[1];
          }
          if (parsedDate) {
            result.calendar.push({
              id: genId(), text, date: parsedDate, time: parsedTime, createdAt: new Date().toISOString()
            });
            if (projectId) {
              result.actions.push({
                id: genId(), text, context, energy: '', time: '',
                projectId, done: false, createdAt: new Date().toISOString()
              });
            }
            continue;
          }
        }

        // Actions (has project or context)
        if (projectId || context) {
          result.actions.push({
            id: genId(), text, context, energy: '', time: '',
            projectId, done: false, createdAt: new Date().toISOString()
          });
        } else {
          // Default to inbox
          result.inbox.push({ id: genId(), text, createdAt: new Date().toISOString() });
        }
      }

      importParsedData = result;
      showImportPreview();
    } catch (err) {
      toast('Erro ao processar CSV: ' + err.message, 'info');
    }
  };
  reader.readAsText(fileInput.files[0]);
}

function parseCSVRows(text) {
  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { current.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
        current.push(field); field = '';
        if (current.length > 1 || current[0]) rows.push(current);
        current = [];
      } else {
        field += ch;
      }
    }
  }
  current.push(field);
  if (current.length > 1 || current[0]) rows.push(current);
  return rows;
}

function showImportPreview() {
  if (!importParsedData) return;
  const d = importParsedData;
  const total = d.inbox.length + d.actions.length + d.projects.length + d.calendar.length + d.waiting.length + d.someday.length;
  if (total === 0) { toast('Nenhum item encontrado para importar.', 'info'); return; }

  let html = '';
  const line = (label, count) => {
    if (count > 0) html += `<div class="import-preview-line"><span>${label}</span><span class="import-count">${count}</span></div>`;
  };
  line('Caixa de Entrada', d.inbox.length);
  line('Próximas Ações', d.actions.length);
  line('Projetos', d.projects.length);
  line('Calendário', d.calendar.length);
  line('Aguardando', d.waiting.length);
  line('Algum Dia / Talvez', d.someday.length);
  html += `<div class="import-preview-line" style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px;font-weight:600"><span>Total</span><span class="import-count">${total}</span></div>`;

  document.getElementById('import-preview-content').innerHTML = html;
  document.getElementById('import-preview').style.display = '';
  document.getElementById('import-parse-btn').style.display = 'none';
  document.getElementById('import-confirm-btn').style.display = '';
}

function confirmImport() {
  if (!importParsedData) return;
  const d = importParsedData;

  if (d.inbox.length) data.inbox.push(...d.inbox);
  if (d.actions.length) data.actions.push(...d.actions);
  if (d.projects.length) data.projects.push(...d.projects);
  if (d.calendar.length) data.calendar.push(...d.calendar);
  if (d.waiting.length) data.waiting.push(...d.waiting);
  if (d.someday.length) data.someday.push(...d.someday);

  saveData();
  updateBadges();

  const total = d.inbox.length + d.actions.length + d.projects.length + d.calendar.length + d.waiting.length + d.someday.length;
  toast(`${total} itens importados com sucesso!`);
  closeImportModal();

  // Re-render current page
  const activePage = document.querySelector('.nav-item.active');
  if (activePage) navigateTo(activePage.dataset.page);
}

// ==========================================================================
// AUTH / LOGIN
// ==========================================================================

let pending2FAEmail = null;
let loginInProgress = false;

function togglePasswordVisibility(btn) {
  const input = btn.parentElement.querySelector('input');
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

async function verify2FA() {
  if (!pending2FAEmail) return;
  const code = document.getElementById('auth-2fa-code').value.trim();
  if (!code || code.length < 6 || code.length > 8) { showAuthMessage('Digite o código de verificação.', 'error'); return; }

  const btn = document.getElementById('auth-2fa-btn');
  btn.textContent = 'Verificando...';
  btn.disabled = true;

  const { error } = await supabaseClient.auth.verifyOtp({
    email: pending2FAEmail,
    token: code,
    type: 'email'
  });

  btn.textContent = 'Verificar';
  btn.disabled = false;

  if (error) {
    showAuthMessage('Código inválido ou expirado. Tente novamente.', 'error');
    return;
  }

  pending2FAEmail = null;
  document.getElementById('auth-2fa-code').value = '';
  onAuthSuccess();
}

function cancel2FA() {
  pending2FAEmail = null;
  document.getElementById('auth-2fa-code').value = '';
  supabaseClient.auth.signOut();
  currentUser = null;
  toggleAuthForm('login');
}

function toggleAuthForm(form, keepMessage) {
  document.getElementById('auth-form-login').style.display = form === 'login' ? 'block' : 'none';
  document.getElementById('auth-form-register').style.display = form === 'register' ? 'block' : 'none';
  document.getElementById('auth-form-newpassword').style.display = form === 'newpassword' ? 'block' : 'none';
  document.getElementById('auth-form-2fa').style.display = form === '2fa' ? 'block' : 'none';
  if (!keepMessage) hideAuthMessage();
}

function showAuthMessage(msg, type) {
  const el = document.getElementById('auth-message');
  el.className = 'auth-message ' + type;
  el.textContent = msg;
  el.style.display = 'block';
}

function hideAuthMessage() {
  document.getElementById('auth-message').style.display = 'none';
}

function handleLogin() {
  if (!supabaseClient) {
    showAuthMessage('Erro ao carregar. Recarregue a página.', 'error');
    return;
  }
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) { showAuthMessage('Preencha e-mail e senha.', 'error'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAuthMessage('Digite um e-mail válido.', 'error'); return; }

  const btn = document.getElementById('auth-login-btn');
  btn.textContent = 'Conectando...';
  btn.disabled = true;
  loginInProgress = true;

  const xhr = new XMLHttpRequest();
  xhr.open('POST', SUPABASE_URL + '/auth/v1/token?grant_type=password');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
  xhr.timeout = 10000;

  xhr.onload = function() {
    let resp;
    try { resp = JSON.parse(xhr.responseText); } catch(e) {
      loginInProgress = false; btn.textContent = 'Entrar'; btn.disabled = false;
      showAuthMessage('Resposta inválida do servidor.', 'error'); return;
    }
    if (xhr.status !== 200) {
      loginInProgress = false; btn.textContent = 'Entrar'; btn.disabled = false;
      const msg = resp.error_description || resp.msg || resp.error || 'Erro desconhecido';
      const msgs = {
        'Invalid login credentials': 'Email ou senha incorretos.',
        'Email not confirmed': 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
        'email rate limit exceeded': 'Limite de e-mails atingido. Aguarde alguns minutos e tente novamente.'
      };
      showAuthMessage(msgs[msg] || msg, 'error'); return;
    }
    btn.textContent = 'Autenticando...';
    handleLoginSuccess(resp, email, btn);
  };
  xhr.onerror = function() {
    loginInProgress = false; btn.textContent = 'Entrar'; btn.disabled = false;
    showAuthMessage('Erro de conexão. Verifique sua internet.', 'error');
  };
  xhr.ontimeout = function() {
    loginInProgress = false; btn.textContent = 'Entrar'; btn.disabled = false;
    showAuthMessage('Conexão lenta. Tente novamente.', 'error');
  };
  xhr.send(JSON.stringify({ email: email, password: password }));
}

async function handleLoginSuccess(resp, email, btn) {
  try {
    await Promise.race([
      supabaseClient.auth.setSession({ access_token: resp.access_token, refresh_token: resp.refresh_token }),
      new Promise(function(_, reject) { setTimeout(function() { reject(new Error('timeout')); }, 5000); })
    ]);

    currentUser = resp.user;
    await loadCloudData();

    if (data.twoFactorEnabled) {
      const result = await supabaseClient.auth.signInWithOtp({ email: email, options: { shouldCreateUser: false } });
      if (result.error) {
        btn.textContent = 'Entrar'; btn.disabled = false;
        showAuthMessage('Erro ao enviar código de verificação. Tente novamente.', 'error');
        await supabaseClient.auth.signOut(); currentUser = null; return;
      }
      pending2FAEmail = email;
      btn.textContent = 'Entrar'; btn.disabled = false;
      toggleAuthForm('2fa');
      showAuthMessage('Código de verificação enviado para ' + email, 'info');
      return;
    }

    loginInProgress = false; btn.textContent = 'Entrar'; btn.disabled = false;
    onAuthSuccess();
  } catch (e) {
    console.error('Login error:', e);
    loginInProgress = false; btn.textContent = 'Entrar'; btn.disabled = false;
    showAuthMessage(e.message === 'timeout' ? 'Conexão lenta. Tente novamente.' : 'Erro ao entrar. Tente novamente.', 'error');
  }
}

async function handleRegister() {
  if (!supabaseClient) return;
  const name = document.getElementById('auth-reg-name').value.trim();
  const email = document.getElementById('auth-reg-email').value.trim();
  const password = document.getElementById('auth-reg-password').value;

  if (!name || !email || !password) { showAuthMessage('Preencha todos os campos.', 'error'); return; }
  if (password.length < 6) { showAuthMessage('A senha deve ter pelo menos 6 caracteres.', 'error'); return; }

  const btn = document.getElementById('auth-register-btn');
  btn.textContent = 'Criando conta...';
  btn.disabled = true;

  try {
    const { data: authData, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });

    btn.textContent = 'Criar Conta';
    btn.disabled = false;

    if (error) {
      const regMsgs = {
        'User already registered': 'Este e-mail já está cadastrado.',
        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
        'Unable to validate email address: invalid format': 'Formato de e-mail inválido.',
        'Signups not allowed for this instance': 'Registros desabilitados. Solicite um convite ao administrador.',
        'email rate limit exceeded': 'Limite de e-mails atingido. Aguarde alguns minutos e tente novamente.'
      };
      showAuthMessage(regMsgs[error.message] || error.message, 'error');
      return;
    }

    if (authData.user && !authData.session) {
      // Supabase returns empty identities when email already exists (anti-enumeration)
      if (!authData.user.identities || authData.user.identities.length === 0) {
        showAuthMessage('Este e-mail já está cadastrado. Faça login ou use "Esqueci minha senha".', 'error');
        return;
      }
      toggleAuthForm('login', true);
      showAuthMessage('Conta criada! Verifique seu e-mail para confirmar o cadastro.', 'success');
    } else if (authData.session) {
      currentUser = authData.user;
      onAuthSuccess();
    }
  } catch (e) {
    console.error('Register error:', e);
    btn.textContent = 'Criar Conta';
    btn.disabled = false;
    showAuthMessage('Erro ao criar conta. Verifique sua conexão e tente novamente.', 'error');
  }
}

async function handleResetPassword() {
  if (!supabaseClient) return;
  const email = document.getElementById('auth-email').value.trim();
  if (!email) { showAuthMessage('Digite seu e-mail acima primeiro.', 'info'); return; }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });
  if (error) {
    const resetMsgs = {
      'For security purposes, you can only request this once every 60 seconds': 'Por segurança, aguarde 60 segundos antes de solicitar novamente.',
      'email rate limit exceeded': 'Limite de e-mails atingido. Aguarde alguns minutos e tente novamente.'
    };
    showAuthMessage(resetMsgs[error.message] || error.message, 'error');
  } else {
    showAuthMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.', 'success');
  }
}

async function handleSetNewPassword() {
  if (!supabaseClient) return;
  const password = document.getElementById('auth-new-password').value;
  const confirm = document.getElementById('auth-new-password-confirm').value;

  if (!password || !confirm) { showAuthMessage('Preencha ambos os campos.', 'error'); return; }
  if (password.length < 6) { showAuthMessage('A senha deve ter pelo menos 6 caracteres.', 'error'); return; }
  if (password !== confirm) { showAuthMessage('As senhas não coincidem.', 'error'); return; }

  const btn = document.getElementById('auth-newpassword-btn');
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  const { error } = await supabaseClient.auth.updateUser({ password });

  btn.textContent = 'Salvar Nova Senha';
  btn.disabled = false;

  if (error) {
    showAuthMessage(error.message, 'error');
    return;
  }

  // Password updated — get current session and proceed
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadCloudData();
    onAuthSuccess();
    toast('Senha alterada com sucesso!');
  } else {
    toggleAuthForm('login', true);
    showAuthMessage('Senha alterada! Faça login com a nova senha.', 'success');
  }
}

async function handleLogout() {
  if (!supabaseClient) return;
  clearTimeout(syncTimeout);
  syncTimeout = null;
  // Reset process wizard state
  processItem = null;
  processStep = 'start';
  processActionText = '';
  processProjectId = null;
  // Hide welcome overlay if visible
  document.getElementById('welcome-overlay').style.display = 'none';
  // Close any open modals/quick capture
  closeQuickCapture();
  if (document.getElementById('modal-overlay').classList.contains('open')) closeModal();
  await supabaseClient.auth.signOut();
  currentUser = null;
  localStorage.removeItem('gtd-data');
  data = { inbox:[], actions:[], projects:[], calendar:[], waiting:[], someday:[], reference:[], contexts:[...DEFAULT_CONTEXTS], reviewState:{}, completedToday:0, lastDate:new Date().toDateString() };
  document.getElementById('auth-overlay').style.display = 'flex';
  document.getElementById('user-info').style.display = 'none';
  hideAuthMessage();
}

function removeSessionPreload() {
  const sp = document.getElementById('session-preload');
  if (sp) sp.remove();
}

function onAuthSuccess() {
  removeSessionPreload();
  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('app-container').style.display = '';
  updateUserInfo();
  navigateTo('dashboard');
  showWelcomeIfNeeded();
  requestNotificationPermission();
}

function updateUserInfo() {
  if (!currentUser) return;
  const name = currentUser.user_metadata?.name || currentUser.email;
  document.getElementById('user-display-name').textContent = name;
  document.getElementById('user-info').style.display = 'flex';
}

// ==========================================================================
// CLOUD SYNC (Supabase)
// ==========================================================================

let syncTimeout = null;
let syncIndicatorTimeout = null;

function scheduleCloudSync() {
  if (!supabaseClient || !currentUser) return;
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(syncToCloud, 1500);
}

async function syncToCloud() {
  if (!supabaseClient || !currentUser) return;
  showSyncStatus('syncing', 'Sincronizando...');
  try {
    const { error } = await supabaseClient
      .from('user_data')
      .upsert({
        user_id: currentUser.id,
        data: data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;
    showSyncStatus('saved', 'Salvo na nuvem');
  } catch(e) {
    showSyncStatus('error', 'Erro ao sincronizar');
  }
}

async function loadCloudData() {
  if (!supabaseClient || !currentUser) return;
  try {
    const { data: row, error } = await supabaseClient
      .from('user_data')
      .select('data')
      .eq('user_id', currentUser.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (row && row.data) {
      // Skip old encrypted data (E2E removed) — start fresh from local
      if (row.data._encrypted) {
        const localData = localStorage.getItem('gtd-data');
        if (localData) data = JSON.parse(localData);
        await syncToCloud();
      } else {
        data = row.data;
      }
      // Ensure all fields exist (in case of old data format)
      if (!Array.isArray(data.inbox)) data.inbox = [];
      if (!Array.isArray(data.actions)) data.actions = [];
      if (!Array.isArray(data.projects)) data.projects = [];
      if (!Array.isArray(data.calendar)) data.calendar = [];
      if (!Array.isArray(data.waiting)) data.waiting = [];
      if (!Array.isArray(data.someday)) data.someday = [];
      if (!Array.isArray(data.reference)) data.reference = [];
      if (!data.contexts) data.contexts = [...DEFAULT_CONTEXTS];
      if (!data.reviewState) data.reviewState = {};
      if (data.completedToday === undefined) data.completedToday = 0;
      if (!data.lastDate) data.lastDate = new Date().toDateString();
      localStorage.setItem('gtd-data', JSON.stringify(data));
    } else {
      // No cloud data yet — check if there's local data to migrate
      const localData = localStorage.getItem('gtd-data');
      if (localData) {
        data = JSON.parse(localData);
      }
      // Save current data to cloud
      await syncToCloud();
    }
  } catch(e) {
    // Offline or error — use local data
    data = loadData();
    showSyncStatus('error', 'Offline — usando dados locais');
  }

  // Reset daily counter if needed
  if (data.lastDate !== new Date().toDateString()) {
    data.completedToday = 0;
    data.lastDate = new Date().toDateString();
    saveData();
  }
}

function showSyncStatus(type, text) {
  const el = document.getElementById('sync-indicator');
  const textEl = document.getElementById('sync-text');
  el.className = 'sync-indicator ' + type;
  textEl.textContent = text;
  el.style.display = 'flex';
  clearTimeout(syncIndicatorTimeout);
  if (type !== 'syncing') {
    syncIndicatorTimeout = setTimeout(() => el.style.display = 'none', 2500);
  }
}

// ==========================================================================
// INIT
// ==========================================================================

updateShortcutHints();

// If session preload is active, render dashboard immediately so cards aren't empty
if (__hasSession) {
  try { renderDashboard(); updateBadges(); } catch(e) { console.error('preload render:', e); }
}

(async function initApp() {
  if (!SUPABASE_CONFIGURED) {
    // Local-only mode (Supabase not configured in code)
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = '';
    navigateTo('dashboard');
    showWelcomeIfNeeded();
    requestNotificationPermission();
    return;
  }
  if (!supabaseClient) {
    removeSessionPreload();
    document.getElementById('auth-overlay').style.display = 'flex';
    showAuthMessage('Erro ao carregar. Verifique sua conexão e recarregue a página.', 'error');
    return;
  }

  // Detect recovery flow from URL
  const isRecoveryFlow = window.location.hash.includes('type=recovery');

  // Check existing session (with 5s timeout to prevent hangs on Safari iOS)
  let session = null;
  try {
    const { data } = await Promise.race([
      supabaseClient.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('getSession timeout')), 5000))
    ]);
    session = data?.session;
  } catch (e) {
    console.error('getSession error:', e);
    // Fallback: try to parse session from localStorage if getSession timed out
    try {
      const storedSession = JSON.parse(localStorage.getItem('sb-cxnziboaviahmfcajqcz-auth-token'));
      if (storedSession && storedSession.user) {
        session = storedSession;
        console.log('Using localStorage session fallback');
      }
    } catch(e2) {}
  }
  if (session && !isRecoveryFlow) {
    currentUser = session.user;
    await loadCloudData();
    onAuthSuccess();
  } else {
    // No session or recovery flow — remove preload and show login
    removeSessionPreload();
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
  }

  // Register auth listener AFTER init to avoid race conditions
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      toggleAuthForm('newpassword');
      document.getElementById('auth-overlay').style.display = 'flex';
      showAuthMessage('Digite sua nova senha abaixo.', 'info');
    } else if (event === 'SIGNED_IN' && session && !currentUser && !loginInProgress) {
      currentUser = session.user;
      await loadCloudData();
      onAuthSuccess();
    } else if (event === 'SIGNED_OUT') {
      if (!currentUser) return;
      currentUser = null;
      clearTimeout(syncTimeout);
      syncTimeout = null;
      localStorage.removeItem('gtd-data');
      data = { inbox:[], actions:[], projects:[], calendar:[], waiting:[], someday:[], reference:[], contexts:[...DEFAULT_CONTEXTS], reviewState:{}, completedToday:0, lastDate:new Date().toDateString() };
      // Reset process wizard state
      processItem = null;
      processStep = 'start';
      processActionText = '';
      processProjectId = null;
      // Hide welcome overlay if visible
      document.getElementById('welcome-overlay').style.display = 'none';
      document.getElementById('auth-overlay').style.display = 'flex';
      document.getElementById('user-info').style.display = 'none';
    }
  });
})();
