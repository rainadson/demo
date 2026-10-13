'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return <button className="crm-secondary print-button" onClick={() => window.print()} type="button"><Printer size={16} /> Imprimir / guardar PDF</button>;
}
