const IMAGE_MD_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const PDF_LINK_RE = /\[📄\s*([^\]]+)\]\([^)]+\)/g;

export type PreparedAstroPost = {
	bodyMd: string;
	coverImage: string | null;
	galleryImages: string[];
	excerpt: string;
};

function isPdfUrl(url: string): boolean {
	return /\.pdf(\?|#|$)/i.test(url.trim());
}

/** Kolejność obrazków w Markdown (bez PDF). */
export function parseImageRefsFromMarkdown(md: string): Array<{ alt: string; url: string }> {
	const refs: Array<{ alt: string; url: string }> = [];
	for (const match of md.matchAll(IMAGE_MD_RE)) {
		const url = match[2]?.trim() ?? '';
		if (!url || isPdfUrl(url)) continue;
		refs.push({ alt: match[1] ?? '', url });
	}
	return refs;
}

export function stripImageMarkdown(md: string): string {
	return md
		.replace(IMAGE_MD_RE, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

export function markdownToPlainExcerpt(md: string, maxLen = 200): string {
	const text = md
		.replace(IMAGE_MD_RE, ' ')
		.replace(PDF_LINK_RE, '$1 ')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/\*(.+?)\*/g, '$1')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	if (text.length <= maxLen) return text;
	return `${text.slice(0, maxLen).trimEnd()}…`;
}

/** Pierwsze zdjęcie → coverImage, kolejne → galleryImages; obrazki wyciągnięte z treści. */
export function prepareAstroPostContent(contentMd: string): PreparedAstroPost {
	const images = parseImageRefsFromMarkdown(contentMd);
	const coverImage = images[0]?.url ?? null;
	const galleryImages = images.slice(1).map((img) => img.url);
	const bodyMd = stripImageMarkdown(contentMd);
	const excerpt = markdownToPlainExcerpt(bodyMd);

	return { bodyMd, coverImage, galleryImages, excerpt };
}
