'use client';
import { useActionState, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { submitQuote } from './actions';
import { services } from '@/lib/content';
import { company } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const steps = [
  'Tipo de projeto',
  'Imóvel',
  'Projeto',
  'Orçamento',
  'Anexos',
  'Contacto',
];
export function QuoteWizard() {
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(submitQuote, {
    status: 'idle',
    message: '',
  });
  const [startedAt] = useState(() => Date.now());
  const next = (event: React.MouseEvent<HTMLButtonElement>) => {
    // A última transição troca o botão por submit; cancelar a ação deste clique.
    event.preventDefault();
    const fields = formRef.current?.querySelectorAll<HTMLElement>(
      `fieldset[data-step="${step}"] input, fieldset[data-step="${step}"] select, fieldset[data-step="${step}"] textarea`,
    );
    if (
      fields &&
      [...fields].every(
        (field) =>
          !(
            field instanceof HTMLInputElement ||
            field instanceof HTMLSelectElement ||
            field instanceof HTMLTextAreaElement
          ) || field.checkValidity(),
      )
    )
      setStep((value) => value + 1);
    else
      fields?.forEach((field) => {
        if (
          field instanceof HTMLInputElement ||
          field instanceof HTMLSelectElement ||
          field instanceof HTMLTextAreaElement
        )
          field.reportValidity();
      });
  };
  if (state.status === 'success')
    return (
      <section className="quote-success">
        <span>
          <Check aria-hidden="true" />
        </span>
        <p className="eyebrow">PEDIDO RECEBIDO</p>
        <h1>Obrigado por nos contar o seu projeto.</h1>
        <p>{state.message}</p>
        <strong>Referência: {state.reference}</strong>
      </section>
    );
  return (
    <form ref={formRef} action={action} className="quote-form" noValidate>
      <div className="quote-progress">
        <span>0{step + 1}</span>
        <div>
          <b style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <small>0{steps.length}</small>
      </div>
      <input type="hidden" name="startedAt" value={startedAt} />
      <label className="honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <fieldset data-step="0" hidden={step !== 0}>
        <legend>Que tipo de projeto tem em mente?</legend>
        <p>
          Escolha a opção mais próxima. Pode explicar os detalhes mais à frente.
        </p>
        <div className="choice-grid">
          {[...services.map((s) => s.name), 'Outro'].map((name, index) => (
            <label key={name}>
              <input
                type="radio"
                name="service"
                value={name}
                defaultChecked={index === 0}
              />
              <span>{name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset data-step="1" hidden={step !== 1}>
        <legend>Fale-nos do imóvel.</legend>
        <label htmlFor="propertyType">
          Tipo de imóvel
          <select id="propertyType" name="propertyType" defaultValue="Apartamento" required>
            <option>Apartamento</option>
            <option>Moradia</option>
            <option>Espaço comercial</option>
            <option>Edifício</option>
            <option>Outro</option>
          </select>
        </label>
        <label htmlFor="location">
          Localização
          <Input
            id="location"
            name="location"
            placeholder="Concelho ou código postal"
            required
            minLength={2}
            maxLength={160}
          />
        </label>
        <label htmlFor="area">
          Área aproximada
          <Input id="area" name="area" placeholder="Ex.: 85 m²" maxLength={40} />
        </label>
      </fieldset>
      <fieldset data-step="2" hidden={step !== 2}>
        <legend>O que pretende transformar?</legend>
        <label htmlFor="description">
          Descrição do projeto
          <Textarea
            id="description"
            name="description"
            placeholder="Descreva as divisões, trabalhos e prioridades."
            required
            minLength={20}
            maxLength={3000}
          />
        </label>
        <label htmlFor="desiredDate">
          Prazo desejado
          <Input
            id="desiredDate"
            name="desiredDate"
            placeholder="Ex.: iniciar nos próximos 3 meses"
            maxLength={80}
          />
        </label>
        <label htmlFor="currentState">
          Estado atual
          <Input
            id="currentState"
            name="currentState"
            placeholder="Ex.: imóvel habitado, vazio ou em construção"
            maxLength={120}
          />
        </label>
      </fieldset>
      <fieldset data-step="3" hidden={step !== 3}>
        <legend>Qual é a faixa de investimento prevista?</legend>
        <p>
          Esta informação ajuda-nos a enquadrar a solução. Não representa um
          orçamento final.
        </p>
        <div className="choice-grid single">
          {company.budgetBands.map((band, index) => (
            <label key={band}>
              <input
                type="radio"
                name="budgetBand"
                value={band}
                defaultChecked={index === 5}
              />
              <span>{band}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset data-step="4" hidden={step !== 4}>
        <legend>Tem imagens ou plantas?</legend>
        <p>
          Opcional. Até 5 ficheiros JPG, PNG, WebP ou PDF; máximo de 4 MB no
          total.
        </p>
        <label htmlFor="attachments" className="file-field">
          Selecionar ficheiros
          <Input
            id="attachments"
            name="attachments"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
          />
        </label>
      </fieldset>
      <fieldset data-step="5" hidden={step !== 5}>
        <legend>Como podemos falar consigo?</legend>
        <div className="form-columns">
          <label htmlFor="name">
            Nome
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={160}
            />
          </label>
          <label htmlFor="phone">
            Telemóvel
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              minLength={6}
              maxLength={40}
            />
          </label>
        </div>
        <label htmlFor="email">
          Email
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label htmlFor="contactPreference">
          Preferência de contacto
          <select id="contactPreference" name="contactPreference" defaultValue="telefone">
            <option value="telefone">Telefone</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </label>
        <label className="consent">
          <input name="consent" type="checkbox" required />
          <span>
            Autorizo a {company.name} a tratar estes dados para analisar e responder ao meu
            pedido. Li a informação de{' '}
            <a href="/privacidade" target="_blank" rel="noreferrer">
              privacidade
            </a>
            .
          </span>
        </label>
      </fieldset>
      {state.status === 'error' && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}
      <div className="wizard-actions">
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((value) => value - 1)}
          >
            <ArrowLeft />
            Anterior
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button type="button" onClick={next}>
            Continuar
            <ArrowRight />
          </Button>
        ) : (
          <Button type="submit" disabled={pending}>
            {pending ? 'A enviar…' : 'Enviar pedido'}
          </Button>
        )}
      </div>
      <p className="step-name">
        Etapa {step + 1} de {steps.length} · {steps[step]}
      </p>
    </form>
  );
}
