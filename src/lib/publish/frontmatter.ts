import type { ContentLayout } from './content-layout';

export type AstroCategoryFields = {
	slug: string;
	name: string;
};

export function buildAstroMarkdown(
	title: string,
	contentMd: string,
	pubDate: string,
	layout: ContentLayout = 'flat',
	category?: AstroCategoryFields,
): string {
	const safeTitle = title.replace(/"/g, '\\"');
	const dateOnly = pubDate.slice(0, 10);
	const isoDate = pubDate.includes('T') ? pubDate : `${dateOnly}T12:00:00.000Z`;

	if (layout === 'folder') {
		const catSlug = (category?.slug ?? 'aktualnosci').replace(/"/g, '\\"');
		const catName = (category?.name ?? 'Aktualności').replace(/"/g, '\\"');
		return `---\ntitle: "${safeTitle}"\ndate: "${isoDate}"\nauthor: "Administrator"\ncategory: "${catSlug}"\ncategoryName: "${catName}"\ndraft: false\n---\n\n${contentMd.trim()}\n`;
	}

	return `---\ntitle: "${safeTitle}"\npubDate: ${dateOnly}\ndraft: false\n---\n\n${contentMd.trim()}\n`;
}
