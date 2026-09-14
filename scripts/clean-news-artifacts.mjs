/**
 * Jednorazowe czyszczenie artefaktów WP w treściach news (repo Astro).
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

const REPO_B = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../gmina-miedzna.pl');
const NEWS = path.join(REPO_B, 'src/content/news');

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

function cleanTitle(value) {
	return cleanPlainText(value).replace(/"([^"]+)"/g, '„$1”');
}

let changed = 0;
for (const dir of fs.readdirSync(NEWS, { withFileTypes: true }).filter((d) => d.isDirectory())) {
	const file = path.join(NEWS, dir.name, 'index.md');
	if (!fs.existsSync(file)) continue;
	const raw = normalize(fs.readFileSync(file, 'utf8'));
	const { fm, body } = splitFm(raw);
	if (!fm) {
		console.warn('brak frontmatter', dir.name);
		continue;
	}
	const title = cleanTitle(readQuoted(fm, 'title'));
	const excerpt = readQuoted(fm, 'excerpt');
	let nextFm = fm;
	if (title) nextFm = setQuoted(nextFm, 'title', title);
	if (excerpt) nextFm = setQuoted(nextFm, 'excerpt', cleanExcerpt(excerpt, title));
	const hasCover = /^coverImage:/m.test(fm);
	let nextBody;
	if (body.trim()) {
		nextBody = `${cleanMarkdownArtifacts(body, title)}\n`;
	} else if (hasCover) {
		nextBody = '\n';
	} else {
		nextBody = `${title.replace(/\.$/, '')}.\n`;
	}
	const next = `${nextFm}\n\n${nextBody}`;
	if (next !== raw) {
		fs.writeFileSync(file, next);
		changed += 1;
		console.log('cleaned', dir.name);
	}
}
console.log('Zmieniono wpisów:', changed);
