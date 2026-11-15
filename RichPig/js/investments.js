/* ========================================================
   Rich Pig Finanças - Módulo de Investimentos (investments.js)
   Carteira de Ativos, Alocação e Simulador de Juros Compostos
   ======================================================== */

/**
 * Adiciona um novo ativo à carteira
 */
function addInvestment(data) {
  const state = window.RichPigState.getState();
  const investments = [...state.investments];

  const investedAmount = parseFloat(data.investedAmount) || 0;
  const currentAmount = parseFloat(data.currentAmount) || investedAmount;

  if (!data.name || !data.name.trim()) {
    throw new Error('Informe o nome ou código do ativo.');
  }

  investments.push({
    id: window.RichPigState.generateId('inv'),
    name: data.name.trim(),
    type: data.type || 'Renda Fixa',
    institution: data.institution ? data.institution.trim() : 'Geral',
    investedAmount: investedAmount,
    currentAmount: currentAmount,
    expectedReturn: data.expectedReturn ? data.expectedReturn.trim() : '',
    date: data.date || new Date().toISOString().split('T')[0],
    notes: data.notes ? data.notes.trim() : ''
  });

  window.RichPigState.updateState({ investments });
  return true;
}

/**
 * Atualiza um ativo existente
 */
function updateInvestment(id, updatedData) {
  const state = window.RichPigState.getState();
  const index = state.investments.findIndex(i => i.id === id);
  if (index === -1) throw new Error('Ativo não encontrado.');

  const investments = [...state.investments];
  investments[index] = {
    ...investments[index],
    ...updatedData,
    investedAmount: parseFloat(updatedData.investedAmount) || investments[index].investedAmount,
    currentAmount: parseFloat(updatedData.currentAmount) || investments[index].currentAmount
  };

  window.RichPigState.updateState({ investments });
  return true;
}

/**
 * Exclui um ativo da carteira
 */
function deleteInvestment(id) {
  const state = window.RichPigState.getState();
  const investments = state.investments.filter(i => i.id !== id);
  window.RichPigState.updateState({ investments });
}

/**
 * Calcula resumo financeiro da carteira
 */
function getInvestmentsSummary() {
  const state = window.RichPigState.getState();
  const list = state.investments || [];

  let totalInvested = 0;
  let totalCurrent = 0;
  const allocation = {};

  list.forEach(inv => {
    const invested = parseFloat(inv.investedAmount) || 0;
    const current = parseFloat(inv.currentAmount) || invested;

    totalInvested += invested;
    totalCurrent += current;

    const cat = inv.type || 'Outros';
    allocation[cat] = (allocation[cat] || 0) + current;
  });

  const totalProfit = totalCurrent - totalInvested;
  const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  return {
    totalInvested,
    totalCurrent,
    totalProfit,
    profitPercentage,
    allocation,
    count: list.length
  };
}

/**
 * Renderiza a visualização da página de Investimentos
 */
