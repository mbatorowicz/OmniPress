#!/usr/bin/env node
/**
 * Limit rozmiaru pliku (docs/KONWENCJE.md §3): powyżej 200 linii plik idzie do podziału.
 *
 * Czego nie da się sensownie podzielić, wpisuje się do `scripts/file-size-exceptions.json`
 * z uzasadnieniem i limitem. Skrypt zgłasza też wyjątki nieaktualne — plik, który
 * zmalał albo zniknął, wypada z listy zamiast na niej zostać na zawsze.
 */
import { readFileSync, globSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIMIT = 200;

const exceptions = JSON.parse(readFileSync(join(root, 'scripts/file-size-exceptions.json'), 'utf8'));

const files = globSync('src/**/*.{ts,tsx,astro}', { cwd: root })
	.map((p) => p.replace(/\\/g, '/'))
	.filter((p) => !p.endsWith('.test.ts'))
	.sort();

function countLines(file) {
	return readFileSync(join(root, file), 'utf8').split('\n').length;
}

const sizes = new Map(files.map((f) => [f, countLines(f)]));

const overLimit = [];
const exceeded = [];

for (const [file, lines] of sizes) {
	const allowed = exceptions[file]?.limit;
	if (allowed === undefined) {
		if (lines > LIMIT) overLimit.push({ file, lines });
	} else if (lines > allowed) {
		exceeded.push({ file, lines, allowed });
	}
}

const stale = Object.keys(exceptions).filter((file) => {
	const lines = sizes.get(file);
	return lines === undefined || lines <= LIMIT;
});

const errors = [];

for (const { file, lines } of overLimit) {
	errors.push(`${file} — ${lines} linii (limit ${LIMIT}); podziel albo dopisz wyjątek`);
}
for (const { file, lines, allowed } of exceeded) {
	errors.push(`${file} — ${lines} linii, wyjątek dopuszcza ${allowed}`);
}
for (const file of stale) {
	const lines = sizes.get(file);
	errors.push(
		lines === undefined
			? `${file} — wyjątek dla nieistniejącego pliku, usuń wpis`
			: `${file} — ${lines} linii, mieści się w limicie; usuń wyjątek`,
	);
}

if (errors.length > 0) {
	console.error('lint-file-size: naruszenia limitu rozmiaru plików:\n');
	for (const e of errors) console.error(`  - ${e}`);
	process.exit(1);
}

console.log(
	`lint-file-size: OK (${files.length} plików, ${Object.keys(exceptions).length} wyjątków)`,
);
