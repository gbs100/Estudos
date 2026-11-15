/* ========================================================
   Rich Pig Finanças - Módulo de Financiamentos e Empréstimos (loans.js)
   Gestão de Dívidas, SAC/Price e Simulador de Amortização Extraordinária
   ======================================================== */

/**
 * Adiciona um contrato de financiamento ou empréstimo
 */
function addLoan(data) {
  const state = window.RichPigState.getState();
  const loans = [...state.loans];

  const initialAmount = parseFloat(data.initialAmount) || 0;
  const totalInstallments = parseInt(data.totalInstallments, 10) || 12;
  const paidInstallments = parseInt(data.paidInstallments, 10) || 0;
  const interestRate = parseFloat(data.interestRateAnnual) || 0;
  const system = data.system || 'SAC';

  if (!data.name || !data.name.trim()) {
    throw new Error('Informe o nome ou identificação do financiamento.');
  }

  // Se o saldo devedor não foi informado explicitamente, calcula aproximação
  let outstandingBalance = parseFloat(data.outstandingBalance);
  if (isNaN(outstandingBalance) || outstandingBalance <= 0) {
    const remaining = totalInstallments - paidInstallments;
    outstandingBalance = totalInstallments > 0 ? (initialAmount * (remaining / totalInstallments)) : initialAmount;
  }

  // Valor da parcela
  let installmentValue = parseFloat(data.installmentValue);
  if (isNaN(installmentValue) || installmentValue <= 0) {
    installmentValue = calculateMonthlyPayment(outstandingBalance, interestRate, totalInstallments - paidInstallments, system);
  }

  loans.push({
    id: window.RichPigState.generateId('loan'),
    name: data.name.trim(),
    type: data.type || 'Imobiliário',
    system: system,
    initialAmount: initialAmount,
    interestRateAnnual: interestRate,
    totalInstallments: totalInstallments,
    paidInstallments: paidInstallments,
    installmentValue: installmentValue,
    outstandingBalance: outstandingBalance,
    dueDay: parseInt(data.dueDay, 10) || 10,
    notes: data.notes ? data.notes.trim() : ''
  });

  window.RichPigState.updateState({ loans });
  return true;
}

/**
 * Atualiza um financiamento existente
 */
function updateLoan(id, updatedData) {
  const state = window.RichPigState.getState();
  const index = state.loans.findIndex(l => l.id === id);
  if (index === -1) throw new Error('Financiamento não encontrado.');

  const loans = [...state.loans];
  loans[index] = {
    ...loans[index],
    ...updatedData,
    initialAmount: parseFloat(updatedData.initialAmount) || loans[index].initialAmount,
    interestRateAnnual: parseFloat(updatedData.interestRateAnnual) || loans[index].interestRateAnnual,
    totalInstallments: parseInt(updatedData.totalInstallments, 10) || loans[index].totalInstallments,
    paidInstallments: parseInt(updatedData.paidInstallments, 10) || loans[index].paidInstallments,
    installmentValue: parseFloat(updatedData.installmentValue) || loans[index].installmentValue,
    outstandingBalance: parseFloat(updatedData.outstandingBalance) || loans[index].outstandingBalance
  };

  window.RichPigState.updateState({ loans });
  return true;
}

/**
 * Exclui um financiamento
 */
function deleteLoan(id) {
  const state = window.RichPigState.getState();
  const loans = state.loans.filter(l => l.id !== id);
  window.RichPigState.updateState({ loans });
}

/**
 * Calcula a parcela mensal estimada (SAC ou Price)
 */
function calculateMonthlyPayment(balance, annualRate, remainingMonths, system = 'SAC') {
  if (remainingMonths <= 0 || balance <= 0) return 0;
  const monthlyRate = (annualRate / 100) / 12;

  if (system === 'Price') {
    if (monthlyRate === 0) return balance / remainingMonths;
    const factor = Math.pow(1 + monthlyRate, remainingMonths);
    return balance * ((monthlyRate * factor) / (factor - 1));
  } else {
    // SAC: Amortização constante + juros sobre o saldo devedor
    const amortization = balance / remainingMonths;
    const interest = balance * monthlyRate;
    return amortization + interest;
  }
}

