const [frontendInput, backendInput] = process.argv.slice(2);

if (!frontendInput || !backendInput) {
  console.error('Uso: npm run verify:deploy -- https://site.exemplo https://backend.exemplo');
  process.exit(2);
}

function origin(value, label) {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error(`${label} deve usar HTTPS.`);
  return url.origin;
}

const frontend = origin(frontendInput, 'Frontend');
const backend = origin(backendInput, 'Backend');

async function request(url, init = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(120_000) });
}

const checks = [
  {
    name: 'Site público',
    run: async () => {
      const response = await request(frontend);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    },
  },
  {
    name: 'Formulário público de pedidos',
    run: async () => {
      const response = await request(`${frontend}/pedidos-material`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    },
  },
  {
    name: 'Backend e configuração da base de dados',
    run: async () => {
      const response = await request(`${backend}/api/health`);
      const body = await response.json();
      if (!response.ok || body.status !== 'ok' || body.databaseConfigured !== true)
        throw new Error(`Resposta inesperada: ${JSON.stringify(body)}`);
    },
  },
  {
    name: 'Backend bloqueado para indexação',
    run: async () => {
      const response = await request(`${backend}/login`);
      const robots = response.headers.get('x-robots-tag') ?? '';
      if (!robots.includes('noindex')) throw new Error('Cabeçalho X-Robots-Tag sem noindex.');
    },
  },
  {
    name: 'Login encaminhado ao backend',
    run: async () => {
      const response = await request(`${frontend}/login`, { redirect: 'manual' });
      const location = response.headers.get('location');
      if (![301, 302, 307, 308].includes(response.status) || !location)
        throw new Error(`Redirecionamento ausente (HTTP ${response.status}).`);
      if (new URL(location, frontend).origin !== backend)
        throw new Error(`Destino incorreto: ${location}`);
    },
  },
  {
    name: 'API pública do portefólio',
    run: async () => {
      const response = await request(`${backend}/api/portfolio`);
      const body = await response.json();
      if (!response.ok || !Array.isArray(body)) throw new Error('A resposta não é uma lista JSON.');
      if (body.some((item) => typeof item.order !== 'number'))
        throw new Error('Existe item do portefólio sem ordem numérica.');
    },
  },
];

let failed = false;
for (const check of checks) {
  try {
    await check.run();
    console.log(`OK  ${check.name}`);
  } catch (error) {
    failed = true;
    console.error(`ERRO  ${check.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) process.exit(1);
console.log('Publicação validada.');
