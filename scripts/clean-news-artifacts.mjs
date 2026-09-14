/**
 * Jednorazowe czyszczenie artefaktów WP w treściach (repo Astro).
 * Użycie: node scripts/clean-news-artifacts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { yamlQuote } from './lib/wp-migrate-html.mjs';
import {
	cleanExcerpt,
	cleanMarkdownArtifacts,
	cleanPlainText,
	unescapeYamlScalar,
} from './lib/clean-md-artifacts.mjs';
import { deriveTitleFromBody, softenAllCapsRun } from './lib/clean-md-readability.mjs';

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

function cleanTitle(value, body) {
	let title = deriveTitleFromBody(value, body);
	title = softenAllCapsRun(title);
	title = cleanPlainText(title).replace(/"([^"]+)"/g, '„$1”');
	title = title.replace(/\s*;\)\s*$/g, '').replace(/\s+zapraszamy\.?$/i, '').replace(/\.$/, '');
	return title.trim();
}

let changed = 0;
for (const root of ROOTS) {
	for (const file of walk(root)) {
		const raw = normalize(fs.readFileSync(file, 'utf8'));
		const { fm, body } = splitFm(raw);
		if (!fm) {
			console.warn('brak frontmatter', path.relative(REPO_B, file));
			continue;
		}
		const isPage = /type:\s*page/.test(fm);
		const title = cleanTitle(readQuoted(fm, 'title'), body);
		const excerpt = readQuoted(fm, 'excerpt');
		let nextFm = fm;
		if (title) nextFm = setQuoted(nextFm, 'title', title);
		if (excerpt) nextFm = setQuoted(nextFm, 'excerpt', cleanExcerpt(excerpt, title));
		const hasCover = /^coverImage:/m.test(fm);
		let nextBody;
		if (body.trim()) {
			nextBody = `${cleanMarkdownArtifacts(body, title)}\n`;
		} else if (hasCover || isPage) {
			nextBody = body.trim() ? `${body.trim()}\n` : '\n';
		} else {
			nextBody = `${title.replace(/\.$/, '')}.\n`;
		}
		const next = `${nextFm}\n\n${nextBody}`;
		if (next !== raw) {
			fs.writeFileSync(file, next);
			changed += 1;
			console.log('cleaned', path.relative(REPO_B, file).replaceAll('\\', '/'));
		}
	}
}
console.log('Zmieniono plików:', changed);
