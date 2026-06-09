function yamlQuote(value: string): string {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function buildSitePageMarkdown(
	title: string,
	pathPrefix: string,
	slug: string,
	contentMd: string,
): string {
	const safeTitle = title.replace(/"/g, '\\"');
	const prefix = pathPrefix.trim();
	const safeSlug = slug.replace(/"/g, '\\"');
	const prefixLine = prefix ? `\npathPrefix: ${yamlQuote(prefix)}` : '';
	return `---\ntitle: ${yamlQuote(safeTitle)}\ntype: page\nslug: ${yamlQuote(safeSlug)}${prefixLine}\ndraft: false\n---\n\n${contentMd.trim()}\n`;
}
