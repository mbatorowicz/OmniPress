import { describe, expect, it } from 'vitest';
import {
	joinContentPath,
	postDirFromMarkdownPath,
	postSlugFromMarkdownPath,
} from './paths';

const contentPath = 'src/content/news';

describe('publish folder layout — ścieżki MD i assetów', () => {
	it('assety trafiają do tego samego folderu co index.md (existing external_id)', () => {
		const filePath = joinContentPath(contentPath, 'test', 'index.md');
		const postDir = postDirFromMarkdownPath(filePath);
		const assetGitPath = joinContentPath(postDir, '03df984f-1afc-48f0-b599-0ed5d99c4edb.pdf');
		expect(assetGitPath).toBe(
			'src/content/news/test/03df984f-1afc-48f0-b599-0ed5d99c4edb.pdf',
		);
	});

	it('przy zmianie slug folder docelowy różni się od starego external_id', () => {
		const oldPath = joinContentPath(contentPath, 'test', 'index.md');
		const newSlug = 'mozliwosci-finansowania-projektow-realizowanych-przez-kgw';
		const newPath = joinContentPath(contentPath, newSlug, 'index.md');
		expect(postDirFromMarkdownPath(oldPath)).not.toBe(postDirFromMarkdownPath(newPath));
	});

	it('relative URL assetu używa slug folderu wpisu, nie posts.slug', () => {
		const postDir = joinContentPath(contentPath, 'mozliwosci-finansowania-projektow-realizowanych-przez-kgw');
		const folderSlug = postSlugFromMarkdownPath(`${postDir}/index.md`, contentPath);
		const relative = `./03df984f-1afc-48f0-b599-0ed5d99c4edb.pdf`;
		expect(folderSlug).toBe('mozliwosci-finansowania-projektow-realizowanych-przez-kgw');
		expect(relative).toBe('./03df984f-1afc-48f0-b599-0ed5d99c4edb.pdf');
	});

	it('publiczny URL assetu (/post-files/) używa slug folderu', () => {
		const postDir = joinContentPath(contentPath, 'mozliwosci-finansowania-projektow-realizowanych-przez-kgw');
		const folderSlug = postSlugFromMarkdownPath(`${postDir}/index.md`, contentPath);
		const assetName = '03df984f-1afc-48f0-b599-0ed5d99c4edb.pdf';
		const publicUrl = `/post-files/${folderSlug}/${assetName}`;
		expect(publicUrl).toBe(
			'/post-files/mozliwosci-finansowania-projektow-realizowanych-przez-kgw/03df984f-1afc-48f0-b599-0ed5d99c4edb.pdf',
		);
	});
});
