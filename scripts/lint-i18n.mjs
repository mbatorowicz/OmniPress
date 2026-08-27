#!/usr/bin/env node
/**
 * Polskie diakrytyki poza src/i18n/ — regresja i18n (P1-13).
 * SSOT wyjątków: scripts/i18n-exceptions.json (legacy debt).
 * Zero tolerancji: STRICT_ZERO — nowe napisy UI muszą trafić do i18n.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const POLISH = /[\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c\u0104\u0106\u0118\u0141\u0143\u00d3\u015a\u0179\u017b]/;

/** Ścieżki względem repo — muszą mieć 0 linii z polskimi diakrytykami (poza komentarzami). */
const STRICT_ZERO = [
	'src/components/admin/layout-slots/',
	'src/components/admin/ChannelTestButton.astro',
	'src/lib/admin/channel-test.ts',
];

const SCAN_ROOT = 'src';
const EXCEPTIONS_PATH = join(ROOT, 'scripts/i18n-exceptions.json');

function walk(dir, files = []) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) {
			if (path.replace(/\\/g, '/').endsWith('src/i18n')) continue;
			walk(path, files);
		} else if (/\.(ts|tsx|astro|mjs)$/.test(name) && !name.endsWith('.test.ts')) {
			files.push(path);
		}
	}
	return files;
}

function isCommentLine(trimmed) {
	if (trimmed.startsWith('//')) return true;
	if (trimmed.startsWith('*') || trimmed.startsWith('/**') || trimmed.startsWith('*/')) return true;
	return false;
}

function countPolishLines(content) {
	let count = 0;
	for (const line of content.split('\n')) {
		if (!POLISH.test(line)) continue;
		if (isCommentLine(line.trim())) continue;
		count++;
	}
	return count;
}

function relPos(absPath) {
	return relative(ROOT, absPath).replace(/\\/g, '/');
}

function isStrictZero(rel) {
	return STRICT_ZERO.some((prefix) =>
		prefix.endsWith('/') ? rel.startsWith(prefix) : rel === prefix,
	);
}

function loadExceptions() {
	try {
		const raw = JSON.parse(readFileSync(EXCEPTIONS_PATH, 'utf8'));
		return raw.files ?? {};
	} catch {
		return {};
	}
}

function scanAll() {
	const files = walk(join(ROOT, SCAN_ROOT));
	const counts = {};
	for (const file of files) {
		const rel = relPos(file);
		if (rel.includes('/i18n/')) continue;
		const n = countPolishLines(readFileSync(file, 'utf8'));
		if (n > 0) counts[rel] = n;
	}
	return counts;
}

const updateMode = process.argv.includes('--update');
const counts = scanAll();

if (updateMode) {
	const legacy = {};
	for (const [rel, n] of Object.entries(counts)) {
		if (!isStrictZero(rel)) legacy[rel] = n;
	}
	writeFileSync(
		EXCEPTIONS_PATH,
		`${JSON.stringify({ files: legacy }, null, '\t')}\n`,
		'utf8',
	);
	console.log(`lint-i18n: zaktualizowano ${EXCEPTIONS_PATH} (${Object.keys(legacy).length} plików)`);
	process.exit(0);
}

const exceptions = loadExceptions();
const errors = [];

for (const [rel, n] of Object.entries(counts)) {
	if (isStrictZero(rel)) {
		if (n > 0) errors.push(`${rel}: ${n} linii z polskimi znakami (STRICT_ZERO — przenieś do src/i18n/)`);
		continue;
	}
	const allowed = exceptions[rel];
	if (allowed === undefined) {
		errors.push(`${rel}: ${n} linii — brak wpisu w i18n-exceptions.json (nowy hardkod lub uruchom --update po migracji)`);
	} else if (n > allowed) {
		errors.push(`${rel}: ${n} linii (limit wyjątku: ${allowed}) — dodaj tekst do i18n zamiast hardkodu`);
	}
}

for (const rel of Object.keys(exceptions)) {
	if (!(rel in counts)) {
		errors.push(`${rel}: wpis w i18n-exceptions.json, ale plik już bez polskich znaków — usuń wyjątek`);
	}
}

if (errors.length > 0) {
	console.error('lint-i18n: naruszenia SSOT i18n:\n');
	for (const e of errors) console.error(`  - ${e}`);
	process.exit(1);
}

console.log(
	`lint-i18n: OK (${Object.keys(counts).length} plików z legacy, ${STRICT_ZERO.length} stref zero-tolerancji)`,
);
