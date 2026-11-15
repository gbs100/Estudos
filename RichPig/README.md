# 🐷 Rich Pig Finanças

> **Seu Controle Financeiro Pessoal para Pessoa Física**

Uma aplicação web completa, moderna, minimalista e intuitiva para controle financeiro pessoal, desenvolvida sob medida com foco em usabilidade, privacidade e gestão patrimonial inteligente.

---

## ✨ Funcionalidades Principais

### 1. Cabeçalho Inteligente & Identidade Visual Exclusiva
- **Ícone personalizado em vetor (SVG)**: Cofrinho de porquinho rosa com olhos de cifrão (`$$`), ranhura nas costas e uma moeda de **R$ 1 Real** entrando no cofrinho.
- **Nome & Subtítulo**: *Rich Pig Finanças* - *Seu Controle Financeiro Pessoal*.
- **Saldo Atual com Cores Dinâmicas**:
  - 🟢 **Verde** para saldo positivo ou zero.
  - 🔴 **Vermelho** para saldo negativo.
- **Modo Privacidade (Ocultar Saldo)**: Botão de alternância com ícone de olho aberto (`👁️`) ou olho fechado (`🙈`), transformando o saldo em `R$ ••••••••`.
- **Tema Claro / Escuro (Light & Dark Mode)**: Alternância suave com adaptação automática de contraste e paleta de cores.
- **Botão de Bloqueio Rápido**: Bloqueia a aplicação instantaneamente.

### 2. Dashboard Inicial com Overview e Gráficos de Desempenho
- **Cards de Métricas em Tempo Real**:
  - Saldo Geral Líquido.
  - Receitas do Mês (Entradas).
  - Despesas do Mês (Saídas).
  - Taxa de Poupança (% poupado no mês com economia em R$).
  - Total Investido em Ativos.
  - Saldo Devedor em Financiamentos.
  - Patrimônio Líquido Real (Ativos somados − Passivos).
- **Gráficos Interativos (Chart.js)**:
  - 📊 **Fluxo de Caixa Mensal**: Comparativo de barras de Receitas x Despesas mês a mês.
  - 🍩 **Despesas por Categoria**: Gráfico de rosca interativo com percentuais de gastos.
  - 📈 **Trajetória e Evolução Patrimonial**: Curva histórica de crescimento financeiro.
- **Alertas & Ações Rápidas**:
  - Contas e boletos a vencer nos próximos 7 dias com botão direto para "Pagar".
  - Últimas 5 movimentações recentes.

### 3. Página de Lançamentos (Receitas e Despesas)
- **Classificação Visual por Cores**:
  - 🟢 **Receitas em Verde**: Borda lateral verde, badge verde, ícones e valores positivos destacados em verde.
  - 🔴 **Despesas em Vermelho**: Borda lateral vermelha, badge vermelho, ícones e valores negativos destacados em vermelho.
- **Recorrência por até 36 Meses**:
  - Opção de repetir qualquer lançamento por até **36 meses**.
  - **Dois modos de recorrência**:
    1. *Valor fixo contínuo* (ex: Aluguel, Salário, Internet, Mensalidades).
    2. *Parcelamento com divisão do valor total* (ex: Compras de eletrodomésticos, 12x, 24x, 36x).
  - Geração automática das parcelas com numeração sequencial (ex: `Notebook (01/12)`, `Notebook (02/12)`) e datas de vencimento calculadas mês a mês.
- **Filtros e Busca em Tempo Real**:
  - Navegação mês a mês com botões `◀ Mês Anterior` e `Próximo Mês ▶` ou "Ver Todos".
  - Filtro por Tipo (Receitas ou Despesas).
  - Filtro por Categoria personalizável.
  - Filtro por Status (Pago ou Pendente).
  - Ordenação por Data ou Valor.
  - Alternância de status de pagamento (Pago ⇄ Pendente) com 1 clique.

### 4. Página de Investimentos
- **Visão da Carteira de Ativos**:
  - Patrimônio Investido, Custo Aportado, Lucro Total e Rentabilidade % acumulada.
  - Classes de Ativos: Renda Fixa (CDB, Tesouro Direto, LCI/LCA), Fundos Imobiliários (FIIs), Ações, Criptomoedas, Reserva de Emergência.
  - Gráfico de Alocação por Classe de Ativos.
