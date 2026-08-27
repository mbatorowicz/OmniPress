import type { ContentLayout } from './content-layout';

export type AstroCategoryFields = {
	slug: string;
	name: string;
};

export type AstroPostFrontmatter = AstroCategoryFields & {
	coverImage?: string;
	galleryImages?: string[];
	excerpt?: string;
	pinned?: boolean;
};

function yamlQuote(value: string): string {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function frontmatterExtras(meta?: Partial<AstroPostFrontmatter>): string {
	if (!meta) return '';
	let lines = '';
	if (meta.coverImage) lines += `\ncoverImage: ${yamlQuote(meta.coverImage)}`;
	if (meta.galleryImages?.length) {
		lines += `\ngalleryImages: [${meta.galleryImages.map(yamlQuote).join(', ')}]`;
	}
	if (meta.excerpt) lines += `\nexcerpt: ${yamlQuote(meta.excerpt)}`;
	if (meta.pinned === true) lines += '\npinned: true';
	return lines;
}

export function buildAstroMarkdown(
	title: string,
	contentMd: string,
	pubDate: string,
	layout: ContentLayout = 'flat',
	meta?: AstroPostFrontmatter,
): string {
	const safeTitle = title.replace(/"/g, '\\"');
	const dateOnly = pubDate.slice(0, 10);
	const isoDate = pubDate.includes('T') ? pubDate : `${dateOnly}T12:00:00.000Z`;
	const extras = frontmatterExtras(meta);

	if (layout === 'folder') {
		if (!meta?.slug) {
			throw new Error('Brak kategorii wpisu (category_slug)');
		}
		const catSlug = meta.slug.replace(/"/g, '\\"');
		const catName = (meta.name || meta.slug).replace(/"/g, '\\"');
		return `---\ntitle: ${yamlQuote(safeTitle)}\ndate: ${yamlQuote(isoDate)}\nauthor: "Administrator"\ncategory: ${yamlQuote(catSlug)}\ncategoryName: ${yamlQuote(catName)}\ndraft: false${extras}\n---\n\n${contentMd.trim()}\n`;
	}

	return `---\ntitle: ${yamlQuote(safeTitle)}\npubDate: ${dateOnly}\ndraft: false${extras}\n---\n\n${contentMd.trim()}\n`;
}
