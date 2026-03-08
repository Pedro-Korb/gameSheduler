/* ── modals/shared.js ──────────────────────
   Utilitários compartilhados pelos modais:
   abrir/fechar overlay e modo de visualização.

   BUG FIX: applyViewMode(false) é chamado sempre
   que um modal abre, limpando estado anterior de
   visualização antes de re-aplicar o modo correto.
─────────────────────────────────────────── */

export function openModal(id)  { document.getElementById(id).classList.add('show'); }
export function closeModal(id) { document.getElementById(id).classList.remove('show'); }

/**
 * Aplica ou remove o modo de só-leitura num modal.
 * viewMode=true  → desabilita campos, esconde botão salvar, muda título.
 * viewMode=false → restaura tudo (DEVE ser chamado antes de reabrir em modo editar).
 */
export function applyViewMode(modalId, submitBtnId, titleElId, titleText, viewMode) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  if (viewMode) {
    modal.querySelectorAll('.fi,.fs,.fta').forEach(el => {
      el.disabled = true;
      el.style.opacity = '.55';
      el.style.cursor = 'not-allowed';
    });
    modal.querySelectorAll('.notify-opt,.channel-chip,.fp-item,.gp-item,.swatch').forEach(el => {
      el.style.pointerEvents = 'none';
      el.style.opacity = '.5';
    });
    const btn = document.getElementById(submitBtnId);
    if (btn) btn.style.display = 'none';
    const titleEl = document.getElementById(titleElId);
    if (titleEl) titleEl.innerHTML = titleText;
  } else {
    // Reset — garante que o modo editar sempre parte de um estado limpo
    modal.querySelectorAll('.fi,.fs,.fta').forEach(el => {
      el.disabled = false;
      el.style.opacity = '';
      el.style.cursor  = '';
    });
    modal.querySelectorAll('.notify-opt,.channel-chip,.fp-item,.gp-item,.swatch').forEach(el => {
      el.style.pointerEvents = '';
      el.style.opacity = '';
    });
    const btn = document.getElementById(submitBtnId);
    if (btn) btn.style.display = '';
  }
}
