/* ========================================================
   Rich Pig Finanças - Módulo de Estado (state.js)
   Gerenciamento reativo, persistência LocalStorage e Dados Iniciais
   ======================================================== */

const STORAGE_KEY = 'richpig_financas_state_v1';

// Categorias Padrão
const DEFAULT_CATEGORIES = {
  income: [
    { id: 'salario', name: 'Salário & Pró-labore', icon: '💵', color: '#10b981' },
    { id: 'freelance', name: 'Freelance & Serviços', icon: '💻', color: '#06b6d4' },
    { id: 'dividendos', name: 'Dividendos & Rendimentos', icon: '📈', color: '#8b5cf6' },
    { id: 'vendas', name: 'Venda de Bens', icon: '🏷️', color: '#f59e0b' },
    { id: 'outras_receitas', name: 'Outras Receitas', icon: '💰', color: '#10b981' }
  ],
  expense: [
    { id: 'moradia', name: 'Moradia (Aluguel/Condomínio)', icon: '🏠', color: '#f43f5e' },
    { id: 'alimentacao', name: 'Alimentação & Supermercado', icon: '🛒', color: '#f97316' },
    { id: 'transporte', name: 'Transporte & Combustível', icon: '🚗', color: '#eab308' },
    { id: 'saude', name: 'Saúde & Farmácia', icon: '💊', color: '#ec4899' },
    { id: 'educacao', name: 'Educação & Cursos', icon: '📚', color: '#3b82f6' },
    { id: 'lazer', name: 'Lazer & Viagens', icon: '✈️', color: '#a855f7' },
    { id: 'contas', name: 'Contas Básicas (Luz, Água, Net)', icon: '⚡', color: '#64748b' },
    { id: 'compras', name: 'Vestuário & Compras', icon: '🛍️', color: '#14b8a6' },
    { id: 'outras_despesas', name: 'Outras Despesas', icon: '💳', color: '#ef4444' }
  ]
};

// Estado Inicial Padrão
const DEFAULT_STATE = {
  transactions: [],
  investments: [],
  loans: [],
  categories: DEFAULT_CATEGORIES,
  settings: {
    theme: 'light',
    privacyMode: false,
    currency: 'BRL',
    hasPassword: false,
    passwordHash: null,
    passwordHint: '',
    isLocked: false
  },
  sampleDataLoaded: false
};

// Instância do Estado em Memória
let appState = { ...DEFAULT_STATE };
const listeners = [];

/**
 * Notifica todos os ouvintes inscritos de que o estado mudou
 */
function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn(appState);
    } catch (e) {
      console.error('Erro no listener do estado:', e);
    }
  });
}

/**
 * Inscreve uma função para ser executada quando o estado mudar
 */
function subscribe(fn) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

/**
 * Salva o estado atual no LocalStorage
 */
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    notifyListeners();
  } catch (err) {
    console.error('Erro ao salvar no LocalStorage:', err);
  }
}

/**
 * Carrega o estado do LocalStorage ou inicializa com valores padrão
 */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      appState = {
        ...DEFAULT_STATE,
        ...parsed,
        categories: { ...DEFAULT_CATEGORIES, ...(parsed.categories || {}) },
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) }
      };
    } else {
      appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
      // Carrega dados de demonstração automaticamente na primeira vez para dar vida ao app!
      seedSampleData();
    }
  } catch (err) {
    console.error('Erro ao carregar estado:', err);
    appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
  return appState;
}

/**
 * Retorna o estado atual
 */
function getState() {
  return appState;
}

/**
 * Atualiza campos parciais do estado
 */
function updateState(partial) {
  appState = {
    ...appState,
    ...partial
  };
  saveState();
}

/**
 * Gera um ID único
 */
function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
}

/**
 * Popula a aplicação com dados realistas de demonstração brasileiros
 */
