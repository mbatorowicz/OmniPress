import type { CertAdvisory } from './types';

function decodeXmlEntities(text: string): string {
	return text
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(html: string): string {
	return decodeXmlEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function extractTag(block: string, tag: string): string | null {
	const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
	const match = block.match(re);
	return match ? match[1].trim() : null;
}

function extractAllTags(block: string, tag: string): string[] {
	const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
	const values: string[] = [];
	let match: RegExpExecArray | null;
	while ((match = re.exec(block)) !== null) {
		values.push(match[1].trim());
	}
	return values;
}

function parsePubDate(raw: string): string {
	const parsed = new Date(raw);
	return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

const LEADING_EMOJI_RE =
	/^(\s*(?:\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F)?)*)\s*)+/u;

export function stripLeadingEmoji(text: string): string {
	return text.replace(LEADING_EMOJI_RE, '').trimStart();
}

export function parseCertAdvisoriesRss(xml: string): CertAdvisory[] {
	const items: CertAdvisory[] = [];
	const itemRe = /<item>([\s\S]*?)<\/item>/gi;
	let match: RegExpExecArray | null;

	while ((match = itemRe.exec(xml)) !== null) {
		const block = match[1];
		const title = extractTag(block, 'title');
		const link = extractTag(block, 'link');
		if (!title || !link) continue;

		const description = extractTag(block, 'description') ?? '';
		const pubDate = extractTag(block, 'pubDate') ?? '';
		const categories = extractAllTags(block, 'category');
		const category = categories[0] ? decodeXmlEntities(categories[0]) : '';

		items.push({
			title: stripLeadingEmoji(decodeXmlEntities(stripHtml(title))),
			href: decodeXmlEntities(link),
			summary: stripHtml(description).slice(0, 280),
			publishedAt: parsePubDate(pubDate),
			category,
		});
	}

	return items;
}
