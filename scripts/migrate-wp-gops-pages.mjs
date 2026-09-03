/**
 * Podejście 18 — migracja treści GOPS / Biblioteka / Druki z WordPressa do repo Astro.
 * Użycie: node scripts/migrate-wp-gops-pages.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_B = path.resolve(__dirname, '../../gmina-miedzna.pl');
const PAGES_ROOT = path.join(REPO_B, 'src/content/pages/gmina');

const WP = 'https://gmina-miedzna.pl';

function decodeHtml(html) {
	return html
		.replace(/&#8211;/g, '–')
		.replace(/&#8217;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
		.replace(/<[^>]+>/g, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function slugifyFilename(name) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/ł/g, 'l')
		.replace(/Ł/g, 'L')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

function extractFiles(html) {
	const files = [];
	const re =
		/<div class="wp-block-file"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
	let m;
	while ((m = re.exec(html)) !== null) {
		const url = m[1];
		const label = decodeHtml(m[2]);
		if (!url.toLowerCase().endsWith('.pdf')) continue;
		const base = path.basename(new URL(url).pathname);
		const filename = slugifyFilename(label) + '.pdf';
		files.push({ url, label, filename, wpBase: base });
	}
	return files;
}

function extractLinks(html) {
	const links = [];
	const re = /<a href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
	let m;
	while ((m = re.exec(html)) !== null) {
		links.push({ href: m[1], label: decodeHtml(m[2]) });
	}
	return links;
}

async function fetchPage(id) {
	const res = await fetch(`${WP}/wp-json/wp/v2/pages/${id}`);
	if (!res.ok) throw new Error(`WP page ${id}: ${res.status}`);
	return res.json();
}

async function downloadPdf(url, dest) {
	if (fs.existsSync(dest)) {
		console.log('  skip (exists):', path.basename(dest));
		return;
	}
	const res = await fetch(url);
	if (!res.ok) throw new Error(`PDF ${url}: ${res.status}`);
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
	console.log('  downloaded:', path.basename(dest));
}

function buildFrontmatter(title, slug) {
	const q = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
	return `---\ntitle: ${q(title)}\ntype: page\nslug: ${q(slug)}\npathPrefix: "gmina"\ndraft: false\n---`;
}

function pdfLinks(files) {
	return files.map((f) => `- [📄 ${f.label}](./${f.filename})`).join('\n');
}

async function writePage(dir, frontmatter, body) {
	fs.mkdirSync(dir, { recursive: true });
	const md = `${frontmatter}\n\n${body.trim()}\n`;
	fs.writeFileSync(path.join(dir, 'index.md'), md, 'utf8');
	console.log('wrote:', path.relative(REPO_B, path.join(dir, 'index.md')));
}

async function migrateGops() {
	const info = await fetchPage(115);
	const forms = await fetchPage(6120);
	const dir = path.join(PAGES_ROOT, 'gops');

	const contact = decodeHtml(info.content.rendered);
	const files = extractFiles(forms.content.rendered);

	for (const f of files) {
		await downloadPdf(f.url, path.join(dir, f.filename));
	}

	const body = `${contact}\n\n## Druki do pobrania\n\n${pdfLinks(files)}`;
	await writePage(
		dir,
		buildFrontmatter('Gminny Ośrodek Pomocy Społecznej w Miedznie', 'gops'),
		body,
	);
}

async function migrateBiblioteka() {
	const info = await fetchPage(111);
	const dir = path.join(PAGES_ROOT, 'biblioteka');

	const text = decodeHtml(info.content.rendered);
	const links = extractLinks(info.content.rendered);
	const extLink = links.find((l) => l.href.includes('biblioteka-miedzna.pl'));

	let body = text;
	if (extLink) {
		body = body.replace(extLink.href, '').trim();
		body += `\n\n[Strona biblioteki](${extLink.href})`;
	}

	await writePage(
		dir,
		buildFrontmatter('Gminna Biblioteka Publiczna w Miedznie', 'biblioteka'),
		body,
	);
}

async function migrateDruki() {
	const sections = [
		{ id: 5009, heading: 'Ogólne' },
		{ id: 4838, heading: 'Urząd Stanu Cywilnego' },
		{ id: 758, heading: 'Referat Inwestycji, Gospodarki Komunalnej i Ochrony Środowiska' },
	];
	const dir = path.join(PAGES_ROOT, 'druki');
	const parts = [];

	for (const section of sections) {
		const page = await fetchPage(section.id);
		const html = page.content.rendered;
		const files = extractFiles(html);

		for (const f of files) {
			await downloadPdf(f.url, path.join(dir, f.filename));
		}

		const internalLinks = [];
		const linkRe = /<a href="([^"]+)">([^<]+)<\/a>/gi;
		let lm;
		while ((lm = linkRe.exec(html)) !== null) {
			const href = lm[1];
			if (href.endsWith('.pdf')) continue;
			const label = decodeHtml(lm[2]);
			const mapped = href.includes('harmonogram-odbioru-odpadow')
				? '/odpady/harmonogram'
				: href.replace(WP, '');
			internalLinks.push({ href: mapped, label });
		}

		let sectionMd = `## ${section.heading}\n\n`;
		if (files.length) sectionMd += pdfLinks(files) + '\n';
		for (const link of internalLinks) {
			sectionMd += `\n[${link.label}](${link.href})\n`;
		}
		parts.push(sectionMd.trim());
	}

	await writePage(
		dir,
		buildFrontmatter('Wnioski i druki', 'druki'),
		parts.join('\n\n'),
	);
}

console.log('Migracja podejście 18 →', REPO_B);
await migrateGops();
await migrateBiblioteka();
await migrateDruki();
console.log('Gotowe.');
