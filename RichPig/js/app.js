/* ========================================================
   Rich Pig Finanças - Aplicação Principal (app.js)
   Navegação de Abas, Cabeçalho, Modo Claro/Escuro, Modais e Toasts
   ======================================================== */

let currentTab = 'dashboard';
let activeEditingId = null;

/**
 * Inicialização ao carregar a página
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Carrega Estado
  window.RichPigState.loadState();
  const state = window.RichPigState.getState();

  // 2. Aplica Tema (Claro / Escuro)
  applyTheme(state.settings.theme || 'light');

  // 3. Inicializa Segurança (Lock Screen se tiver senha)
  window.RichPigSecurity.initSecurity();

  // 4. Atualiza Cabeçalho
  updateHeaderBalance();

  // 5. Configura Listeners de Navegação e Botões
  setupEventListeners();

  // 6. Renderiza Aba Inicial (Dashboard)
  switchTab('dashboard');

  // 7. Renderiza Simulador inicial de investimentos
  window.RichPigInvestments.runSimulatorUI();
});

/**
 * Aplica Tema Claro ou Escuro
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) {
    themeBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    themeBtn.title = theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro';
  }

  const state = window.RichPigState.getState();
  if (state.settings.theme !== theme) {
    window.RichPigState.updateState({
      settings: { ...state.settings, theme }
    });
  }

  // Re-renderiza gráficos para adequar cores
  setTimeout(() => {
    window.RichPigCharts?.renderAllCharts();
  }, 100);
}

/**
 * Alterna entre Modo Claro e Escuro
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  showToast(`Modo ${next === 'dark' ? 'Escuro' : 'Claro'} ativado!`, 'info');
}

/**
 * Alterna Ocultar/Exibir Saldo por Privacidade (Olho aberto / fechado)
 */
function togglePrivacyMode() {
  const state = window.RichPigState.getState();
  const newMode = !state.settings.privacyMode;

  window.RichPigState.updateState({
    settings: {
      ...state.settings,
      privacyMode: newMode
    }
  });

  updateHeaderBalance();
  updateDashboardMetrics();

  showToast(newMode ? 'Saldo ocultado para sua privacidade.' : 'Saldo visível.', 'info');
}

/**
 * Atualiza o Saldo Atual no Cabeçalho (Verde para Positivo, Vermelho para Negativo)
 */
function updateHeaderBalance() {
  const state = window.RichPigState.getState();
  const balance = window.RichPigTransactions.calculateGlobalBalance();
  const isPrivate = state.settings.privacyMode;

  const amountEl = document.getElementById('header-balance-amount');
  const eyeBtn = document.getElementById('btn-toggle-privacy');

  if (amountEl) {
    if (isPrivate) {
      amountEl.textContent = 'R$ ••••••••';
      amountEl.className = 'balance-amount';
    } else {
      amountEl.textContent = formatCurrency(balance);
      // REQUISITO: Saldo Atual verde para saldo positivo, vermelho para saldo negativo
      amountEl.className = `balance-amount ${balance >= 0 ? 'positive' : 'negative'}`;
    }
  }

  if (eyeBtn) {
    // REQUISITO: icone de olho aberto ou fechado
    eyeBtn.innerHTML = isPrivate 
      ? '<span style="font-size: 1.15rem;">🙈</span>' 
      : '<span style="font-size: 1.15rem;">👁️</span>';
    eyeBtn.title = isPrivate ? 'Clique para mostrar saldo' : 'Clique para ocultar saldo por privacidade';
  }

  // Atualiza também o badge de cadeado de segurança no cabeçalho
  const lockBtn = document.getElementById('btn-header-lock');
  if (lockBtn) {
    lockBtn.innerHTML = state.settings.hasPassword ? '🔒' : '🔓';
    lockBtn.title = state.settings.hasPassword ? 'Clique para bloquear com senha' : 'Definir senha de acesso';
  }
}

/**
 * Navegação entre as Abas
 */
