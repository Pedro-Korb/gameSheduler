/* ── state.js ──────────────────────────────
   Estado global compartilhado por todos os módulos.
   Usa um objeto único (singleton) — módulos ES importam
   a mesma referência, então mutações são refletidas globalmente.
─────────────────────────────────────────── */

export const S = {
  matches: [],
  friends: [],
  games:   [],
  settings: {},
  filter:  'all',
  editMatchId:  null,
  editFriendId: null,
  editGameId:   null,
  selectedGameId: null,
  selectedFriendIds: new Set(),
  selectedNotifyChannels: new Set(['discord_dm']),
  notifyBefore: 15,
  durationMinutes: 60,
  friendColor: '#5b8dee',
};

export const COLORS = ['#5b8dee','#7c5ef0','#f04444','#f5a623','#22c55e','#00e5ff','#ff4655','#c89b3c','#cd4227','#7fb238'];
export const TIMER_MAP = new Map();
