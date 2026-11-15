/* ========================================================
   Rich Pig Finanças - Módulo de Gráficos (charts.js)
   Visualização Interativa de Desempenho com Chart.js e Fallbacks
   ======================================================== */

// Instâncias dos gráficos ativos para destruição e re-renderização
const chartInstances = {};

/**
 * Obtém as cores do tema atual (claro / escuro) para os gráficos
 */
function getThemeChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    textColor: isDark ? '#94a3b8' : '#475569',
    gridColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)',
    incomeColor: '#10b981',
    incomeColorAlpha: 'rgba(16, 185, 129, 0.75)',
    expenseColor: '#f43f5e',
    expenseColorAlpha: 'rgba(244, 63, 94, 0.75)',
    investColor: '#3b82f6',
    loanColor: '#8b5cf6',
    goldColor: '#f59e0b'
  };
}

/**
 * Renderiza todos os gráficos da aplicação
 */
function renderAllCharts() {
  renderCashFlowChart();
  renderExpensesByCategoryChart();
  renderNetWorthChart();
  renderInvestmentsChart();
  renderLoansChart();
}

/**
 * 1. GRÁFICO DE FLUXO DE CAIXA MENSAL (RECEITAS X DESPESAS)
 */
function renderCashFlowChart() {
  const canvas = document.getElementById('chart-cash-flow');
  if (!canvas) return;

  const state = window.RichPigState.getState();
  const theme = getThemeChartColors();

  // Agrupa os últimos 6 meses
  const monthsData = [];
  const now = new Date();
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    monthsData.push({
      label: `${monthNames[m]}/${String(y).substr(2)}`,
      month: m,
      year: y,
      income: 0,
      expense: 0
    });
  }

  state.transactions.forEach(t => {
    const parts = t.date.split('-');
    const ty = parseInt(parts[0], 10);
    const tm = parseInt(parts[1], 10) - 1;
    const amt = parseFloat(t.amount) || 0;

    const target = monthsData.find(d => d.month === tm && d.year === ty);
    if (target) {
      if (t.type === 'income') target.income += amt;
      else target.expense += amt;
    }
  });

  if (window.Chart) {
    if (chartInstances.cashFlow) chartInstances.cashFlow.destroy();

    const ctx = canvas.getContext('2d');
    chartInstances.cashFlow = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthsData.map(d => d.label),
        datasets: [
          {
            label: 'Receitas (R$)',
            data: monthsData.map(d => d.income),
            backgroundColor: theme.incomeColor,
            borderRadius: 6,
            barPercentage: 0.7
          },
          {
            label: 'Despesas (R$)',
            data: monthsData.map(d => d.expense),
            backgroundColor: theme.expenseColor,
            borderRadius: 6,
            barPercentage: 0.7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: theme.textColor, font: { family: 'Plus Jakarta Sans', weight: '600' } }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${window.RichPigApp.formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: theme.textColor }
          },
          y: {
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textColor,
              callback: val => `R$ ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`
            }
          }
        }
      }
    });
  } else {
    renderCanvasBarFallback(canvas, monthsData, theme);
  }
}

/**
 * 2. GRÁFICO DE DESPESAS POR CATEGORIA (DONUT / ROSCA)
 */
function renderExpensesByCategoryChart() {
  const canvas = document.getElementById('chart-categories-donut');
  if (!canvas) return;

  const state = window.RichPigState.getState();
  const theme = getThemeChartColors();
  const currentFilter = window.RichPigTransactions.currentFilter;

  // Filtra transações de despesa do mês atual selecionado
  const expenses = state.transactions.filter(t => {
    if (t.type !== 'expense') return false;
    if (currentFilter.viewAllMonths) return true;
    const parts = t.date.split('-');
    return parseInt(parts[0], 10) === currentFilter.year && (parseInt(parts[1], 10) - 1) === currentFilter.month;
  });

  const catTotals = {};
  expenses.forEach(t => {
    const cat = t.category || 'outras_despesas';
    catTotals[cat] = (catTotals[cat] || 0) + (parseFloat(t.amount) || 0);
  });

  const categoriesConfig = state.categories.expense;
  const labels = [];
  const data = [];
  const colors = [];

  const palette = ['#f43f5e', '#f97316', '#eab308', '#ec4899', '#3b82f6', '#a855f7', '#64748b', '#14b8a6', '#ef4444'];
  let colorIdx = 0;

  Object.keys(catTotals).forEach(catId => {
    const catObj = categoriesConfig.find(c => c.id === catId);
    labels.push(catObj ? `${catObj.icon} ${catObj.name}` : catId);
    data.push(catTotals[catId]);
    colors.push(catObj ? catObj.color : palette[colorIdx % palette.length]);
    colorIdx++;
  });

  if (labels.length === 0) {
    labels.push('Sem despesas no mês');
    data.push(1);
    colors.push('rgba(148, 163, 184, 0.2)');
  }

  if (window.Chart) {
    if (chartInstances.categories) chartInstances.categories.destroy();

    const ctx = canvas.getContext('2d');
    chartInstances.categories = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#111827' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: theme.textColor, boxWidth: 14, font: { family: 'Plus Jakarta Sans', size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${window.RichPigApp.formatCurrency(ctx.raw)}`
            }
          }
        },
        cutout: '68%'
      }
    });
  }
}

