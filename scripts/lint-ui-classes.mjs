#!/usr/bin/env node
/**
 * Blokuje surowe utility kolorów Tailwind w plikach domenowych.
 * SSOT: klasy ui-* z src/styles/ui.css lub komponenty src/components/ui/.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const MAX_CLASS_LEN = 120;

const SCAN_DIRS = [
	'src/pages',
	'src/layouts',
	'src/components/admin',
	'src/components/posts',
	'src/components/shared',
	'src/components/shell',
	'src/lib/editor',
	'src/lib/admin',
];

const ALLOW_PATH_PARTS = ['src/components/ui/', 'src/styles/'];

const COLOR_UTILITY =
	/\b(text|bg|border|divide|ring|from|to|via)-(slate|gray|zinc|neutral|stone|red|amber|sky|violet|blue|green)-\d+/g;

const QUOTED_CLASS = /\bclass=(["'])([\s\S]*?)\1/g;

function walk(dir, files = []) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		const stat = statSync(path);
		if (stat.isDirectory()) walk(path, files);
		else if (/\.(astro|tsx?|jsx?|mjs)$/.test(name)) files.push(path);
	}
	return files;
}

function isAllowedPath(filePath) {
	const rel = relative(ROOT, filePath).replaceAll('\\', '/');
	return ALLOW_PATH_PARTS.some((part) => rel.startsWith(part));
}

function checkFile(filePath) {
	if (isAllowedPath(filePath)) return [];

	const rel = relative(ROOT, filePath).replaceAll('\\', '/');
	const content = readFileSync(filePath, 'utf8');
	const issues = [];

	for (const match of content.matchAll(QUOTED_CLASS)) {
		const raw = match[2];
		if (raw.length > MAX_CLASS_LEN) {
			issues.push(`${rel}: class string > ${MAX_CLASS_LEN} znaków`);
		}
		for (const colorMatch of raw.matchAll(COLOR_UTILITY)) {
			issues.push(`${rel}: niedozwolony utility koloru «${colorMatch[0]}»`);
		}
	}

	for (const line of content.split('\n')) {
		if (!line.includes('class="') && !line.includes("class='")) continue;
		for (const classMatch of line.matchAll(QUOTED_CLASS)) {
			const raw = classMatch[2];
			if (raw.includes('nav-href-') || raw.includes('slot-preview')) continue;
			for (const colorMatch of raw.matchAll(COLOR_UTILITY)) {
				const already = issues.some((i) => i.includes(colorMatch[0]) && i.startsWith(rel));
				if (!already) {
					issues.push(`${rel}: niedozwolony utility koloru «${colorMatch[0]}»`);
				}
			}
		}
	}

	return issues;
}

const files = SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir)));
const allIssues = files.flatMap(checkFile);

if (allIssues.length > 0) {
	console.error('lint-ui-classes: znaleziono naruszenia SSOT stylów:\n');
	for (const issue of allIssues) console.error(`  - ${issue}`);
	process.exit(1);
}

console.log(`lint-ui-classes: OK (${files.length} plików)`);
