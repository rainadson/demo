import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migrationsDirectory = resolve(root, 'supabase', 'migrations');
const outputDirectory = resolve(root, 'output');
const outputFile = resolve(outputDirectory, 'supabase-migrations.sql');

const files = (await readdir(migrationsDirectory))
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort((left, right) => left.localeCompare(right));

if (!files.length) throw new Error('Nenhuma migração SQL encontrada.');

const sections = [];
for (const file of files) {
  const sql = await readFile(resolve(migrationsDirectory, file), 'utf8');
  sections.push(`-- ============================================================\n-- ${file}\n-- ============================================================\n${sql.trim()}\n`);
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, `${sections.join('\n')}\n`, 'utf8');
console.log(`Bundle criado com ${files.length} migrações: ${outputFile}`);
