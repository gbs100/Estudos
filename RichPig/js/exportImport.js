/* ========================================================
   Rich Pig Finanças - Módulo de Importação e Exportação (exportImport.js)
   Exportação e Importação completa em JSON e CSV
   ======================================================== */

/**
 * Dispara o download de um arquivo no navegador
 */
function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * EXPORTAR BACKUP COMPLETO EM JSON
 */
function exportJSON() {
  const state = window.RichPigState.getState();
  const exportPayload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    appName: 'Rich Pig Finanças',
    data: {
      transactions: state.transactions,
      investments: state.investments,
      loans: state.loans,
      categories: state.categories,
      settings: {
        theme: state.settings.theme,
        currency: state.settings.currency,
        privacyMode: state.settings.privacyMode
      }
    }
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(jsonString, `richpig_backup_${dateStr}.json`, 'application/json;charset=utf-8');
  window.RichPigApp?.showToast('Backup JSON exportado com sucesso! 📦', 'success');
}

/**
 * EXPORTAR LANÇAMENTOS EM CSV (FORMATO EXCEL BRASIL)
 */
function exportTransactionsCSV() {
  const state = window.RichPigState.getState();
  const transactions = state.transactions;

  if (transactions.length === 0) {
    window.RichPigApp?.showToast('Nenhum lançamento para exportar.', 'info');
    return;
  }

  // UTF-8 BOM para garantir acentos corretos no Excel no Windows
  let csv = '\uFEFF';
  const headers = ['ID', 'Data', 'Tipo', 'Categoria', 'Descricao', 'Valor (R$)', 'Status', 'Forma de Pagamento', 'Recorrente', 'Observacoes'];
  csv += headers.join(';') + '\r\n';

  transactions.forEach(t => {
    const isIncome = t.type === 'income';
    const catList = isIncome ? state.categories.income : state.categories.expense;
    const cat = catList.find(c => c.id === t.category);
    const catName = cat ? cat.name : t.category;

    const row = [
      escapeCsv(t.id),
      escapeCsv(t.date),
      escapeCsv(isIncome ? 'Receita' : 'Despesa'),
      escapeCsv(catName),
      escapeCsv(t.description),
      (t.amount || 0).toFixed(2).replace('.', ','),
      escapeCsv(t.status === 'paid' ? 'Pago' : 'Pendente'),
      escapeCsv(t.paymentMethod || ''),
      escapeCsv(t.recurrenceId ? 'Sim' : 'Nao'),
      escapeCsv(t.notes || '')
    ];
    csv += row.join(';') + '\r\n';
  });

  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(csv, `richpig_lancamentos_${dateStr}.csv`, 'text/csv;charset=utf-8');
  window.RichPigApp?.showToast('Planilha CSV de Lançamentos exportada! 📊', 'success');
}

/**
 * EXPORTAR INVESTIMENTOS EM CSV
 */
function exportInvestmentsCSV() {
  const state = window.RichPigState.getState();
  const investments = state.investments;

  if (investments.length === 0) {
    window.RichPigApp?.showToast('Nenhum investimento para exportar.', 'info');
    return;
  }

  let csv = '\uFEFF';
  const headers = ['ID', 'Ativo / Nome', 'Classe / Tipo', 'Instituicao', 'Valor Aportado (R$)', 'Valor Atual (R$)', 'Retorno Estimado', 'Data Aporte', 'Notas'];
  csv += headers.join(';') + '\r\n';

  investments.forEach(inv => {
    const row = [
      escapeCsv(inv.id),
      escapeCsv(inv.name),
      escapeCsv(inv.type),
      escapeCsv(inv.institution),
      (inv.investedAmount || 0).toFixed(2).replace('.', ','),
      (inv.currentAmount || 0).toFixed(2).replace('.', ','),
      escapeCsv(inv.expectedReturn || ''),
      escapeCsv(inv.date || ''),
      escapeCsv(inv.notes || '')
    ];
    csv += row.join(';') + '\r\n';
  });

  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(csv, `richpig_investimentos_${dateStr}.csv`, 'text/csv;charset=utf-8');
  window.RichPigApp?.showToast('Investimentos exportados em CSV! 📈', 'success');
}

/**
 * IMPORTAR BACKUP JSON
 */
function importJSONFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      
      // Suporta estrutura direta ou com envelope { data: ... }
      const payload = parsed.data || parsed;

      if (!payload.transactions && !payload.investments && !payload.loans) {
        throw new Error('Arquivo JSON não possui formato válido do Rich Pig.');
      }

      const state = window.RichPigState.getState();
      const updated = {
        transactions: Array.isArray(payload.transactions) ? payload.transactions : state.transactions,
        investments: Array.isArray(payload.investments) ? payload.investments : state.investments,
        loans: Array.isArray(payload.loans) ? payload.loans : state.loans,
        categories: payload.categories || state.categories
      };

      window.RichPigState.updateState(updated);
      window.RichPigApp?.refreshAllViews();
      window.RichPigApp?.showToast('Backup JSON restaurado com sucesso! 🎉', 'success');
    } catch (err) {
      console.error(err);
      alert('Erro ao importar arquivo JSON: ' + err.message);
    }
  };
  reader.readAsText(file, 'utf-8');
}

/**
 * IMPORTAR LANÇAMENTOS VIA CSV
 */
function importCSVFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      
      if (lines.length <= 1) {
        throw new Error('Arquivo CSV vazio ou sem linhas de dados.');
      }

      // Detecta separador (; ou ,)
      const firstLine = lines[0];
      const sep = firstLine.includes(';') ? ';' : ',';

      const state = window.RichPigState.getState();
      const newTransactions = [...state.transactions];
      let importedCount = 0;

      // Pula cabeçalho
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i], sep);
        if (cols.length < 4) continue;

        // Mapeamento flexível por posição ou nomes comuns
        // Esperado: [ID, Data, Tipo, Categoria, Descrição, Valor, Status, FormaPagamento, ...]
        let rawDate = cols[1] || new Date().toISOString().split('T')[0];
        let rawType = (cols[2] || '').toLowerCase().includes('rec') ? 'income' : 'expense';
        let rawCat = cols[3] || 'outras_despesas';
        let rawDesc = cols[4] || cols[0] || 'Lançamento Importado';
        let rawAmount = cols[5] || cols[cols.length - 1] || '0';

        // Normaliza data (DD/MM/YYYY -> YYYY-MM-DD)
        if (rawDate.includes('/')) {
          const dParts = rawDate.split('/');
          if (dParts.length === 3) {
            rawDate = `${dParts[2]}-${dParts[1].padStart(2, '0')}-${dParts[0].padStart(2, '0')}`;
          }
        }

        // Normaliza valor (R$ 1.250,50 -> 1250.50)
        let cleanAmt = String(rawAmount).replace(/[R$\s]/g, '');
        if (cleanAmt.includes(',') && cleanAmt.includes('.')) {
          cleanAmt = cleanAmt.replace(/\./g, '').replace(',', '.');
        } else if (cleanAmt.includes(',')) {
          cleanAmt = cleanAmt.replace(',', '.');
        }
        const parsedAmt = Math.abs(parseFloat(cleanAmt)) || 0;

        if (parsedAmt > 0) {
          newTransactions.push({
            id: window.RichPigState.generateId('tx_csv'),
            description: rawDesc.trim(),
            amount: parsedAmt,
            type: rawType,
            category: rawCat,
            date: rawDate,
            paymentMethod: cols[7] || 'Importação CSV',
            status: (cols[6] || '').toLowerCase().includes('pen') ? 'pending' : 'paid',
            notes: cols[9] || 'Importado via CSV'
          });
          importedCount++;
        }
      }

      if (importedCount === 0) {
        throw new Error('Nenhuma linha pôde ser convertida em lançamento válido.');
      }

      window.RichPigState.updateState({ transactions: newTransactions });
      window.RichPigApp?.refreshAllViews();
      window.RichPigApp?.showToast(`${importedCount} lançamentos importados do CSV com sucesso! 📥`, 'success');
    } catch (err) {
      console.error(err);
      alert('Erro ao importar CSV: ' + err.message);
    }
  };
  reader.readAsText(file, 'utf-8');
}

function parseCsvLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

window.RichPigExportImport = {
  exportJSON,
  exportTransactionsCSV,
  exportInvestmentsCSV,
  importJSONFile,
  importCSVFile
};