function switchTab(tabId) {
  currentTab = tabId;

  // Atualiza botões da barra de navegação
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  // Alterna painéis
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.style.display = pane.id === `tab-${tabId}` ? 'block' : 'none';
  });

  // Renderizações específicas de cada aba
  if (tabId === 'dashboard') {
    updateDashboardMetrics();
    renderUpcomingBills();
    renderRecentTransactions();
    window.RichPigCharts?.renderAllCharts();
  } else if (tabId === 'transactions') {
    populateCategorySelects();
    window.RichPigTransactions.renderTransactionsView();
  } else if (tabId === 'investments') {
    window.RichPigInvestments.renderInvestmentsView();
    window.RichPigCharts?.renderInvestmentsChart();
  } else if (tabId === 'loans') {
    window.RichPigLoans.renderLoansView();
    window.RichPigCharts?.renderLoansChart();
  } else if (tabId === 'settings') {
    renderSettingsView();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Atualiza os Cards de Métricas do Dashboard
 */
function updateDashboardMetrics() {
  const state = window.RichPigState.getState();
  const summary = window.RichPigTransactions.getTransactionsSummary();
  const invSummary = window.RichPigInvestments.getInvestmentsSummary();
  const loanSummary = window.RichPigLoans.getLoansSummary();
  const globalBalance = window.RichPigTransactions.calculateGlobalBalance();
  const isPrivate = state.settings.privacyMode;

  const mask = val => isPrivate ? 'R$ ••••••••' : formatCurrency(val);

  // 1. Saldo Geral
  const balEl = document.getElementById('dash-global-balance');
  if (balEl) {
    balEl.textContent = mask(globalBalance);
    balEl.className = `metric-value ${globalBalance >= 0 ? 'text-income' : 'text-expense'}`;
  }

  // 2. Receitas do Mês (Verde)
  const incEl = document.getElementById('dash-monthly-income');
  if (incEl) incEl.textContent = mask(summary.totalIncome);

  // 3. Despesas do Mês (Vermelho)
  const expEl = document.getElementById('dash-monthly-expense');
  if (expEl) expEl.textContent = mask(summary.totalExpense);

  // 4. Economia / Taxa de Poupança
  const savEl = document.getElementById('dash-savings-rate');
  const savAmtEl = document.getElementById('dash-savings-amount');
  if (savEl) savEl.textContent = `${summary.savingsRate.toFixed(1)}%`;
  if (savAmtEl) savAmtEl.textContent = isPrivate ? 'R$ ••••••••' : `${formatCurrency(summary.netBalance)} poupados`;

  // 5. Total Investido
  const invEl = document.getElementById('dash-invested-total');
  if (invEl) invEl.textContent = mask(invSummary.totalCurrent);

  // 6. Dívidas / Financiamentos
  const debtEl = document.getElementById('dash-debt-total');
  if (debtEl) debtEl.textContent = mask(loanSummary.totalDebt);

  // 7. Patrimônio Líquido Real (Saldo + Investimentos - Financiamentos)
  const netWorth = globalBalance + invSummary.totalCurrent - loanSummary.totalDebt;
  const nwEl = document.getElementById('dash-net-worth');
  if (nwEl) {
    nwEl.textContent = mask(netWorth);
    nwEl.className = `metric-value ${netWorth >= 0 ? 'text-income' : 'text-expense'}`;
  }
}

/**
 * Renderiza Despesas a Vencer nos Próximos 7 Dias no Dashboard
 */
function renderUpcomingBills() {
  const container = document.getElementById('dash-upcoming-bills');
  if (!container) return;

  const state = window.RichPigState.getState();
  const today = new Date();
  const in7Days = new Date();
  in7Days.setDate(today.getDate() + 7);

  const upcoming = state.transactions.filter(t => {
    if (t.type !== 'expense' || t.status === 'paid') return false;
    const tDate = new Date(t.date + 'T12:00:00');
    return tDate >= today && tDate <= in7Days;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  if (upcoming.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem;">
        🎉 Nenhuma conta vencendo nos próximos 7 dias! Tudo em dia.
      </div>
    `;
    return;
  }

  let html = '';
  upcoming.slice(0, 4).forEach(tx => {
    html += `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.2rem;">⚠️</span>
          <div>
            <div class="font-bold text-sm">${escapeHtml(tx.description)}</div>
            <div class="text-xs text-secondary">Vence em: ${formatDisplayDate(tx.date)}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="font-bold text-expense text-sm">${formatCurrency(tx.amount)}</span>
          <button class="btn btn-secondary text-xs" style="padding: 0.3rem 0.6rem;" onclick="RichPigTransactions.toggleTransactionStatus('${tx.id}')">
            Pagar
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Renderiza as últimas 5 transações no Dashboard
 */
function renderRecentTransactions() {
  const container = document.getElementById('dash-recent-transactions');
  if (!container) return;

  const state = window.RichPigState.getState();
  const recents = [...state.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (recents.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem;">
        Nenhuma transação recente encontrada.
      </div>
    `;
    return;
  }

  let html = '';
  recents.forEach(t => {
    const isIncome = t.type === 'income';
    html += `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.1rem;">${isIncome ? '🟢' : '🔴'}</span>
          <div>
            <div class="font-bold text-sm">${escapeHtml(t.description)}</div>
            <div class="text-xs text-secondary">${formatDisplayDate(t.date)} • ${escapeHtml(t.paymentMethod || 'Geral')}</div>
          </div>
        </div>
        <div class="font-bold text-sm ${isIncome ? 'text-income' : 'text-expense'}">
          ${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Preenche os selects de categorias nos modais
 */
function populateCategorySelects() {
  const state = window.RichPigState.getState();
  const select = document.getElementById('modal-tx-category');
  const filterSelect = document.getElementById('filter-tx-category');
  if (!select) return;

  const currentType = document.getElementById('modal-tx-type').value;
  const list = currentType === 'income' ? state.categories.income : state.categories.expense;

  select.innerHTML = list.map(c => `
    <option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>
  `).join('');

  if (filterSelect) {
    const allCategories = [...state.categories.income, ...state.categories.expense];
    filterSelect.innerHTML = `<option value="all">Todas as Categorias</option>` + allCategories.map(c => `
      <option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>
    `).join('');
  }
}

/**
 * MODAL DE LANÇAMENTOS (NOVO / EDITAR)
 */
function openTransactionModal(type = 'expense') {
  activeEditingId = null;
  document.getElementById('modal-tx-title').textContent = type === 'income' ? 'Nova Receita' : 'Nova Despesa';
  document.getElementById('modal-tx-id').value = '';
  document.getElementById('modal-tx-desc').value = '';
  document.getElementById('modal-tx-amount').value = '';
  document.getElementById('modal-tx-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('modal-tx-notes').value = '';
  document.getElementById('modal-tx-status').value = 'paid';

  // Configura tipo
  setModalTransactionType(type);

  // Reseta recorrência
  const recCheck = document.getElementById('modal-tx-recurring-check');
  if (recCheck) {
    recCheck.checked = false;
    toggleRecurrencePanel(false);
  }

  openModal('modal-transaction');
}

function openEditTransactionModal(id) {
  const state = window.RichPigState.getState();
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;

  activeEditingId = id;
  document.getElementById('modal-tx-title').textContent = 'Editar Lançamento';
  document.getElementById('modal-tx-id').value = tx.id;
  document.getElementById('modal-tx-desc').value = tx.description;
  document.getElementById('modal-tx-amount').value = tx.amount;
  document.getElementById('modal-tx-date').value = tx.date;
  document.getElementById('modal-tx-notes').value = tx.notes || '';
  document.getElementById('modal-tx-method').value = tx.paymentMethod || 'Conta Corrente';
  document.getElementById('modal-tx-status').value = tx.status || 'paid';

  setModalTransactionType(tx.type);
  document.getElementById('modal-tx-category').value = tx.category;

  // Em edição, oculta campos de nova recorrência para segurança
  const recCheck = document.getElementById('modal-tx-recurring-check');
  if (recCheck) {
    recCheck.checked = false;
    toggleRecurrencePanel(false);
  }

  openModal('modal-transaction');
}

function setModalTransactionType(type) {
  document.getElementById('modal-tx-type').value = type;
  const btnIncome = document.getElementById('btn-type-income');
  const btnExpense = document.getElementById('btn-type-expense');

  if (type === 'income') {
    btnIncome.className = 'type-toggle-btn active-income';
    btnExpense.className = 'type-toggle-btn';
  } else {
    btnIncome.className = 'type-toggle-btn';
    btnExpense.className = 'type-toggle-btn active-expense';
  }

  populateCategorySelects();
}

function toggleRecurrencePanel(show) {
  const panel = document.getElementById('modal-tx-recurrence-panel');
  if (panel) {
    panel.style.display = show ? 'block' : 'none';
  }
}

/**
 * Salva Lançamento vindo do Modal
 */
function handleSaveTransaction() {
  const id = document.getElementById('modal-tx-id').value;
  const type = document.getElementById('modal-tx-type').value;
  const desc = document.getElementById('modal-tx-desc').value;
  const amount = document.getElementById('modal-tx-amount').value;
  const category = document.getElementById('modal-tx-category').value;
  const date = document.getElementById('modal-tx-date').value;
  const method = document.getElementById('modal-tx-method').value;
  const status = document.getElementById('modal-tx-status').value;
  const notes = document.getElementById('modal-tx-notes').value;

  const isRecurring = document.getElementById('modal-tx-recurring-check')?.checked;
  const recurrenceMonths = document.getElementById('modal-tx-recurrence-months')?.value;
  const recurrenceMode = document.getElementById('modal-tx-recurrence-mode')?.value;

  try {
    if (id) {
      // Edição
      window.RichPigTransactions.updateTransaction(id, {
        description: desc,
        amount: amount,
        type: type,
        category: category,
        date: date,
        paymentMethod: method,
        status: status,
        notes: notes
      });
      showToast('Lançamento atualizado com sucesso!', 'success');
    } else {
      // Novo Lançamento (com opção de repetição por até 36 meses!)
      window.RichPigTransactions.addTransaction({
        description: desc,
        amount: amount,
        type: type,
        category: category,
        date: date,
        paymentMethod: method,
        status: status,
        notes: notes,
        isRecurring: isRecurring,
        recurrenceMonths: recurrenceMonths,
        recurrenceMode: recurrenceMode
      });
      showToast(isRecurring 
        ? `Lançamento criado e programado por ${recurrenceMonths} meses! 🐷` 
        : 'Lançamento adicionado com sucesso! 🎉', 'success');
    }

    closeModal('modal-transaction');
    window.RichPigTransactions.renderTransactionsView();
    updateHeaderBalance();
    updateDashboardMetrics();
    window.RichPigCharts?.renderAllCharts();
  } catch (err) {
    alert(err.message);
  }
}

/**
 * MODAL DE INVESTIMENTO
 */
function openInvestmentModal() {
  document.getElementById('modal-inv-id').value = '';
  document.getElementById('modal-inv-name').value = '';
  document.getElementById('modal-inv-amount').value = '';
  document.getElementById('modal-inv-current').value = '';
  document.getElementById('modal-inv-return').value = '';
  document.getElementById('modal-inv-inst').value = '';
  document.getElementById('modal-inv-notes').value = '';
  openModal('modal-investment');
}

function openEditInvestmentModal(id) {
  const state = window.RichPigState.getState();
  const inv = state.investments.find(i => i.id === id);
  if (!inv) return;

  document.getElementById('modal-inv-id').value = inv.id;
  document.getElementById('modal-inv-name').value = inv.name;
  document.getElementById('modal-inv-type').value = inv.type;
  document.getElementById('modal-inv-amount').value = inv.investedAmount;
  document.getElementById('modal-inv-current').value = inv.currentAmount;
  document.getElementById('modal-inv-return').value = inv.expectedReturn || '';
  document.getElementById('modal-inv-inst').value = inv.institution || '';
  document.getElementById('modal-inv-notes').value = inv.notes || '';
  openModal('modal-investment');
}

function handleSaveInvestment() {
  const id = document.getElementById('modal-inv-id').value;
  const name = document.getElementById('modal-inv-name').value;
  const type = document.getElementById('modal-inv-type').value;
  const amount = document.getElementById('modal-inv-amount').value;
  const current = document.getElementById('modal-inv-current').value || amount;
  const ret = document.getElementById('modal-inv-return').value;
  const inst = document.getElementById('modal-inv-inst').value;
  const notes = document.getElementById('modal-inv-notes').value;

  try {
    if (id) {
      window.RichPigInvestments.updateInvestment(id, {
        name, type, investedAmount: amount, currentAmount: current, expectedReturn: ret, institution: inst, notes
      });
      showToast('Investimento atualizado!', 'success');
    } else {
      window.RichPigInvestments.addInvestment({
        name, type, investedAmount: amount, currentAmount: current, expectedReturn: ret, institution: inst, notes
      });
      showToast('Novo investimento adicionado à carteira! 📈', 'success');
    }
    closeModal('modal-investment');
    window.RichPigInvestments.renderInvestmentsView();
    window.RichPigCharts?.renderInvestmentsChart();
    updateDashboardMetrics();
  } catch (err) {
    alert(err.message);
  }
}

/**
 * MODAL DE FINANCIAMENTO
 */
function openLoanModal() {
  document.getElementById('modal-loan-id').value = '';
  document.getElementById('modal-loan-name').value = '';
  document.getElementById('modal-loan-initial').value = '';
  document.getElementById('modal-loan-rate').value = '';
  document.getElementById('modal-loan-total-inst').value = '360';
  document.getElementById('modal-loan-paid-inst').value = '0';
  document.getElementById('modal-loan-inst-val').value = '';
  document.getElementById('modal-loan-balance').value = '';
  document.getElementById('modal-loan-notes').value = '';
  openModal('modal-loan');
}

function openEditLoanModal(id) {
  const state = window.RichPigState.getState();
  const loan = state.loans.find(l => l.id === id);
  if (!loan) return;

  document.getElementById('modal-loan-id').value = loan.id;
  document.getElementById('modal-loan-name').value = loan.name;
  document.getElementById('modal-loan-type').value = loan.type;
  document.getElementById('modal-loan-system').value = loan.system;
  document.getElementById('modal-loan-initial').value = loan.initialAmount;
  document.getElementById('modal-loan-rate').value = loan.interestRateAnnual;
  document.getElementById('modal-loan-total-inst').value = loan.totalInstallments;
  document.getElementById('modal-loan-paid-inst').value = loan.paidInstallments;
  document.getElementById('modal-loan-inst-val').value = loan.installmentValue;
  document.getElementById('modal-loan-balance').value = loan.outstandingBalance;
  document.getElementById('modal-loan-due').value = loan.dueDay || 10;
  document.getElementById('modal-loan-notes').value = loan.notes || '';
  openModal('modal-loan');
}

function handleSaveLoan() {
  const id = document.getElementById('modal-loan-id').value;
  const name = document.getElementById('modal-loan-name').value;
  const type = document.getElementById('modal-loan-type').value;
  const system = document.getElementById('modal-loan-system').value;
  const initial = document.getElementById('modal-loan-initial').value;
  const rate = document.getElementById('modal-loan-rate').value;
  const totalInst = document.getElementById('modal-loan-total-inst').value;
  const paidInst = document.getElementById('modal-loan-paid-inst').value;
  const instVal = document.getElementById('modal-loan-inst-val').value;
  const balance = document.getElementById('modal-loan-balance').value;
  const due = document.getElementById('modal-loan-due').value;
  const notes = document.getElementById('modal-loan-notes').value;

  try {
    if (id) {
      window.RichPigLoans.updateLoan(id, {
        name, type, system, initialAmount: initial, interestRateAnnual: rate,
        totalInstallments: totalInst, paidInstallments: paidInst, installmentValue: instVal,
        outstandingBalance: balance, dueDay: due, notes
      });
      showToast('Financiamento atualizado!', 'success');
    } else {
      window.RichPigLoans.addLoan({
        name, type, system, initialAmount: initial, interestRateAnnual: rate,
        totalInstallments: totalInst, paidInstallments: paidInst, installmentValue: instVal,
        outstandingBalance: balance, dueDay: due, notes
      });
      showToast('Financiamento cadastrado com sucesso! 🏦', 'success');
    }
    closeModal('modal-loan');
    window.RichPigLoans.renderLoansView();
    window.RichPigCharts?.renderLoansChart();
    updateDashboardMetrics();
  } catch (err) {
    alert(err.message);
  }
}

/**
 * ABA DE CONFIGURAÇÕES E SEGURANÇA
 */
function renderSettingsView() {
  const state = window.RichPigState.getState();
  const pwdStatusEl = document.getElementById('settings-password-status');
  if (pwdStatusEl) {
    pwdStatusEl.textContent = state.settings.hasPassword 
      ? '✅ Proteção por senha ATIVA' 
      : '⚠️ Nenhuma senha definida (Acesso livre)';
    pwdStatusEl.className = `font-bold ${state.settings.hasPassword ? 'text-income' : 'text-gold'}`;
  }
}

async function handleSaveNewPassword() {
  const pass = document.getElementById('settings-new-password')?.value;
  const confirm = document.getElementById('settings-confirm-password')?.value;
  const hint = document.getElementById('settings-password-hint')?.value;

  if (!pass || pass.length < 4) {
    alert('A senha deve ter pelo menos 4 caracteres.');
    return;
  }

  if (pass !== confirm) {
    alert('A confirmação de senha não confere.');
    return;
  }

  try {
    await window.RichPigSecurity.setPassword(pass, hint);
    document.getElementById('settings-new-password').value = '';
    document.getElementById('settings-confirm-password').value = '';
    document.getElementById('settings-password-hint').value = '';
    renderSettingsView();
    updateHeaderBalance();
    showToast('Senha de acesso definida com sucesso! 🔒', 'success');
  } catch (err) {
    alert(err.message);
  }
}

async function handleRemovePassword() {
  const current = prompt('Digite sua senha atual para desativar a proteção:');
  if (current === null) return;

  try {
    await window.RichPigSecurity.removePassword(current);
    renderSettingsView();
    updateHeaderBalance();
    showToast('Proteção por senha removida.', 'info');
  } catch (err) {
    alert('Erro: ' + err.message);
  }
}

/**
 * Carrega Dados de Exemplo (Sample Data)
 */
function handleLoadSampleData() {
  if (confirm('Deseja carregar dados de exemplo realistas? Seus dados atuais serão complementados.')) {
    window.RichPigState.seedSampleData();
    refreshAllViews();
    showToast('Dados de demonstração carregados com sucesso! 🐷🎉', 'success');
  }
}

/**
 * Limpa todos os dados
 */
function handleResetAllData() {
  if (confirm('ATENÇÃO: Deseja realmente apagar TODOS os seus lançamentos, investimentos e financiamentos?\n\nEsta ação não poderá ser desfeita.')) {
    window.RichPigState.resetAllData();
    refreshAllViews();
    showToast('Aplicação resetada para os padrões limpos.', 'info');
  }
}

/**
 * Atualiza todas as visões da aplicação
 */
function refreshAllViews() {
  updateHeaderBalance();
  updateDashboardMetrics();
  renderUpcomingBills();
  renderRecentTransactions();
  window.RichPigTransactions.renderTransactionsView();
  window.RichPigInvestments.renderInvestmentsView();
  window.RichPigLoans.renderLoansView();
  window.RichPigCharts?.renderAllCharts();
  renderSettingsView();
}

/**
 * Utilitários de Modais
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

/**
 * Sistema de Notificações Toast
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  else if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Formata valor monetário no padrão Real Brasileiro (R$)
 */
function formatCurrency(val) {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Configura Ouvintes de Eventos Globais
 */
function setupEventListeners() {
  // Tabs
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  // Tema & Privacidade
  document.getElementById('btn-toggle-theme')?.addEventListener('click', toggleTheme);
  document.getElementById('btn-toggle-privacy')?.addEventListener('click', togglePrivacyMode);
  document.getElementById('btn-header-lock')?.addEventListener('click', () => {
    window.RichPigSecurity.lockApp();
  });

  // Fechar modais ao clicar no fundo
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  // Lock Screen input Enter key
  const lockInput = document.getElementById('lock-password-input');
  if (lockInput) {
    lockInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        window.RichPigSecurity.tryUnlock(lockInput.value);
      }
    });
  }

  // Recorrência Checkbox Listener
  const recCheck = document.getElementById('modal-tx-recurring-check');
  if (recCheck) {
    recCheck.addEventListener('change', () => {
      toggleRecurrencePanel(recCheck.checked);
    });
  }

  // Recorrência Slider vs Input Sync
  const recSlider = document.getElementById('modal-tx-recurrence-months');
  const recDisplay = document.getElementById('modal-tx-recurrence-months-val');
  if (recSlider && recDisplay) {
    recSlider.addEventListener('input', () => {
      recDisplay.textContent = `${recSlider.value} meses`;
    });
  }

  // Filtros de Lançamentos
  const searchInput = document.getElementById('tx-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      window.RichPigTransactions.currentFilter.searchTerm = searchInput.value;
      window.RichPigTransactions.renderTransactionsView();
    });
  }

  const filterType = document.getElementById('filter-tx-type');
  if (filterType) {
    filterType.addEventListener('change', () => {
      window.RichPigTransactions.currentFilter.type = filterType.value;
      window.RichPigTransactions.renderTransactionsView();
    });
  }

  const filterCat = document.getElementById('filter-tx-category');
  if (filterCat) {
    filterCat.addEventListener('change', () => {
      window.RichPigTransactions.currentFilter.category = filterCat.value;
      window.RichPigTransactions.renderTransactionsView();
    });
  }

  const filterStatus = document.getElementById('filter-tx-status');
  if (filterStatus) {
    filterStatus.addEventListener('change', () => {
      window.RichPigTransactions.currentFilter.status = filterStatus.value;
      window.RichPigTransactions.renderTransactionsView();
    });
  }

  const filterSort = document.getElementById('filter-tx-sort');
  if (filterSort) {
    filterSort.addEventListener('change', () => {
      window.RichPigTransactions.currentFilter.sortBy = filterSort.value;
      window.RichPigTransactions.renderTransactionsView();
    });
  }
}

// Expõe para o escopo global
window.RichPigApp = {
  switchTab,
  applyTheme,
  toggleTheme,
  togglePrivacyMode,
  updateHeaderBalance,
  updateDashboardMetrics,
  refreshAllViews,
  openModal,
  closeModal,
  openTransactionModal,
  openEditTransactionModal,
  handleSaveTransaction,
  setModalTransactionType,
  openInvestmentModal,
  openEditInvestmentModal,
  handleSaveInvestment,
  openLoanModal,
  openEditLoanModal,
  handleSaveLoan,
  handleSaveNewPassword,
  handleRemovePassword,
  handleLoadSampleData,
  handleResetAllData,
  showToast,
  formatCurrency,
  formatDisplayDate
};
