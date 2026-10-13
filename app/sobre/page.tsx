import { institutionalContent } from '@/lib/content';
import { company } from '@/lib/config';
import type { Metadata } from 'next';
import { PageIntro, PublicFooter, PublicHeader, ProjectCta } from '@/components/public-shell';
export const metadata: Metadata = { title: 'Sobre', description: 'Planeamento, transparência e qualidade na construção e renovação.' };
const values=[['Planeamento','Antecipar decisões, dependências e riscos antes de entrarem em obra.'],['Transparência','Partilhar o estado do trabalho, as escolhas e os próximos passos.'],['Acompanhamento','Manter uma ligação contínua entre cliente, equipa e execução.'],['Qualidade','Cuidar dos suportes, dos materiais e dos remates que determinam a duração.'],['Compromisso','Assumir prazos realistas e comunicar cedo quando alguma condição muda.'],['Organização','Registar a informação essencial para que a obra avance com clareza.']];
export default function About(){return <main><PublicHeader /><PageIntro eyebrow={"SOBRE A " + company.shortName.toUpperCase()} title={institutionalContent.title} text={institutionalContent.about}/><section className="values-grid">{values.map(([title,text],index)=><article key={title}><span>{String(index+1).padStart(2,'0')}</span><h2>{title}</h2><p>{text}</p></article>)}</section><ProjectCta /><PublicFooter /></main>}
