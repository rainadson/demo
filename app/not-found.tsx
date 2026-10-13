import Link from 'next/link';
import { Brand } from '@/components/brand';
export default function NotFound() { return <main className="workspace"><Brand /><h1>Página não encontrada.</h1><Link href="/">Voltar ao início</Link></main>; }