- **Simulador Interativo de Juros Compostos (Bola de Neve)**:
  - Simula Aporte Inicial + Aportes Mensais + Taxa de Juros Anual + Prazo em Anos.
  - Calcula o Valor Final, Capital Próprio vs Juros Ganhos, e **Renda Mensal Passiva Estimada** para aposentadoria.
  - Gráfico dinâmico da curva exponencial de juros compostos.

### 5. Página de Financiamentos e Empréstimos
- **Gestão de Dívidas e Contratos**:
  - Cadastro de Financiamento Imobiliário, Veicular, Consignado, Pessoal ou FIES.
  - Suporte a sistemas **SAC** (parcelas decrescentes) e **Price** (parcelas fixas).
  - Barra de progresso visual de quitação (% quitado vs restante).
  - Botão *"Pagar Parcela do Mês"* que quita a parcela, abate o saldo devedor e lança automaticamente a despesa na aba de lançamentos.
- **Simulador de Amortização Extraordinária**:
  - Simule aportes extras (ex: R$ 5.000 ou R$ 10.000 no saldo devedor):
    - **Reduzir Prazo**: Calcula quantos meses/anos são eliminados e quanto de juros você deixa de pagar ao banco!
    - **Reduzir Parcela**: Calcula o alívio imediato no valor da parcela mensal.
  - Botão para efetivar a amortização imediatamente no contrato.

### 6. Segurança e Senha de Acesso
- **Proteção por Senha / PIN**:
  - Criptografia com hash **SHA-256** local.
  - Tela de bloqueio estilizada (*Lock Screen*) com o porquinho mascote do Rich Pig.
  - Dica de senha e detecção de tentativas incorretas com animação de tremor (*shake*).
  - Botão de bloqueio instantâneo no cabeçalho.

### 7. Importação e Exportação (JSON e CSV)
- **Backup Completo em JSON**: Exporta e restaura 100% dos dados da sua vida financeira com um clique.
- **Exportação em CSV para Excel**: Compatível com Microsoft Excel e Google Planilhas (formato brasileiro com separador `;` e moeda em Real).
- **Importação de CSV**: Permite importar extratos bancários e planilhas externas.
- **Dados de Demonstração (Sample Data)**: Botão para carregar dados de exemplo realistas instantaneamente.

---

## 🚀 Como Executar a Aplicação

### Opção 1: Via Windows (Mais Fácil)
Dê um duplo clique no arquivo:
```
iniciar_rich_pig.bat
```
O script iniciará o servidor local e abrirá seu navegador automaticamente em `http://localhost:3000`.

### Opção 2: Via Linha de Comando (agy-node ou Node.js)
Abra o terminal na pasta do projeto e execute:
```bash
node server.js
```
*(ou se usar o agy-node):*
```powershell
& "C:\Users\LeiaSilva\AppData\Roaming\Antigravity\bin\agy-node.cmd" server.js
```
Em seguida, abra seu navegador em: **`http://localhost:3000`**

### Opção 3: Diretamente no Navegador (Sem servidor)
Basta dar dois cliques no arquivo **`index.html`** para abrir diretamente em qualquer navegador moderno (Edge, Chrome, Firefox, Opera, etc.).

---

## 📁 Estrutura de Arquivos

```
RichPig/
├── index.html              # Interface do usuário completa, responsiva e moderna
├── css/
│   └── styles.css          # Design system, CSS variables claro/escuro, animações
├── js/
│   ├── app.js              # Controlador principal, cabeçalho, modais, tema e toasts
│   ├── state.js            # Estado reativo, persistência e dados de demonstração
│   ├── transactions.js     # Lançamentos (Verde/Vermelho, repetição até 36 meses)
│   ├── investments.js      # Carteira de investimentos e simulador de juros compostos
│   ├── loans.js            # Financiamentos, amortizações SAC/Price e simulador
│   ├── security.js         # Autenticação SHA-256 e tela de bloqueio
│   ├── exportImport.js     # Exportação e importação de JSON e CSV
│   └── charts.js           # Gráficos interativos com Chart.js e fallbacks
├── assets/
│   ├── pig-logo.svg        # Mascote oficial do Rich Pig com olhos de $ e moeda de 1 real
│   └── favicon.svg         # Favicon otimizado para o navegador
├── server.js               # Servidor local Node.js embutido
├── iniciar_rich_pig.bat    # Executável Windows em 1 clique
└── README.md               # Esta documentação
```

---

*Desenvolvido para oferecer controle financeiro pessoal completo, seguro e elegante.* 🐷💰