/**
 * Registra o pagamento da parcela mensal do financiamento
 */
function payMonthlyInstallment(loanId) {
  const state = window.RichPigState.getState();
  const loan = state.loans.find(l => l.id === loanId);
  if (!loan) return;

  if (loan.paidInstallments >= loan.totalInstallments) {
    window.RichPigApp?.showToast('Este financiamento já foi 100% quitado! 🎉', 'success');
    return;
  }

  const newPaid = loan.paidInstallments + 1;
  const remaining = loan.totalInstallments - newPaid;
  
  // Amortiza a parte principal
  const monthlyRate = (loan.interestRateAnnual / 100) / 12;
  const interestAmount = loan.outstandingBalance * monthlyRate;
  const principalAmortized = Math.max(0, loan.installmentValue - interestAmount);
  const newBalance = Math.max(0, loan.outstandingBalance - principalAmortized);

  // Atualiza financiamento
  updateLoan(loanId, {
    paidInstallments: newPaid,
    outstandingBalance: newBalance
  });

  // Cria lançamento de despesa correspondente na data de hoje
  const today = new Date().toISOString().split('T')[0];
  window.RichPigTransactions.addTransaction({
    description: `Parcela (${newPaid}/${loan.totalInstallments}) - ${loan.name}`,
    amount: loan.installmentValue,
    type: 'expense',
    category: 'moradia',
    date: today,
    paymentMethod: 'Débito Automático',
    status: 'paid',
    notes: `Pagamento de parcela de financiamento`
  });

  renderLoansView();
  window.RichPigTransactions.renderTransactionsView();
  window.RichPigApp?.updateHeaderBalance();
  window.RichPigCharts?.renderAllCharts();

  window.RichPigApp?.showToast(`Parcela ${newPaid}/${loan.totalInstallments} paga com sucesso! 🐷`, 'success');
}

/**
 * Simula Amortização Extraordinária (Redução de Prazo ou Parcela)
 */
function simulateAmortization(loanId, extraAmount, mode = 'term') {
  const state = window.RichPigState.getState();
  const loan = state.loans.find(l => l.id === loanId);
  if (!loan) return null;

  const extra = parseFloat(extraAmount) || 0;
  if (extra <= 0) return null;

  const currentBalance = loan.outstandingBalance;
  const newBalance = Math.max(0, currentBalance - extra);
  const annualRate = loan.interestRateAnnual;
  const monthlyRate = (annualRate / 100) / 12;
  const remainingMonths = loan.totalInstallments - loan.paidInstallments;

  if (mode === 'term') {
    // Reduz Prazo: Mantém parcela próxima, recalcula quantos meses faltam
    let simulatedMonths = 0;
    let tempBalance = newBalance;
    let totalInterestFuture = 0;
    let oldInterestFuture = 0;

    // Cálculo simplificado de amortização
    const monthlyAmort = currentBalance / remainingMonths;
    simulatedMonths = monthlyAmort > 0 ? Math.ceil(newBalance / monthlyAmort) : 0;
    const monthsSaved = Math.max(0, remainingMonths - simulatedMonths);

    // Economia de juros estimada
    const estimatedInterestSaved = extra * monthlyRate * monthsSaved * 0.7;

    return {
      mode: 'term',
      extraAmount: extra,
      oldBalance: currentBalance,
      newBalance: newBalance,
      oldRemainingMonths: remainingMonths,
      newRemainingMonths: simulatedMonths,
      monthsSaved: monthsSaved,
      yearsSaved: (monthsSaved / 12).toFixed(1),
      estimatedInterestSaved: Math.max(0, estimatedInterestSaved)
    };
  } else {
    // Reduz Parcela: Mantém prazo, recalcula nova parcela menor
    const newInstallment = calculateMonthlyPayment(newBalance, annualRate, remainingMonths, loan.system);
    const monthlySavings = Math.max(0, loan.installmentValue - newInstallment);
    const totalSavings = monthlySavings * remainingMonths;

    return {
      mode: 'installment',
      extraAmount: extra,
      oldBalance: currentBalance,
      newBalance: newBalance,
      oldInstallment: loan.installmentValue,
      newInstallment: newInstallment,
      monthlySavings: monthlySavings,
      totalSavings: totalSavings
    };
  }
}

