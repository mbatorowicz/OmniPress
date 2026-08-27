#!/usr/bin/env node
/**
 * Reguła warstw (docs/KONWENCJE.md §2): `src/components/**` nie sięga po dane.
 *
 * Zbiór modułów „dostępu do danych" nie jest listą do utrzymania — skrypt wylicza
 * go z grafu importów: takim modułem jest każdy, który operuje na kliencie
 * Supabase (bezpośrednio albo przez import innego takiego modułu). Import typów
 * (`import type`) jest dozwolony — znika w kompilacji i nie wciąga kodu do bundla.
 */
import { readFileSync, globSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');

const SUPABASE_PACKAGES = ['@supabase/supabase-js', '@supabase/ssr'];

const files = globSync('**/*.{ts,astro}', { cwd: srcDir })
	.map((p) => p.replace(/\\/g, '/'))
	.filter((p) => !p.endsWith('.test.ts') && !p.endsWith('.integration.test.ts'));

const sources = new Map(files.map((f) => [f, readFileSync(join(srcDir, f), 'utf8')]));

/** `@/lib/posts` → `lib/posts.ts` albo `lib/posts/index.ts` (to, co istnieje) */
function resolveModule(spec, fromFile) {
	let base;
	if (spec.startsWith('@/')) base = spec.slice(2);
	else if (spec.startsWith('.')) base = join(dirname(fromFile), spec).replace(/\\/g, '/');
	else return null;

	for (const candidate of [base, `${base}.ts`, `${base}/index.ts`, `${base}.astro`]) {
		if (sources.has(candidate)) return candidate;
	}
	return null;
}

const IMPORT_RE = /\b(import|export)\s+(type\s+)?(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

/** @returns {{ spec: string, typeOnly: boolean, line: number }[]} */
function readImports(file) {
	const code = sources.get(file) ?? '';
	const out = [];
	const lineOf = (index) => code.slice(0, index).split('\n').length;

	for (const m of code.matchAll(IMPORT_RE)) {
		out.push({ spec: m[3], typeOnly: Boolean(m[2]), line: lineOf(m.index) });
	}
	for (const m of code.matchAll(DYNAMIC_IMPORT_RE)) {
		// `import('…')` w pozycji typu (`let x: import('…').Foo`) nie wciąga kodu
		const before = code.slice(Math.max(0, m.index - 40), m.index);
		const typeOnly = /[:<|&]\s*$/.test(before);
		out.push({ spec: m[1], typeOnly, line: lineOf(m.index) });
	}
	return out;
}

const importsByFile = new Map(files.map((f) => [f, readImports(f)]));

/**
 * Moduły operujące na kliencie Supabase — punkt startowy propagacji.
 * `import type { SupabaseClient }` liczy się: klient wstrzykiwany parametrem
 * to nadal dostęp do danych, tylko z odwróconą zależnością.
 */
const dataModules = new Set();
for (const file of files) {
	const imports = importsByFile.get(file);
	if (imports.some((i) => SUPABASE_PACKAGES.includes(i.spec))) dataModules.add(file);
}

/** file → moduł, przez który wpadł do zbioru (null = importuje Supabase wprost) */
const dataReason = new Map([...dataModules].map((f) => [f, null]));

let grew = true;
while (grew) {
	grew = false;
	for (const file of files) {
		if (dataModules.has(file)) continue;
		for (const imp of importsByFile.get(file)) {
			if (imp.typeOnly) continue;
			const target = resolveModule(imp.spec, file);
			if (target && dataModules.has(target)) {
				dataModules.add(file);
				dataReason.set(file, target);
				grew = true;
				break;
			}
		}
	}
}

const explainTarget = process.argv[2];
if (explainTarget) {
	let cursor = explainTarget.replace(/^src\//, '').replace(/\\/g, '/');
	if (!dataModules.has(cursor)) {
		console.log(`src/${cursor}: nie jest modułem dostępu do danych`);
		process.exit(0);
	}
	while (cursor) {
		const next = dataReason.get(cursor);
		console.log(next ? `src/${cursor} → src/${next}` : `src/${cursor} → Supabase`);
		cursor = next;
	}
	process.exit(0);
}

const violations = [];
for (const file of files) {
	if (!file.startsWith('components/')) continue;
	for (const imp of importsByFile.get(file)) {
		if (imp.typeOnly) continue;
		const target = resolveModule(imp.spec, file);
		if (target && dataModules.has(target)) {
			violations.push({ file, line: imp.line, spec: imp.spec, target });
		}
	}
}

if (violations.length > 0) {
	console.error(
		'lint-layers: komponenty importują moduły dostępu do danych.\n' +
			'Przenieś zapytanie do `pages/` lub `lib/`, importuj z modułu-liścia bez Supabase,\n' +
			'albo zmień na `import type`.\n',
	);
	for (const v of violations) {
		console.error(`  src/${v.file}:${v.line} → ${v.spec}  (dostęp do danych: src/${v.target})`);
	}
	process.exit(1);
}

const componentCount = files.filter((f) => f.startsWith('components/')).length;
console.log(
	`lint-layers: OK (${componentCount} komponentów, ${dataModules.size} modułów danych)`,
);
