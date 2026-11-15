/* ========================================================
   Rich Pig Finanças - Módulo de Lançamentos (transactions.js)
   Receitas (Verde) e Despesas (Vermelho), Recorrência até 36 meses
   ======================================================== */

let currentFilter = {
  month: new Date().getMonth(), // 0 a 11
  year: new Date().getFullYear(),
  viewAllMonths: false,
  type: 'all', // 'all' | 'income' | 'expense'
  category: 'all',
  status: 'all', // 'all' | 'paid' | 'pending'
  searchTerm: '',
  sortBy: 'date_desc' // 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'
};

/**
 * Adiciona um ou múltiplos lançamentos (com suporte a repetição por até 36 meses)
 */
function addTransaction(data) {
  const state = window.RichPigState.getState();
  const transactions = [...state.transactions];

  const baseAmount = parseFloat(data.amount);
  if (isNaN(baseAmount) || baseAmount <= 0) {
    throw new Error('Informe um valor válido maior que zero.');
  }

  if (!data.description || !data.description.trim()) {
    throw new Error('Informe uma descrição para o lançamento.');
  }

  const isRecurring = Boolean(data.isRecurring);
  const recurrenceMonths = isRecurring ? Math.min(36, Math.max(2, parseInt(data.recurrenceMonths, 10) || 12)) : 1;
  const recurrenceMode = data.recurrenceMode || 'fixed'; // 'fixed' (repete valor) ou 'installment' (divide valor)
  const frequency = data.frequency || 'monthly'; // 'monthly', 'biweekly', 'weekly', 'yearly'

  if (isRecurring && recurrenceMonths > 1) {
    const recurrenceId = window.RichPigState.generateId('rec');
    const parcelValue = recurrenceMode === 'installment' 
      ? Math.round((baseAmount / recurrenceMonths) * 100) / 100 
      : baseAmount;

    const baseDate = new Date(data.date + 'T12:00:00');

    for (let i = 1; i <= recurrenceMonths; i++) {
      const itemDate = new Date(baseDate);

      if (frequency === 'monthly') {
        itemDate.setMonth(baseDate.getMonth() + (i - 1));
      } else if (frequency === 'biweekly') {
        itemDate.setDate(baseDate.getDate() + ((i - 1) * 14));
      } else if (frequency === 'weekly') {
        itemDate.setDate(baseDate.getDate() + ((i - 1) * 7));
      } else if (frequency === 'yearly') {
        itemDate.setFullYear(baseDate.getFullYear() + (i - 1));
      }

      const yyyy = itemDate.getFullYear();
      const mm = String(itemDate.getMonth() + 1).padStart(2, '0');
      const dd = String(itemDate.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;

      const installmentSuffix = ` (${String(i).padStart(2, '0')}/${String(recurrenceMonths).padStart(2, '0')})`;
      const cleanDesc = data.description.trim().replace(/\s\(\d+\/\d+\)$/, '');

      transactions.push({
        id: window.RichPigState.generateId('tx'),
        description: `${cleanDesc}${installmentSuffix}`,
        amount: parcelValue,
        type: data.type, // 'income' ou 'expense'
        category: data.category,
        date: dateString,
        paymentMethod: data.paymentMethod || 'Conta Corrente',
        status: i === 1 ? (data.status || 'paid') : 'pending', // Primeira pode estar paga, futuras pendentes
        notes: data.notes || '',
        recurrenceId: recurrenceId,
        recurrenceIndex: i,
        recurrenceTotal: recurrenceMonths
      });
    }
  } else {
    // Lançamento Único (Sem repetição)
    transactions.push({
      id: window.RichPigState.generateId('tx'),
      description: data.description.trim(),
      amount: baseAmount,
      type: data.type,
      category: data.category,
      date: data.date,
      paymentMethod: data.paymentMethod || 'Conta Corrente',
      status: data.status || 'paid',
      notes: data.notes || ''
    });
  }

  window.RichPigState.updateState({ transactions });
  return true;
}

/**
 * Atualiza um lançamento existente
 */
function updateTransaction(id, updatedData) {
  const state = window.RichPigState.getState();
  const index = state.transactions.findIndex(t => t.id === id);
  if (index === -1) throw new Error('Lançamento não encontrado.');

  const transactions = [...state.transactions];
  transactions[index] = {
    ...transactions[index],
    ...updatedData,
    amount: parseFloat(updatedData.amount) || transactions[index].amount
  };

  window.RichPigState.updateState({ transactions });
  return true;
}

/**
 * Exclui um lançamento (com suporte a excluir série inteira se recorrente)
 */
function deleteTransaction(id, deleteAllRecurring = false) {
  const state = window.RichPigState.getState();
  const target = state.transactions.find(t => t.id === id);
  if (!target) return;

  let transactions;
  if (deleteAllRecurring && target.recurrenceId) {
    transactions = state.transactions.filter(t => t.recurrenceId !== target.recurrenceId);
  } else {
    transactions = state.transactions.filter(t => t.id !== id);
  }

  window.RichPigState.updateState({ transactions });
}

/**
 * Alterna status entre Pago e Pendente
 */
function toggleTransactionStatus(id) {
  const state = window.RichPigState.getState();
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;

  const newStatus = tx.status === 'paid' ? 'pending' : 'paid';
  updateTransaction(id, { status: newStatus });
}

/**
 * Filtra e ordena as transações com base nos filtros atuais
 */
function getFilteredTransactions() {
  const state = window.RichPigState.getState();
  let list = [...state.transactions];

  // Filtro de Mês/Ano
  if (!currentFilter.viewAllMonths) {
    list = list.filter(t => {
      const parts = t.date.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      return y === currentFilter.year && m === currentFilter.month;
    });
  }

  // Filtro de Tipo (income / expense)
  if (currentFilter.type !== 'all') {
    list = list.filter(t => t.type === currentFilter.type);
  }

  // Filtro de Categoria
  if (currentFilter.category !== 'all') {
    list = list.filter(t => t.category === currentFilter.category);
  }

  // Filtro de Status
  if (currentFilter.status !== 'all') {
    list = list.filter(t => t.status === currentFilter.status);
  }

  // Busca textual
  if (currentFilter.searchTerm.trim()) {
    const term = currentFilter.searchTerm.toLowerCase().trim();
    list = list.filter(t => 
      t.description.toLowerCase().includes(term) ||
      (t.notes && t.notes.toLowerCase().includes(term)) ||
      (t.paymentMethod && t.paymentMethod.toLowerCase().includes(term)) ||
      t.amount.toString().includes(term)
    );
  }

  // Ordenação
  list.sort((a, b) => {
    if (currentFilter.sortBy === 'date_desc') return new Date(b.date) - new Date(a.date);
    if (currentFilter.sortBy === 'date_asc') return new Date(a.date) - new Date(b.date);
    if (currentFilter.sortBy === 'amount_desc') return b.amount - a.amount;
    if (currentFilter.sortBy === 'amount_asc') return a.amount - b.amount;
    return 0;
  });

  return list;
}

/**
 * Calcula totais com base na lista filtrada ou no mês
 */
function getTransactionsSummary(filterOptions = null) {
  const filter = filterOptions || currentFilter;
  const state = window.RichPigState.getState();
  
  let list = state.transactions;
  if (!filter.viewAllMonths) {
    list = list.filter(t => {
      const parts = t.date.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      return y === filter.year && m === filter.month;
    });
  }

  let totalIncome = 0;
  let totalExpense = 0;
  let paidIncome = 0;
  let paidExpense = 0;
  let pendingIncome = 0;
  let pendingExpense = 0;

  list.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
      if (t.status === 'paid') paidIncome += amt;
      else pendingIncome += amt;
    } else {
      totalExpense += amt;
      if (t.status === 'paid') paidExpense += amt;
      else pendingExpense += amt;
    }
  });

  const netBalance = totalIncome - totalExpense;
  const effectiveBalance = paidIncome - paidExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  return {
    totalIncome,
    totalExpense,
    netBalance,
    effectiveBalance,
    savingsRate,
    paidIncome,
    paidExpense,
    pendingIncome,
    pendingExpense,
    count: list.length
  };
}

