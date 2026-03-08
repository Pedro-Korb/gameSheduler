/* ── js/app.js ─────────────────────────────
   Boot da aplicação.

   Este é o único entry point carregado pelo HTML
   como <script type="module">.

   Responsabilidades:
   1. Importar todos os módulos
   2. Expor funções como window.* para os onclick
      inline do HTML (necessário em ES Modules)
   3. Inicializar a aplicação
─────────────────────────────────────────── */

import { loadAll }        from './api.js';
import { startClock }     from './notifications.js';
import { initEvents }     from './events.js';
import { toast, rmToast } from './toast.js';

// Match modal
import {
  openMatchModal, editMatch, viewMatch,
  deleteMatch, triggerNotify,
  selectGame, toggleFriend, submitMatch,
} from './modals/match-modal.js';

// Friend modal
import {
  openFriendModal, editFriend, viewFriend,
  deleteFriend, submitFriend, pickFriendColor,
} from './modals/friend-modal.js';

// Game modal
import {
  openGameModal, editGame, viewGame,
  deleteGame, submitGame,
} from './modals/game-modal.js';

// Settings
import { saveSettings, testWebhook } from './settings.js';

// Shared modal helpers
import { closeModal } from './modals/shared.js';

/* ─── Expor no window (inline onclick handlers) ─── */
Object.assign(window, {
  // Partidas
  openMatchModal, editMatch, viewMatch,
  deleteMatch, triggerNotify,
  selectGame, toggleFriend, submitMatch,
  // Amigos
  openFriendModal, editFriend, viewFriend,
  deleteFriend, submitFriend, pickFriendColor,
  // Jogos
  openGameModal, editGame, viewGame,
  deleteGame, submitGame,
  // Configurações
  saveSettings, testWebhook,
  // Utilitários
  closeModal, toast, rmToast,
});

/* ─── Inicialização ──────────────────────── */
initEvents();
loadAll();
startClock(loadAll);

if ('Notification' in window && Notification.permission === 'default') {
  setTimeout(() => Notification.requestPermission(), 2500);
}
