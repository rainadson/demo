'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { submitSupplyRequest } from './actions';
import { requestUnits } from './validation';

export function SupplyRequestForm({ repeatHref = '/pedidos-material' }: { repeatHref?: string } = {}) {
  const [state, action, pending] = useActionState(submitSupplyRequest, { status: 'idle', message: '' });
  const [startedAt] = useState(() => Date.now());

  if (state.status === 'success') return (
    <section className="supply-confirmation">
      <CheckCircle2 aria-hidden="true" size={38} />
      <p className="eyebrow">PEDIDO ENVIADO</p>
      <h2>O gestor recebeu o seu pedido.</h2>
      <p>{state.message}</p>
      <strong>Referência: {state.reference}</strong>
      <Link href={repeatHref}>Fazer outro pedido</Link>
    </section>
  );

  return (
    <form action={action} className="supply-form">
      <input type="hidden" name="startedAt" value={startedAt} />
      <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <fieldset>
        <legend>Quem está a pedir</legend>
        <div className="supply-fields">
          <label>Nome do funcionário<input name="requesterName" required minLength={2} maxLength={160} autoComplete="name" /></label>
          <label className="supply-wide">Obra ou local de trabalho<input name="workSite" required minLength={2} maxLength={160} placeholder="Identifique a obra ou o local" /></label>
        </div>
      </fieldset>
      <fieldset>
        <legend>O que é necessário</legend>
        <div className="supply-fields">
          <label>Tipo de pedido<select name="kind" required defaultValue="MATERIAL"><option value="MATERIAL">Material</option><option value="FERRAMENTA">Ferramenta</option></select></label>
          <label>Prioridade<select name="priority" required defaultValue="NORMAL"><option value="NORMAL">Normal</option><option value="URGENTE">Urgente</option></select></label>
          <label className="supply-wide">Material ou ferramenta<input name="itemName" required minLength={2} maxLength={160} placeholder="Ex.: cimento, broca, berbequim" /></label>
          <label>Quantidade<input name="quantity" type="number" required min="0.001" max="10000" step="0.001" inputMode="decimal" /></label>
          <label>Unidade<select name="unit" required defaultValue="unidade">{requestUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
          <label>Data em que é necessário<input name="neededOn" type="date" required /></label>
          <label className="supply-wide">Observações (opcional)<textarea name="notes" maxLength={1000} rows={4} placeholder="Medidas, especificações ou contexto útil para o gestor" /></label>
        </div>
      </fieldset>
      <p className="supply-notice">O pedido será analisado pelo gestor. O envio não confirma a compra nem a entrega. O nome serve para identificar quem fez o pedido. Consulte a <Link href="/privacidade">informação de privacidade</Link>.</p>
      {state.status === 'error' || state.status === 'unavailable' ? <p className="supply-error" role="alert">{state.message}</p> : null}
      <button className="button-dark" type="submit" disabled={pending}>{pending ? 'A enviar…' : 'Enviar pedido ao gestor'}</button>
    </form>
  );
}