/**
 * Calcula o saldo total global de todos os tempos (ou até a data atual)
 */
function calculateGlobalBalance() {
  const state = window.RichPigState.getState();
  let balance = 0;
  state.transactions.forEach(t => {
    // Contabiliza transações pagas ou todas
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'income') {
      balance += amt;
    } else {
      balance -= amt;
    }
  });
  return balance;
}

/**
 * Atualiza o filtro de data (navegação de meses)
 */
function setMonthFilter(delta) {
  if (delta === 0) {
    // Mês Atual
    currentFilter.month = new Date().getMonth();
    currentFilter.year = new Date().getFullYear();
    currentFilter.viewAllMonths = false;
  } else {
    currentFilter.viewAllMonths = false;
    let newMonth = currentFilter.month + delta;
    if (newMonth > 11) {
      currentFilter.month = 0;
      currentFilter.year += 1;
    } else if (newMonth < 0) {
      currentFilter.month = 11;
      currentFilter.year -= 1;
    } else {
      currentFilter.month = newMonth;
    }
  }
  renderTransactionsView();
  window.RichPigApp?.updateHeaderBalance();
}

/**
 * Alterna visualização para ver todos os meses
 */
function toggleViewAllMonths() {
  currentFilter.viewAllMonths = !currentFilter.viewAllMonths;
  renderTransactionsView();
}

/**
 * Renderiza a lista de lançamentos na interface
 */
