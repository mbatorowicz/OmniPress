import type { ContentLayout } from './content-layout';

export function buildAstroMarkdown(
	title: string,
	contentMd: string,
	pubDate: string,
	layout: ContentLayout = 'flat',
): string {
	const safeTitle = title.replace(/"/g, '\\"');
	const dateOnly = pubDate.slice(0, 10);
	const isoDate = pubDate.includes('T') ? pubDate : `${dateOnly}T12:00:00.000Z`;

	if (layout === 'folder') {
		return `---\ntitle: "${safeTitle}"\ndate: "${isoDate}"\nauthor: "Administrator"\ncategory: "aktualnosci"\ncategoryName: "Aktualności"\ndraft: false\n---\n\n${contentMd.trim()}\n`;
	}

	return `---\ntitle: "${safeTitle}"\npubDate: ${dateOnly}\ndraft: false\n---\n\n${contentMd.trim()}\n`;
}
