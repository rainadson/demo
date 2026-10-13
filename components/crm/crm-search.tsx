'use client';

import { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

export function CrmSearch() {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  return (
    <search className="crm-search">
      <form action="/crm/pesquisa" method="get">
        <Search aria-hidden="true" size={17} />
        <input
          aria-label="Pesquisar no CRM"
          maxLength={80}
          minLength={2}
          name="q"
          placeholder="Pesquisar clientes, obras, leads…"
          ref={input}
          required
          type="search"
        />
        <kbd>Ctrl K</kbd>
      </form>
    </search>
  );
}