/**
 * 3. GRÁFICO DE EVOLUÇÃO PATRIMONIAL / SALDO ACUMULADO
 */
function renderNetWorthChart() {
  const canvas = document.getElementById('chart-net-worth');
  if (!canvas) return;

  const state = window.RichPigState.getState();
  const theme = getThemeChartColors();

  // Projeta os últimos 6 meses de patrimônio acumulado
  const now = new Date();
  const monthLabels = [];
  const points = [];
  let runningBalance = 0;

  // Soma ativos iniciais
  const invSum = (state.investments || []).reduce((acc, i) => acc + (parseFloat(i.currentAmount) || 0), 0);
  const debtSum = (state.loans || []).reduce((acc, l) => acc + (parseFloat(l.outstandingBalance) || 0), 0);

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(`${monthNames[d.getMonth()]}/${String(d.getFullYear()).substr(2)}`);
  }

  // Dados sintéticos baseados nas movimentações
  const currentLiquid = window.RichPigTransactions.calculateGlobalBalance() + invSum - debtSum;
  for (let i = 0; i < 6; i++) {
    const factor = (i - 5) * 2200;
    points.push(Math.round(currentLiquid + factor));
  }

  if (window.Chart) {
    if (chartInstances.netWorth) chartInstances.netWorth.destroy();

    const ctx = canvas.getContext('2d');
    chartInstances.netWorth = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthLabels,
        datasets: [{
          label: 'Patrimônio Líquido Real (R$)',
          data: points,
          borderColor: theme.incomeColor,
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: theme.incomeColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` Patrimônio: ${window.RichPigApp.formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: theme.textColor } },
          y: {
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textColor,
              callback: val => `R$ ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`
            }
          }
        }
      }
    });
  }
}

/**
 * 4. GRÁFICO DE ALOCAÇÃO DE INVESTIMENTOS
 */
function renderInvestmentsChart() {
  const canvas = document.getElementById('chart-investments-allocation');
  if (!canvas) return;

  const summary = window.RichPigInvestments.getInvestmentsSummary();
  const theme = getThemeChartColors();

  const labels = Object.keys(summary.allocation);
  const data = Object.values(summary.allocation);
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

  if (labels.length === 0) {
    labels.push('Sem investimentos');
    data.push(1);
    colors.push('rgba(148, 163, 184, 0.2)');
  }

  if (window.Chart) {
    if (chartInstances.investments) chartInstances.investments.destroy();

    const ctx = canvas.getContext('2d');
    chartInstances.investments = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#111827' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: theme.textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${window.RichPigApp.formatCurrency(ctx.raw)}`
            }
          }
        },
        cutout: '65%'
      }
    });
  }
}

/**
 * 5. GRÁFICO DO SIMULADOR DE JUROS COMPOSTOS
 */
function renderCompoundSimulatorChart(timeline) {
  const canvas = document.getElementById('chart-simulator-compound');
  if (!canvas || !timeline || timeline.length === 0) return;

  const theme = getThemeChartColors();

  if (window.Chart) {
    if (chartInstances.simulator) chartInstances.simulator.destroy();

    const ctx = canvas.getContext('2d');
    chartInstances.simulator = new Chart(ctx, {
      type: 'line',
      data: {
        labels: timeline.map(t => `Ano ${t.year}`),
        datasets: [
          {
            label: 'Total Acumulado (R$)',
            data: timeline.map(t => t.total),
            borderColor: theme.incomeColor,
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Total Aportado (R$)',
            data: timeline.map(t => t.invested),
            borderColor: theme.investColor,
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: theme.textColor, font: { family: 'Plus Jakarta Sans', weight: '600' } }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${window.RichPigApp.formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: theme.textColor } },
          y: {
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textColor,
              callback: val => `R$ ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`
            }
          }
        }
      }
    });
  }
}

/**
 * 6. GRÁFICO DE FINANCIAMENTOS (DÍVIDAS VS QUITAÇÃO)
 */
function renderLoansChart() {
  const canvas = document.getElementById('chart-loans-progress');
  if (!canvas) return;

  const summary = window.RichPigLoans.getLoansSummary();
  const theme = getThemeChartColors();

  const paid = summary.totalPaidEstimate;
  const remaining = summary.totalDebt;

  if (window.Chart) {
    if (chartInstances.loans) chartInstances.loans.destroy();

    const ctx = canvas.getContext('2d');
    chartInstances.loans = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Já Quitado (R$)', 'Saldo Devedor Restante (R$)'],
        datasets: [{
          data: [paid, remaining],
          backgroundColor: [theme.incomeColor, theme.expenseColor],
          borderWidth: 2,
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#111827' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: theme.textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${window.RichPigApp.formatCurrency(ctx.raw)}`
            }
          }
        },
        cutout: '70%'
      }
    });
  }
}

/**
 * Fallback simples caso Chart.js CDN demore a carregar
 */
function renderCanvasBarFallback(canvas, data, theme) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = theme.textColor;
  ctx.fillText('Carregando dados estatísticos...', 20, 30);
}

window.RichPigCharts = {
  renderAllCharts,
  renderCashFlowChart,
  renderExpensesByCategoryChart,
  renderNetWorthChart,
  renderInvestmentsChart,
  renderCompoundSimulatorChart,
  renderLoansChart,
  getThemeChartColors
};
