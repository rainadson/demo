'use client';
import { Button } from '@/components/ui/button';
import { Brand } from '@/components/brand';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="workspace"><Brand /><h1>Não foi possível carregar esta página.</h1><p>Tente novamente dentro de instantes.</p><Button onClick={reset}>Tentar novamente</Button></main>; }
