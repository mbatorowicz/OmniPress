export function buildAstroMarkdown(title: string, contentMd: string, pubDate: string): string {
	const safeTitle = title.replace(/"/g, '\\"');
	const dateOnly = pubDate.slice(0, 10);
	return `---\ntitle: "${safeTitle}"\npubDate: ${dateOnly}\ndraft: false\n---\n\n${contentMd.trim()}\n`;
}