function seedSampleData() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 a 11

  // Formatador de data YYYY-MM-DD
  const formatDate = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const sampleTransactions = [
    // Mês Atual - Receitas
    {
      id: generateId('tx'),
      description: 'Salário Principal - Empresa Tech',
      amount: 9800.00,
      type: 'income',
      category: 'salario',
      date: formatDate(year, month, 5),
      paymentMethod: 'Conta Corrente',
      status: 'paid',
      notes: 'Pagamento mensal líquido'
    },
    {
      id: generateId('tx'),
      description: 'Consultoria e Freelance UI/UX',
      amount: 2450.00,
      type: 'income',
      category: 'freelance',
      date: formatDate(year, month, 12),
      paymentMethod: 'Pix',
      status: 'paid',
      notes: 'Projeto redesign app mobile'
    },
    {
      id: generateId('tx'),
      description: 'Rendimentos FIIs & Dividendos',
      amount: 480.50,
      type: 'income',
      category: 'dividendos',
      date: formatDate(year, month, 15),
      paymentMethod: 'Conta Corrente',
      status: 'paid',
      notes: 'HGLG11, MXRF11 e XPLG11'
    },
    // Mês Atual - Despesas
    {
      id: generateId('tx'),
      description: 'Aluguel & Condomínio Ed. Solar',
      amount: 2600.00,
      type: 'expense',
      category: 'moradia',
      date: formatDate(year, month, 8),
      paymentMethod: 'Pix',
      status: 'paid',
      notes: 'Boleto mensal apartamento'
    },
    {
      id: generateId('tx'),
      description: 'Supermercado Mensal Pão de Açúcar',
      amount: 1280.40,
      type: 'expense',
      category: 'alimentacao',
      date: formatDate(year, month, 10),
      paymentMethod: 'Cartão de Crédito',
      status: 'paid',
      notes: 'Compras do mês'
    },
    {
      id: generateId('tx'),
      description: 'Combustível e Estacionamento',
      amount: 340.00,
      type: 'expense',
      category: 'transporte',
      date: formatDate(year, month, 14),
      paymentMethod: 'Cartão de Crédito',
      status: 'paid',
      notes: '2 abastecimentos etanol'
    },
    {
      id: generateId('tx'),
      description: 'Plano de Saúde Unimed',
      amount: 580.00,
      type: 'expense',
      category: 'saude',
      date: formatDate(year, month, 20),
      paymentMethod: 'Débito Automático',
      status: 'pending',
      notes: 'Vence dia 20'
    },
    {
      id: generateId('tx'),
      description: 'Energia Elétrica Enel & Internet Fibra',
      amount: 395.00,
      type: 'expense',
      category: 'contas',
      date: formatDate(year, month, 22),
      paymentMethod: 'Pix',
      status: 'pending',
      notes: 'Contas básicas'
    },
    {
      id: generateId('tx'),
      description: 'Jantar Restaurante Japonês',
      amount: 220.00,
      type: 'expense',
      category: 'lazer',
      date: formatDate(year, month, 13),
      paymentMethod: 'Cartão de Crédito',
      status: 'paid',
      notes: 'Comemoração final de semana'
    },
    {
      id: generateId('tx'),
      description: 'Notebook Dell Ultra (Parcela 03/12)',
      amount: 499.90,
      type: 'expense',
      category: 'compras',
      date: formatDate(year, month, 18),
      paymentMethod: 'Cartão de Crédito',
      status: 'pending',
      recurrenceId: 'rec_notebook',
      recurrenceIndex: 3,
      recurrenceTotal: 12,
      notes: 'Equipamento de trabalho parcelado'
    },
    // Mês Anterior para Gráfico Comparativo
    {
      id: generateId('tx'),
      description: 'Salário Principal - Empresa Tech',
      amount: 9800.00,
      type: 'income',
      category: 'salario',
      date: formatDate(year, month === 0 ? 11 : month - 1, 5),
      paymentMethod: 'Conta Corrente',
      status: 'paid',
      notes: 'Mês anterior'
    },
    {
      id: generateId('tx'),
      description: 'Aluguel & Condomínio',
      amount: 2600.00,
      type: 'expense',
      category: 'moradia',
      date: formatDate(year, month === 0 ? 11 : month - 1, 8),
      paymentMethod: 'Pix',
      status: 'paid',
      notes: 'Mês anterior'
    },
    {
      id: generateId('tx'),
      description: 'Supermercado e Feira',
      amount: 1450.00,
      type: 'expense',
      category: 'alimentacao',
      date: formatDate(year, month === 0 ? 11 : month - 1, 15),
      paymentMethod: 'Cartão de Crédito',
      status: 'paid',
      notes: 'Mês anterior'
    }
  ];

  const sampleInvestments = [
    {
      id: generateId('inv'),
      name: 'Reserva de Emergência - CDB 100% CDI',
      type: 'Reserva de Emergência',
      institution: 'Nubank / Caixinha',
      investedAmount: 25000.00,
      currentAmount: 26850.40,
      expectedReturn: '10.65% a.a.',
      date: '2024-01-10',
      notes: 'Liquidez diária imediata para imprevistos'
    },
    {
      id: generateId('inv'),
      name: 'Tesouro IPCA+ 2035 com Juros Semestrais',
      type: 'Renda Fixa',
      institution: 'Tesouro Direto / XP',
      investedAmount: 18000.00,
      currentAmount: 20420.00,
      expectedReturn: 'IPCA + 6.30% a.a.',
      date: '2024-03-15',
      notes: 'Proteção contra inflação a longo prazo'
    },
    {
      id: generateId('inv'),
      name: 'HGLG11 - CSHG Logística FII',
      type: 'Fundos Imobiliários',
      institution: 'BTG Pactual',
      investedAmount: 12500.00,
      currentAmount: 13950.00,
      expectedReturn: 'Dividend Yield 8.9% a.a.',
      date: '2024-05-20',
      notes: 'Galpões logísticos de alto padrão'
    },
    {
      id: generateId('inv'),
      name: 'Banco do Brasil - BBAS3',
      type: 'Ações',
      institution: 'Inter Invest',
      investedAmount: 8500.00,
      currentAmount: 10150.00,
      expectedReturn: 'Dividendos + Crescimento',
      date: '2024-06-11',
      notes: 'Ações perenes pagadoras de proventos'
    },
    {
      id: generateId('inv'),
      name: 'Bitcoin (BTC) - Cold Storage',
      type: 'Criptomoedas',
      institution: 'Ledger / Mercado Bitcoin',
      investedAmount: 6000.00,
      currentAmount: 9340.00,
      expectedReturn: 'Alto potencial de valorização',
      date: '2024-02-05',
      notes: '0.015 BTC custodiado'
    }
  ];

  const sampleLoans = [
    {
      id: generateId('loan'),
      name: 'Financiamento Imobiliário Caixa - Residencial Aurora',
      type: 'Imobiliário',
      system: 'SAC',
      initialAmount: 280000.00,
      interestRateAnnual: 8.99,
      totalInstallments: 360,
      paidInstallments: 42,
      installmentValue: 2350.80,
      outstandingBalance: 247300.00,
      dueDay: 15,
      notes: 'Sistema SAC com parcelas decrescentes. Vale a pena amortizar no saldo devedor!'
    },
    {
      id: generateId('loan'),
      name: 'Financiamento Veicular - Honda HR-V',
      type: 'Veicular',
      system: 'Price',
      initialAmount: 65000.00,
      interestRateAnnual: 14.5,
      totalInstallments: 48,
      paidInstallments: 28,
      installmentValue: 1780.00,
      outstandingBalance: 31400.00,
      dueDay: 25,
      notes: 'Tabela Price parcelas fixas'
    }
  ];

  appState.transactions = sampleTransactions;
  appState.investments = sampleInvestments;
  appState.loans = sampleLoans;
  appState.sampleDataLoaded = true;

  saveState();
}

/**
 * Reseta todos os dados para o padrão limpo
 */
function resetAllData() {
  appState = {
    ...DEFAULT_STATE,
    categories: DEFAULT_CATEGORIES,
    settings: {
      ...DEFAULT_STATE.settings,
      theme: appState.settings.theme // preserva tema
    },
    sampleDataLoaded: false
  };
  saveState();
}

// Exportações globais para os scripts
window.RichPigState = {
  getState,
  updateState,
  saveState,
  loadState,
  subscribe,
  generateId,
  seedSampleData,
  resetAllData,
  DEFAULT_CATEGORIES
};
