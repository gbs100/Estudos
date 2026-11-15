/* ========================================================
   Rich Pig Finanças - Módulo de Segurança (security.js)
   Proteção por Senha, Criptografia SHA-256 e Tela de Bloqueio
   ======================================================== */

// Utilitário para gerar Hash SHA-256 de forma segura
async function hashPassword(plainText) {
  if (!plainText) return null;
  try {
    if (window.crypto && window.crypto.subtle) {
      const msgUint8 = new TextEncoder().encode(plainText);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Web Crypto API indisponível, usando fallback de hash:', e);
  }

  // Fallback seguro em JS caso a API de crypto nativa não esteja disponível
  let hash = 0;
  const str = `richpig_salt_${plainText}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

/**
 * Inicializa a segurança na inicialização da página
 */
function initSecurity() {
  const state = window.RichPigState.getState();
  const lockOverlay = document.getElementById('lock-screen');
  
  if (state.settings.hasPassword && state.settings.isLocked) {
    showLockScreen();
  } else {
    hideLockScreen();
  }

  // Monitorar inatividade do usuário se configurado
  setupInactivityTimer();
}

/**
 * Exibe a tela de bloqueio
 */
function showLockScreen() {
  const lockOverlay = document.getElementById('lock-screen');
  if (lockOverlay) {
    lockOverlay.classList.remove('hidden-lock');
    const input = document.getElementById('lock-password-input');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }
    const hintText = document.getElementById('lock-hint-display');
    if (hintText) hintText.textContent = '';
  }
}

/**
 * Esconde a tela de bloqueio
 */
function hideLockScreen() {
  const lockOverlay = document.getElementById('lock-screen');
  if (lockOverlay) {
    lockOverlay.classList.add('hidden-lock');
  }
}

/**
 * Bloqueia a aplicação imediatamente
 */
function lockApp() {
  const state = window.RichPigState.getState();
  if (!state.settings.hasPassword) {
    window.RichPigApp?.showToast('Defina uma senha de acesso nas Configurações primeiro!', 'info');
    window.RichPigApp?.switchTab('settings');
    return;
  }

  window.RichPigState.updateState({
    settings: {
      ...state.settings,
      isLocked: true
    }
  });

  showLockScreen();
  window.RichPigApp?.showToast('Aplicação bloqueada com sucesso!', 'info');
}

/**
 * Tenta desbloquear a aplicação comparando a senha
 */
async function tryUnlock(password) {
  const state = window.RichPigState.getState();
  if (!state.settings.hasPassword) {
    hideLockScreen();
    return true;
  }

  const computedHash = await hashPassword(password);
  if (computedHash === state.settings.passwordHash) {
    // Desbloqueado com sucesso
    window.RichPigState.updateState({
      settings: {
        ...state.settings,
        isLocked: false
      }
    });
    hideLockScreen();
    window.RichPigApp?.showToast('Bem-vindo de volta ao Rich Pig Finanças! 🐷', 'success');
    return true;
  } else {
    // Senha incorreta: Animação de shake no card
    const card = document.querySelector('.lock-card');
    if (card) {
      card.classList.remove('shake');
      void card.offsetWidth; // Força reflow
      card.classList.add('shake');
    }
    const errText = document.getElementById('lock-error-msg');
    if (errText) {
      errText.textContent = 'Senha incorreta. Tente novamente.';
      setTimeout(() => { errText.textContent = ''; }, 3500);
    }
    return false;
  }
}

/**
 * Exibe a dica da senha na tela de bloqueio
 */
function showPasswordHint() {
  const state = window.RichPigState.getState();
  const hintDisplay = document.getElementById('lock-hint-display');
  if (hintDisplay) {
    if (state.settings.passwordHint) {
      hintDisplay.textContent = `💡 Dica: ${state.settings.passwordHint}`;
    } else {
      hintDisplay.textContent = 'Nenhuma dica cadastrada.';
    }
  }
}

/**
 * Configura ou atualiza a senha de acesso
 */
async function setPassword(newPassword, hint = '') {
  if (!newPassword || newPassword.trim().length < 4) {
    throw new Error('A senha deve ter pelo menos 4 caracteres.');
  }

  const hash = await hashPassword(newPassword.trim());
  const state = window.RichPigState.getState();

  window.RichPigState.updateState({
    settings: {
      ...state.settings,
      hasPassword: true,
      passwordHash: hash,
      passwordHint: hint.trim(),
      isLocked: false
    }
  });

  return true;
}

/**
 * Remove a senha de acesso
 */
async function removePassword(currentPassword) {
  const state = window.RichPigState.getState();
  if (!state.settings.hasPassword) return true;

  const hash = await hashPassword(currentPassword);
  if (hash !== state.settings.passwordHash) {
    throw new Error('Senha atual incorreta.');
  }

  window.RichPigState.updateState({
    settings: {
      ...state.settings,
      hasPassword: false,
      passwordHash: null,
      passwordHint: '',
      isLocked: false
    }
  });

  return true;
}

// Timer de Inatividade (opcional)
let inactivityTimer = null;
function setupInactivityTimer() {
  const resetTimer = () => {
    clearTimeout(inactivityTimer);
    const state = window.RichPigState.getState();
    // Se tiver senha e não estiver bloqueado, auto-bloqueia após 15 min de inatividade
    if (state.settings.hasPassword && !state.settings.isLocked) {
      inactivityTimer = setTimeout(() => {
        lockApp();
      }, 15 * 60 * 1000);
    }
  };

  ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, resetTimer, { passive: true });
  });
  resetTimer();
}

window.RichPigSecurity = {
  initSecurity,
  showLockScreen,
  hideLockScreen,
  lockApp,
  tryUnlock,
  showPasswordHint,
  setPassword,
  removePassword,
  hashPassword
};