function renderTransactionsView() {
  const container = document.getElementById('transactions-list-container');
  if (!container) return;

  const filtered = getFilteredTransactions();
  const summary = getTransactionsSummary();
  const state = window.RichPigState.getState();

  // Atualiza controles de mês no topo
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const labelEl = document.getElementById('current-month-display');
  if (labelEl) {
    labelEl.textContent = currentFilter.viewAllMonths 
      ? 'Todos os Meses' 
      : `${monthNames[currentFilter.month]} de ${currentFilter.year}`;
  }

  // Atualiza cards de resumo de lançamentos
  const incEl = document.getElementById('tx-summary-income');
  const expEl = document.getElementById('tx-summary-expense');
  const balEl = document.getElementById('tx-summary-balance');
  
  if (incEl) incEl.textContent = window.RichPigApp.formatCurrency(summary.totalIncome);
  if (expEl) expEl.textContent = window.RichPigApp.formatCurrency(summary.totalExpense);
  if (balEl) {
    balEl.textContent = window.RichPigApp.formatCurrency(summary.netBalance);
    balEl.className = `metric-value ${summary.netBalance >= 0 ? 'text-income' : 'text-expense'}`;
  }

  // Se vazio
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🐷</div>
        <h3 class="font-bold text-lg" style="margin-bottom: 0.25rem;">Nenhum lançamento encontrado</h3>
        <p class="text-secondary text-sm" style="margin-bottom: 1.25rem;">
          ${currentFilter.searchTerm ? 'Tente ajustar os filtros ou a busca.' : 'Comece adicionando uma receita ou despesa!'}
        </p>
        <button class="btn btn-primary" onclick="RichPigApp.openTransactionModal('expense')">
          + Adicionar Lançamento
        </button>
      </div>
    `;
    return;
  }

  // Renderiza itens
  let html = '';
  filtered.forEach(tx => {
    const isIncome = tx.type === 'income';
    const isPaid = tx.status === 'paid';
    
    // Procura categoria
    const catList = isIncome ? state.categories.income : state.categories.expense;
    const catObj = catList.find(c => c.id === tx.category) || { name: tx.category, icon: isIncome ? '💰' : '💳' };

    const formattedDate = formatDisplayDate(tx.date);
    const formattedAmount = `${isIncome ? '+' : '-'} ${window.RichPigApp.formatCurrency(tx.amount)}`;

    // CLASSE DE COR CONFORME PEDIDO DO USUÁRIO:
    // Receitas em verde (income-row), Despesas em vermelho (expense-row)
    html += `
      <div class="transaction-item ${isIncome ? 'income-row' : 'expense-row'}" id="tx-${tx.id}">
        <div class="transaction-left">
          <div class="transaction-icon-box ${isIncome ? 'income-icon-box' : 'expense-icon-box'}">
            <span>${catObj.icon}</span>
          </div>
          <div class="transaction-details">
            <div class="transaction-title">
              <span>${escapeHtml(tx.description)}</span>
              ${tx.recurrenceId ? `<span class="badge" style="background: var(--bg-subtle); font-size: 0.7rem;">🔁 Recorrente</span>` : ''}
            </div>
            <div class="transaction-sub">
              <span>📅 ${formattedDate}</span>
              <span>•</span>
              <span>🏷️ ${catObj.name}</span>
              <span>•</span>
              <span>💳 ${escapeHtml(tx.paymentMethod || 'Geral')}</span>
              <span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}" 
                    style="cursor: pointer;" 
                    onclick="RichPigTransactions.toggleTransactionStatus('${tx.id}')"
                    title="Clique para alternar status">
                ${isPaid ? '✓ Pago' : '⏳ Pendente'}
              </span>
            </div>
          </div>
        </div>

        <div class="transaction-right">
          <div class="transaction-value ${isIncome ? 'income' : 'expense'}">
            ${formattedAmount}
          </div>
          <div class="action-btns-group">
            <button class="btn-table-action" onclick="RichPigApp.openEditTransactionModal('${tx.id}')" title="Editar Lançamento">
              ✏️
            </button>
            <button class="btn-table-action delete" onclick="RichPigTransactions.handleDeletePrompt('${tx.id}')" title="Excluir Lançamento">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Trata exclusão com confirmação para itens recorrentes
 */
function handleDeletePrompt(id) {
  const state = window.RichPigState.getState();
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;

  if (tx.recurrenceId) {
    const choice = confirm(
      `Este lançamento faz parte de uma série recorrente.\n\n` +
      `Clique em OK para excluir TODAS as repetições desta série,\n` +
      `ou em Cancelar para excluir apenas este mês.`
    );
    deleteTransaction(id, choice);
  } else {
    if (confirm(`Deseja realmente excluir "${tx.description}"?`)) {
      deleteTransaction(id, false);
    }
  }
  renderTransactionsView();
  window.RichPigApp?.updateHeaderBalance();
  window.RichPigCharts?.renderAllCharts();
  window.RichPigApp?.showToast('Lançamento excluído!', 'info');
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

window.RichPigTransactions = {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  toggleTransactionStatus,
  getFilteredTransactions,
  getTransactionsSummary,
  calculateGlobalBalance,
  setMonthFilter,
  toggleViewAllMonths,
  renderTransactionsView,
  handleDeletePrompt,
  currentFilter
};
