'use client';
import { useActionState } from 'react';
import { signIn } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, { error: null });
  return <form action={action}><label htmlFor="email" className="form-field">Email<Input id="email" name="email" type="email" autoComplete="username" required maxLength={254} /></label><label htmlFor="password" className="form-field">Palavra-passe<Input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>{state.error && <p role="alert" className="error-text">{state.error}</p>}<Button type="submit" disabled={pending}>{pending ? 'A iniciar sessão…' : 'Entrar'}</Button></form>;
}

