'use client';

import { X } from 'lucide-react';

export function ClosePanelButton() {
  return (
    <button
      aria-label="Fechar janela"
      className="create-panel-close"
      onClick={(event) => {
        event.currentTarget.closest('details')?.removeAttribute('open');
      }}
      type="button"
    >
      <X aria-hidden="true" size={18} />
    </button>
  );
}
