import type { LucideIcon } from 'lucide-react';
import { ClosePanelButton } from './close-panel-button';

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="crm-page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}

export function CreatePanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <details className="create-panel">
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <b aria-hidden="true">+</b>
      </summary>
      <div className="create-panel-body">
        <ClosePanelButton />
        {children}
      </div>
    </details>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="crm-empty large">
      <Icon aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-line" aria-label={label ?? `${safe}% concluído`}>
      <span>
        <b>{Math.round(safe)}%</b>
        {label && <small>{label}</small>}
      </span>
      <div>
        <i style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

export function Metric({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'default' | 'positive' | 'warning' | 'danger';
}) {
  return (
    <article className={`executive-metric tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

export function FormActions({ label = 'Guardar' }: { label?: string }) {
  return (
    <div className="crm-form-actions">
      <button className="crm-primary" type="submit">
        {label}
      </button>
    </div>
  );
}