/**
 * Aplica amortização extraordinária de fato no financiamento
 */
function applyExtraAmortization(loanId, extraAmount, mode = 'term') {
  const sim = simulateAmortization(loanId, extraAmount, mode);
  if (!sim) return;

  const state = window.RichPigState.getState();
  const loan = state.loans.find(l => l.id === loanId);
  if (!loan) return;

  if (mode === 'term') {
    const newTotal = loan.paidInstallments + sim.newRemainingMonths;
    updateLoan(loanId, {
      outstandingBalance: sim.newBalance,
      totalInstallments: newTotal
    });
  } else {
    updateLoan(loanId, {
      outstandingBalance: sim.newBalance,
      installmentValue: sim.newInstallment
    });
  }

  // Registra a despesa
  const today = new Date().toISOString().split('T')[0];
  window.RichPigTransactions.addTransaction({
    description: `Amortização Extraordinária - ${loan.name}`,
    amount: sim.extraAmount,
    type: 'expense',
    category: 'outras_despesas',
    date: today,
    paymentMethod: 'Pix',
    status: 'paid',
    notes: `Amortização ${mode === 'term' ? 'reduzindo prazo' : 'reduzindo parcela'}`
  });

  renderLoansView();
  window.RichPigTransactions.renderTransactionsView();
  window.RichPigApp?.updateHeaderBalance();
  window.RichPigCharts?.renderAllCharts();

  window.RichPigApp?.showToast(`Amortização de ${window.RichPigApp.formatCurrency(sim.extraAmount)} aplicada com sucesso! 🚀`, 'success');
}

/**
 * Calcula resumo geral de todos os financiamentos
 */
function getLoansSummary() {
  const state = window.RichPigState.getState();
  const list = state.loans || [];

  let totalDebt = 0;
  let totalMonthlyPayment = 0;
  let totalInitial = 0;

  list.forEach(loan => {
    totalDebt += (parseFloat(loan.outstandingBalance) || 0);
    totalMonthlyPayment += (parseFloat(loan.installmentValue) || 0);
    totalInitial += (parseFloat(loan.initialAmount) || 0);
  });

  const totalPaidEstimate = Math.max(0, totalInitial - totalDebt);
  const overallProgress = totalInitial > 0 ? (totalPaidEstimate / totalInitial) * 100 : 0;

  return {
    totalDebt,
    totalMonthlyPayment,
    totalInitial,
    totalPaidEstimate,
    overallProgress,
    count: list.length
  };
}

/**
 * Renderiza a visualização de Financiamentos
 */
