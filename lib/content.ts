import { company } from './config';

export const institutionalContent = {
  title: 'Construir com cuidado. Renovar com confiança.',
  introduction: company.description,
  about: `Na ${company.shortName}, cada projeto começa por compreender o espaço e o que pretende alcançar. Acompanhamos as decisões e a execução, com atenção aos materiais, aos detalhes e à qualidade dos acabamentos.`,
  approach: 'Da estrutura aos acabamentos, damos importância à preparação dos trabalhos, à comunicação e ao acompanhamento de cada etapa.',
} as const;

// Catálogo herdado da base, mantido nesta etapa sem acrescentar serviços.
export const services = [
  { slug: 'remodelacao-completa', name: 'Remodelação completa', intro: 'Um novo uso para o espaço, com atenção a cada etapa da intervenção.', details: 'Partimos das suas necessidades para organizar os trabalhos e acompanhar a execução, desde a preparação até aos últimos acabamentos.' },
  { slug: 'apartamentos', name: 'Apartamentos', intro: 'Remodelações pensadas para o espaço que tem e a forma como o utiliza.', details: 'Consideramos as condições do edifício, os acessos e as áreas comuns na preparação da obra, com cuidado na execução dentro de casa.' },
  { slug: 'moradias', name: 'Moradias', intro: 'Interiores e exteriores preparados para as necessidades da sua casa.', details: 'Acompanhamos a renovação dos espaços, tendo em conta a ligação entre divisões, os materiais e o cuidado com os acabamentos.' },
  { slug: 'cozinhas', name: 'Cozinhas', intro: 'Renovar um espaço central na vida da casa.', details: 'Organizamos a intervenção de acordo com a disposição e os equipamentos previstos, articulando revestimentos, iluminação e redes técnicas.' },
  { slug: 'casas-de-banho', name: 'Casas de banho', intro: 'Cuidado na preparação, precisão nos acabamentos.', details: 'Acompanhamos os trabalhos de canalização, impermeabilização e revestimento, com atenção à instalação dos equipamentos e aos remates.' },
  { slug: 'pintura', name: 'Pintura', intro: 'Renovar superfícies começa por uma preparação cuidada.', details: 'Observamos o estado das paredes e dos tetos para definir a preparação e a aplicação adequadas ao acabamento pretendido.' },
  { slug: 'pladur', name: 'Pladur', intro: 'Divisórias e tetos que acompanham a organização do espaço.', details: 'Executamos soluções em pladur de acordo com o projeto, considerando os pontos de iluminação, o isolamento e os acabamentos.' },
  { slug: 'pavimentos', name: 'Pavimentos', intro: 'Uma base cuidada para cada divisão.', details: 'Preparamos as superfícies e acompanhamos a aplicação do pavimento, com atenção ao nivelamento, às juntas e às transições entre espaços.' },
  { slug: 'fachadas', name: 'Fachadas', intro: 'Atenção ao exterior e às condições do edifício.', details: 'Avaliamos o estado da fachada para enquadrar os trabalhos de renovação e os materiais adequados à intervenção.' },
  { slug: 'construcao', name: 'Construção', intro: 'Do trabalho estrutural ao detalhe final.', details: 'Acompanhamos a construção nas suas diferentes etapas, com preparação, organização da execução e compromisso com o projeto definido.' },
  { slug: 'manutencao', name: 'Manutenção', intro: 'Cuidar do imóvel através de intervenções ajustadas.', details: 'Identificamos as necessidades de manutenção e organizamos os trabalhos em função do estado do espaço e das prioridades acordadas.' },
] as const;

export const processSteps = [
  ['01', 'Conversa', 'Ouvimos as suas ideias e procuramos compreender o que o espaço precisa.'],
  ['02', 'Visita', 'Observamos as condições no local e recolhemos a informação necessária.'],
  ['03', 'Planeamento', 'Clarificamos os trabalhos, os materiais, o orçamento e a sequência de execução.'],
  ['04', 'Execução', 'Acompanhamos os trabalhos e mantemos consigo o contacto ao longo da obra.'],
  ['05', 'Entrega', 'Revemos os trabalhos realizados e os detalhes dos acabamentos.'],
] as const;
