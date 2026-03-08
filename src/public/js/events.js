/* ── events.js ─────────────────────────────
   Registra todos os event listeners globais da UI
   (tabs, filtros, notify-opts, channel-chips, overlays).
─────────────────────────────────────────── */

import { S } from './state.js';
import { renderMatches } from './render/matches.js';
import { closeModal }    from './modals/shared.js';

export function initEvents() {
  // ── Tab Navigation ─────────────────────
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // ── Filters ────────────────────────────
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.filter = btn.dataset.f;
      renderMatches();
    });
  });

  // ── Notify before options ──────────────
  document.querySelectorAll('.notify-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.notify-opt').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      S.notifyBefore = parseInt(btn.dataset.m);
    });
  });

  // ── Channel chips ──────────────────────
  document.querySelectorAll('.channel-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const ch = btn.dataset.ch;
      if (S.selectedNotifyChannels.has(ch)) S.selectedNotifyChannels.delete(ch);
      else S.selectedNotifyChannels.add(ch);
      btn.classList.toggle('sel', S.selectedNotifyChannels.has(ch));
    });
  });

  // ── Fechar overlay ao clicar fora ──────
  document.querySelectorAll('.overlay').forEach(ov => {
    ov.addEventListener('click', e => {
      if (e.target === ov) ov.classList.remove('show');
    });
  });
}
