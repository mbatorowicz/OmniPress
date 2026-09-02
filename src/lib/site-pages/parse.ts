import type { GitHubTreeBlob } from '@/lib/publish/github-api';

export type ParsedSitePageFile = {
	title: string;
	body: string;
	slug: string;
	pathPrefix: string;
};

export function filterGitHubMarkdownPages(
	pagesRoot: string,
	blobs: GitHubTreeBlob[],
): GitHubTreeBlob[] {
	const prefix = `${pagesRoot.replace(/^\/+|\/+$/g, '')}/`;
	return blobs.filter((blob) => {
		if (!blob.path.startsWith(prefix) || !blob.path.toLowerCase().endsWith('/index.md')) {
			return false;
		}
		const rel = blob.path.slice(prefix.length);
		const parts = rel.split('/');
		return (
			(parts.length === 2 && parts[1]!.toLowerCase() === 'index.md') ||
			(parts.length === 3 && parts[2]!.toLowerCase() === 'index.md')
		);
	});
}

export function parseSitePagePath(
	pagesRoot: string,
	filePath: string,
): { pathPrefix: string; slug: string } | null {
	const prefix = `${pagesRoot.replace(/^\/+|\/+$/g, '')}/`;
	if (!filePath.startsWith(prefix)) return null;
	const rel = filePath.slice(prefix.length);
	const parts = rel.split('/');
	if (parts.length === 2 && parts[1]!.toLowerCase() === 'index.md') {
		return { pathPrefix: '', slug: parts[0]! };
	}
	if (parts.length === 3 && parts[2]!.toLowerCase() === 'index.md') {
		return { pathPrefix: parts[0]!, slug: parts[1]! };
	}
	return null;
}

function parseYamlScalar(raw: string): string {
	const v = raw.trim();
	if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
		return v.slice(1, -1);
	}
	return v;
}

export function parseSitePageFile(raw: string): ParsedSitePageFile | null {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) return null;
	const fields: Record<string, string> = {};
	for (const line of match[1]!.split('\n')) {
		const idx = line.indexOf(':');
		if (idx <= 0) continue;
		fields[line.slice(0, idx).trim()] = parseYamlScalar(line.slice(idx + 1));
	}
	const title = (fields.title ?? '').trim();
	const slug = (fields.slug ?? '').trim();
	if (!title || !slug) return null;
	return {
		title,
		slug,
		pathPrefix: (fields.pathPrefix ?? '').trim(),
		body: match[2]!.trim(),
	};
}