function renderLoansView() {
  const container = document.getElementById('loans-list-container');
  if (!container) return;

  const summary = getLoansSummary();
  const state = window.RichPigState.getState();

  // Atualiza métricas do topo
  const debtEl = document.getElementById('loans-total-debt');
  const monthEl = document.getElementById('loans-total-monthly');
  const progEl = document.getElementById('loans-overall-progress');

  if (debtEl) debtEl.textContent = window.RichPigApp.formatCurrency(summary.totalDebt);
  if (monthEl) monthEl.textContent = `${window.RichPigApp.formatCurrency(summary.totalMonthlyPayment)} / mês`;
  if (progEl) progEl.textContent = `${summary.overallProgress.toFixed(1)}% Quitado`;

  // Preenche select do simulador se houver
  populateAmortizationSelect();

  if (!state.loans || state.loans.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🏦</div>
        <h3 class="font-bold text-lg" style="margin-bottom: 0.25rem;">Nenhum financiamento ou empréstimo cadastrado</h3>
        <p class="text-secondary text-sm" style="margin-bottom: 1.25rem;">
          Cadastre seu financiamento imobiliário, veicular ou empréstimo para acompanhar a amortização e economizar juros.
        </p>
        <button class="btn btn-primary" onclick="RichPigApp.openLoanModal()">
          + Novo Financiamento
        </button>
      </div>
    `;
    return;
  }

  let html = '';
  state.loans.forEach(loan => {
    const totalInst = loan.totalInstallments || 1;
    const paidInst = loan.paidInstallments || 0;
    const progressPct = Math.min(100, Math.max(0, (paidInst / totalInst) * 100));
    const remainingInst = Math.max(0, totalInst - paidInst);

    let typeIcon = '🏠';
    if (loan.type === 'Veicular') typeIcon = '🚗';
    else if (loan.type === 'Consignado') typeIcon = '💼';
    else if (loan.type === 'Estudantil') typeIcon = '🎓';
    else if (loan.type === 'Pessoal') typeIcon = '💳';

    html += `
      <div class="card" style="margin-bottom: 1rem; padding: 1.25rem;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.9rem;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
              ${typeIcon}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <h4 class="font-bold text-base">${escapeHtml(loan.name)}</h4>
                <span class="badge" style="background: var(--bg-subtle); color: var(--loan-color); font-size: 0.72rem;">
                  ${escapeHtml(loan.type)} (${escapeHtml(loan.system)})
                </span>
                <span class="badge" style="background: var(--bg-subtle); font-size: 0.72rem;">
                  Taxa: ${loan.interestRateAnnual}% a.a.
                </span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">
                <span>Vencimento dia ${loan.dueDay}</span> • 
                <span>Parcela Atual: <strong class="text-primary">${window.RichPigApp.formatCurrency(loan.installmentValue)}</strong></span>
                ${loan.notes ? ` • <span>${escapeHtml(loan.notes)}</span>` : ''}
              </div>
            </div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Saldo Devedor</div>
            <div class="font-bold text-xl font-mono text-expense">
              ${window.RichPigApp.formatCurrency(loan.outstandingBalance)}
            </div>
          </div>
        </div>

        <!-- Barra de Progresso de Quitação -->
        <div style="margin: 0.85rem 0;">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.35rem;">
            <span>Progresso: ${paidInst} de ${totalInst} parcelas pagas (${progressPct.toFixed(1)}%)</span>
            <span>Restam ${remainingInst} meses</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${progressPct}%; background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%);"></div>
          </div>
        </div>

        <!-- Ações do Contrato -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-secondary text-xs" style="padding: 0.4rem 0.75rem;" onclick="RichPigLoans.payMonthlyInstallment('${loan.id}')">
              ✓ Pagar Parcela do Mês
            </button>
            <button class="btn btn-secondary text-xs" style="padding: 0.4rem 0.75rem;" onclick="RichPigLoans.openQuickAmortize('${loan.id}')">
              ⚡ Simular Amortização
            </button>
          </div>

          <div class="action-btns-group">
            <button class="btn-table-action" onclick="RichPigApp.openEditLoanModal('${loan.id}')" title="Editar Financiamento">
              ✏️
            </button>
            <button class="btn-table-action delete" onclick="RichPigLoans.handleDeleteLoan('${loan.id}')" title="Excluir Financiamento">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function populateAmortizationSelect() {
  const sel = document.getElementById('amort-loan-select');
  if (!sel) return;

  const state = window.RichPigState.getState();
  const currentVal = sel.value;

  sel.innerHTML = state.loans.map(l => `
    <option value="${l.id}">${escapeHtml(l.name)} (Saldo: ${window.RichPigApp.formatCurrency(l.outstandingBalance)})</option>
  `).join('');

  if (currentVal && state.loans.some(l => l.id === currentVal)) {
    sel.value = currentVal;
  }
}

function openQuickAmortize(loanId) {
  const sel = document.getElementById('amort-loan-select');
  if (sel) sel.value = loanId;
  const amortSection = document.getElementById('amortization-simulator-section');
  if (amortSection) {
    amortSection.scrollIntoView({ behavior: 'smooth' });
  }
  runAmortizationSimulatorUI();
}

function runAmortizationSimulatorUI() {
  const sel = document.getElementById('amort-loan-select');
  const extraInput = document.getElementById('amort-extra-amount');
  const modeRadios = document.getElementsByName('amort-mode');

  if (!sel || !extraInput) return;

  const loanId = sel.value;
  const extra = parseFloat(extraInput.value) || 0;
  let mode = 'term';
  modeRadios.forEach(r => { if (r.checked) mode = r.value; });

  const resultContainer = document.getElementById('amort-results-display');
  if (!resultContainer) return;

  if (!loanId || extra <= 0) {
    resultContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
        Selecione um financiamento e informe o valor da amortização para ver a simulação.
      </div>
    `;
    return;
  }

  const sim = simulateAmortization(loanId, extra, mode);
  if (!sim) return;

  if (mode === 'term') {
    resultContainer.innerHTML = `
      <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 1.25rem;">
        <h5 class="font-bold text-sm" style="color: var(--income-color); margin-bottom: 0.5rem;">
          🎉 Resultado da Redução de Prazo:
        </h5>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
          <div>
            <div class="text-xs text-muted">Meses Eliminados</div>
            <div class="font-bold text-lg text-income">− ${sim.monthsSaved} parcelas (~${sim.yearsSaved} anos)</div>
          </div>
          <div>
            <div class="text-xs text-muted">Novo Saldo Devedor</div>
            <div class="font-bold text-lg">${window.RichPigApp.formatCurrency(sim.newBalance)}</div>
          </div>
          <div>
            <div class="text-xs text-muted">Economia Estimada em Juros</div>
            <div class="font-bold text-lg text-gold">~ ${window.RichPigApp.formatCurrency(sim.estimatedInterestSaved)}</div>
          </div>
        </div>
        <div style="margin-top: 1rem; text-align: right;">
          <button class="btn btn-primary text-xs" onclick="RichPigLoans.applyExtraAmortization('${loanId}', ${sim.extraAmount}, 'term')">
            Efetivar Amortização Agora
          </button>
        </div>
      </div>
    `;
  } else {
    resultContainer.innerHTML = `
      <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 1.25rem;">
        <h5 class="font-bold text-sm" style="color: var(--invest-color); margin-bottom: 0.5rem;">
          📉 Resultado da Redução do Valor da Parcela:
        </h5>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
          <div>
            <div class="text-xs text-muted">Nova Parcela Mensal</div>
            <div class="font-bold text-lg text-income">${window.RichPigApp.formatCurrency(sim.newInstallment)}</div>
          </div>
          <div>
            <div class="text-xs text-muted">Alívio Mensal no Orçamento</div>
            <div class="font-bold text-lg text-income">− ${window.RichPigApp.formatCurrency(sim.monthlySavings)} / mês</div>
          </div>
          <div>
            <div class="text-xs text-muted">Novo Saldo Devedor</div>
            <div class="font-bold text-lg">${window.RichPigApp.formatCurrency(sim.newBalance)}</div>
          </div>
        </div>
        <div style="margin-top: 1rem; text-align: right;">
          <button class="btn btn-primary text-xs" onclick="RichPigLoans.applyExtraAmortization('${loanId}', ${sim.extraAmount}, 'installment')">
            Efetivar Amortização Agora
          </button>
        </div>
      </div>
    `;
  }
}

function handleDeleteLoan(id) {
  const state = window.RichPigState.getState();
  const loan = state.loans.find(l => l.id === id);
  if (!loan) return;

  if (confirm(`Deseja realmente excluir o contrato "${loan.name}"?`)) {
    deleteLoan(id);
    renderLoansView();
    window.RichPigCharts?.renderLoansChart();
    window.RichPigApp?.updateHeaderBalance();
    window.RichPigApp?.showToast('Financiamento excluído.', 'info');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.RichPigLoans = {
  addLoan,
  updateLoan,
  deleteLoan,
  calculateMonthlyPayment,
  payMonthlyInstallment,
  simulateAmortization,
  applyExtraAmortization,
  getLoansSummary,
  renderLoansView,
  populateAmortizationSelect,
  openQuickAmortize,
  runAmortizationSimulatorUI,
  handleDeleteLoan
};
