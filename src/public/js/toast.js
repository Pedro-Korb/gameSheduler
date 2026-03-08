/* ── toast.js ──────────────────────────────
   Sistema de notificações visuais (toasts).
─────────────────────────────────────────── */

export function toast(icon, title, msg, color = 'var(--accent)', duration = 4500) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderColor = typeof color === 'string' && color.startsWith('#')
    ? color + '66' : color;
  el.innerHTML = `
    <div class="t-icon">${icon}</div>
    <div class="t-body">
      <div class="t-title" style="color:${color}">${title}</div>
      ${msg ? `<div class="t-msg">${msg}</div>` : ''}
    </div>
    <button class="t-close" onclick="this.parentElement && rmToast(this.parentElement)">✕</button>`;
  document.getElementById('toasts').prepend(el);
  setTimeout(() => rmToast(el), duration);
  const all = document.querySelectorAll('.toast');
  if (all.length > 5) rmToast(all[all.length-1]);
}

export function rmToast(el) {
  if (!el || el.classList.contains('out')) return;
  el.classList.add('out');
  el.addEventListener('animationend', () => el.remove(), { once: true });
}
