/**
 * Jednorazowa korekta językowa treści (repo Astro).
 * Osobna passa od czyszczenia artefaktów WP.
 * Użycie: node scripts/proofread-news.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { yamlQuote } from './lib/wp-migrate-html.mjs';
import { unescapeYamlScalar } from './lib/clean-md-artifacts.mjs';
import { proofreadExcerpt, proofreadMarkdown, proofreadTitle } from './lib/clean-md-language.mjs';

const REPO_B = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../gmina-miedzna.pl');
const ROOTS = [path.join(REPO_B, 'src/content/news'), path.join(REPO_B, 'src/content/pages')];

function normalize(raw) {
	return raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

function splitFm(raw) {
	if (!raw.startsWith('---\n')) return { fm: '', body: raw };
	const end = raw.indexOf('\n---', 4);
	if (end < 0) return { fm: '', body: raw };
	return { fm: raw.slice(0, end + 4), body: raw.slice(end + 4) };
}

function readQuoted(fm, key) {
	const m = fm.match(new RegExp(`^${key}:\\s*"(.*)"\\s*$`, 'm'));
	if (!m) return '';
	return unescapeYamlScalar(m[1]);
}

function setQuoted(fm, key, value) {
	const line = new RegExp(`^${key}:\\s*".*"\\s*$`, 'm');
	if (!line.test(fm)) return fm;
	return fm.replace(line, `${key}: ${yamlQuote(value)}`);
}

function walk(dir, acc = []) {
	if (!fs.existsSync(dir)) return acc;
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, ent.name);
		if (ent.isDirectory()) walk(p, acc);
		else if (ent.name === 'index.md') acc.push(p);
	}
	return acc;
}

let changed = 0;
for (const root of ROOTS) {
	for (const file of walk(root)) {
		const raw = normalize(fs.readFileSync(file, 'utf8'));
		const { fm, body } = splitFm(raw);
		if (!fm) continue;
		const title = proofreadTitle(readQuoted(fm, 'title'));
		const excerpt = readQuoted(fm, 'excerpt');
		let nextFm = fm;
		if (title) nextFm = setQuoted(nextFm, 'title', title);
		if (excerpt) nextFm = setQuoted(nextFm, 'excerpt', proofreadExcerpt(excerpt, title));
		const nextBody = body.trim() ? `${proofreadMarkdown(body)}\n` : body.startsWith('\n') ? body : '\n';
		const next = `${nextFm}\n\n${nextBody.replace(/^\n+/, '\n')}`.replace(/\n{3,}/g, '\n\n');
		const out = next.endsWith('\n') ? next : `${next}\n`;
		if (out !== raw) {
			fs.writeFileSync(file, out);
			changed += 1;
			console.log('proofread', path.relative(REPO_B, file).replaceAll('\\', '/'));
		}
	}
}
console.log('Zmieniono plików:', changed);
