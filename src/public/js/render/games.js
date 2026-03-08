/* ── render/games.js ───────────────────────
   Renderiza o catálogo de jogos.
─────────────────────────────────────────── */

import { S } from '../state.js';
import { esc } from '../utils.js';

export function renderGames() {
  const grid = document.getElementById('games-grid');
  if (!S.games.length) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">🎮</div><h3>Nenhum jogo cadastrado</h3><p>Clique em "+ Novo Jogo"</p></div>`;
    return;
  }
  grid.innerHTML = S.games.map((g, i) => {
    const imgUrl = (g.image_url || '').trim();
    const bgStyle = imgUrl
      ? `background:url('${imgUrl}') center/cover no-repeat`
      : `background:${g.bg_color||'#0c1018'}`;
    const overlays = imgUrl
      ? `<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.3) 0%,rgba(0,0,0,.72) 100%)"></div>`
      : `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,${g.color||'#5b8dee'}22 0%,transparent 70%)"></div><div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 0%,${g.bg_color||'#0c1018'} 100%)"></div>`;
    return `
  <div class="game-card" style="animation-delay:${i*.05}s">
    <div class="game-card-banner" style="${bgStyle}">
      ${overlays}
      ${!imgUrl ? `<span style="position:relative;z-index:1;font-size:2rem;filter:drop-shadow(0 2px 8px rgba(0,0,0,.8))">${g.emoji||'🎮'}</span>` : ''}
    </div>
    <div class="game-card-body">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="width:10px;height:10px;border-radius:50%;background:${g.color||'#5b8dee'};box-shadow:0 0 6px ${g.color||'#5b8dee'};flex-shrink:0"></span>
        <div class="game-card-name">${esc(g.name)}</div>
      </div>
      ${g.description ? `<div class="game-card-desc">${esc(g.description)}</div>` : ''}
      <div class="game-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="viewGame(${g.id})">👁️ Ver</button>
        <button class="btn btn-ghost btn-sm" onclick="editGame(${g.id})">✏️ Editar</button>
        <button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="deleteGame(${g.id})">🗑️</button>
      </div>
    </div>
  </div>`;
  }).join('');
}