function renderInvestmentsView() {
  const container = document.getElementById('investments-list-container');
  if (!container) return;

  const summary = getInvestmentsSummary();
  const state = window.RichPigState.getState();

  // Atualiza Métricas no Topo
  const curEl = document.getElementById('inv-total-current');
  const invEl = document.getElementById('inv-total-invested');
  const profEl = document.getElementById('inv-total-profit');
  const profPctEl = document.getElementById('inv-profit-pct');

  if (curEl) curEl.textContent = window.RichPigApp.formatCurrency(summary.totalCurrent);
  if (invEl) invEl.textContent = window.RichPigApp.formatCurrency(summary.totalInvested);
  if (profEl) {
    profEl.textContent = `${summary.totalProfit >= 0 ? '+' : ''}${window.RichPigApp.formatCurrency(summary.totalProfit)}`;
    profEl.className = `metric-value ${summary.totalProfit >= 0 ? 'text-income' : 'text-expense'}`;
  }
  if (profPctEl) {
    profPctEl.textContent = `${summary.profitPercentage >= 0 ? '+' : ''}${summary.profitPercentage.toFixed(2)}%`;
  }

  // Lista de Ativos
  if (!state.investments || state.investments.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">📈</div>
        <h3 class="font-bold text-lg" style="margin-bottom: 0.25rem;">Nenhum investimento cadastrado</h3>
        <p class="text-secondary text-sm" style="margin-bottom: 1.25rem;">
          Cadastre seus investimentos em Renda Fixa, Ações, FIIs ou Cripto para acompanhar seu patrimônio.
        </p>
        <button class="btn btn-primary" onclick="RichPigApp.openInvestmentModal()">
          + Novo Investimento
        </button>
      </div>
    `;
    return;
  }

  let html = '';
  state.investments.forEach(inv => {
    const invested = parseFloat(inv.investedAmount) || 0;
    const current = parseFloat(inv.currentAmount) || invested;
    const profit = current - invested;
    const profitPct = invested > 0 ? (profit / invested) * 100 : 0;
    const isProfitPositive = profit >= 0;

    let typeBadgeColor = 'var(--invest-color)';
    let typeIcon = '📊';
    if (inv.type === 'Renda Fixa') { typeBadgeColor = '#10b981'; typeIcon = '🛡️'; }
    else if (inv.type === 'Fundos Imobiliários') { typeBadgeColor = '#f59e0b'; typeIcon = '🏢'; }
    else if (inv.type === 'Ações') { typeBadgeColor = '#3b82f6'; typeIcon = '📈'; }
    else if (inv.type === 'Criptomoedas') { typeBadgeColor = '#8b5cf6'; typeIcon = '🪙'; }
    else if (inv.type === 'Reserva de Emergência') { typeBadgeColor = '#06b6d4'; typeIcon = '🛟'; }

    html += `
      <div class="card" style="margin-bottom: 0.75rem; padding: 1.15rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.9rem;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
              ${typeIcon}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <h4 class="font-bold text-base">${escapeHtml(inv.name)}</h4>
                <span class="badge" style="background: var(--bg-subtle); color: ${typeBadgeColor}; font-size: 0.72rem;">
                  ${escapeHtml(inv.type)}
                </span>
                <span class="badge" style="background: var(--bg-subtle); font-size: 0.72rem;">
                  🏛️ ${escapeHtml(inv.institution)}
                </span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">
                ${inv.expectedReturn ? `<span>Retorno: ${escapeHtml(inv.expectedReturn)}</span> • ` : ''}
                <span>Aporte inicial: ${window.RichPigApp.formatCurrency(invested)}</span>
                ${inv.notes ? ` • <span>${escapeHtml(inv.notes)}</span>` : ''}
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 1.5rem;">
            <div style="text-align: right;">
              <div class="font-bold text-lg font-mono">
                ${window.RichPigApp.formatCurrency(current)}
              </div>
              <div style="font-size: 0.8rem; font-weight: 600;" class="${isProfitPositive ? 'text-income' : 'text-expense'}">
                ${isProfitPositive ? '▲ +' : '▼ '}${window.RichPigApp.formatCurrency(profit)} (${profitPct.toFixed(2)}%)
              </div>
            </div>

            <div class="action-btns-group">
              <button class="btn-table-action" onclick="RichPigApp.openEditInvestmentModal('${inv.id}')" title="Editar Ativo">
                ✏️
              </button>
              <button class="btn-table-action delete" onclick="RichPigInvestments.handleDeleteInvestment('${inv.id}')" title="Excluir Ativo">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function handleDeleteInvestment(id) {
  const state = window.RichPigState.getState();
  const inv = state.investments.find(i => i.id === id);
  if (!inv) return;

  if (confirm(`Deseja remover "${inv.name}" dos seus investimentos?`)) {
    deleteInvestment(id);
    renderInvestmentsView();
    window.RichPigCharts?.renderInvestmentsChart();
    window.RichPigApp?.updateHeaderBalance();
    window.RichPigApp?.showToast('Investimento removido.', 'info');
  }
}

/**
 * Calculadora de Juros Compostos
 */
function calculateCompoundInterest(initial, monthly, annualRate, years) {
  const months = years * 12;
  const monthlyRate = Math.pow(1 + (annualRate / 100), 1 / 12) - 1;

  let total = initial;
  let invested = initial;
  const timeline = [];

  for (let m = 1; m <= months; m++) {
    total = total * (1 + monthlyRate) + monthly;
    invested += monthly;

    // Registra dados anuais para o gráfico
    if (m % 12 === 0 || m === months) {
      timeline.push({
        year: Math.round(m / 12),
        total: Math.round(total * 100) / 100,
        invested: Math.round(invested * 100) / 100,
        interest: Math.round((total - invested) * 100) / 100
      });
    }
  }

  const totalInterest = total - invested;
  // Regra conservadora dos 0.6% ao mês de renda passiva (ex: FIIs ou renda fixa)
  const passiveMonthlyIncome = total * 0.006;

  return {
    finalTotal: total,
    totalInvested: invested,
    totalInterest: totalInterest,
    passiveMonthlyIncome: passiveMonthlyIncome,
    timeline: timeline
  };
}

function runSimulatorUI() {
  const initialInput = document.getElementById('sim-initial-amount');
  const monthlyInput = document.getElementById('sim-monthly-amount');
  const rateInput = document.getElementById('sim-annual-rate');
  const yearsInput = document.getElementById('sim-years');

  if (!initialInput || !monthlyInput || !rateInput || !yearsInput) return;

  const initial = parseFloat(initialInput.value) || 0;
  const monthly = parseFloat(monthlyInput.value) || 0;
  const rate = parseFloat(rateInput.value) || 0;
  const years = parseInt(yearsInput.value, 10) || 1;

  const result = calculateCompoundInterest(initial, monthly, rate, years);

  // Exibe resultados
  const resTotalEl = document.getElementById('sim-result-total');
  const resInvEl = document.getElementById('sim-result-invested');
  const resIntEl = document.getElementById('sim-result-interest');
  const resPassEl = document.getElementById('sim-result-passive');

  if (resTotalEl) resTotalEl.textContent = window.RichPigApp.formatCurrency(result.finalTotal);
  if (resInvEl) resInvEl.textContent = window.RichPigApp.formatCurrency(result.totalInvested);
  if (resIntEl) resIntEl.textContent = window.RichPigApp.formatCurrency(result.totalInterest);
  if (resPassEl) resPassEl.textContent = `${window.RichPigApp.formatCurrency(result.passiveMonthlyIncome)} / mês`;

  // Atualiza gráfico do simulador
  window.RichPigCharts?.renderCompoundSimulatorChart(result.timeline);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.RichPigInvestments = {
  addInvestment,
  updateInvestment,
  deleteInvestment,
  getInvestmentsSummary,
  renderInvestmentsView,
  handleDeleteInvestment,
  calculateCompoundInterest,
  runSimulatorUI
};
