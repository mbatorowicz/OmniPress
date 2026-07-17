import { describe, expect, it } from 'vitest';
import type { GitHubBinaryFileWrite, GitHubFileWrite, GitHubTextFileWrite } from './github-api';

function isBinaryFileWrite(file: GitHubFileWrite): file is GitHubBinaryFileWrite {
	return typeof file.content !== 'string';
}

describe('GitHubFileWrite — rozróżnienie tekst / binaria', () => {
	it('tekst pozostaje utf-8', () => {
		const file: GitHubTextFileWrite = {
			path: 'src/content/news/a/index.md',
			content: '---\ntitle: Test\n---\n',
		};
		expect(isBinaryFileWrite(file)).toBe(false);
	});

	it('ArrayBuffer i Uint8Array to binaria', () => {
		const buf: GitHubBinaryFileWrite = {
			path: 'src/content/news/a/doc.pdf',
			content: new ArrayBuffer(8),
		};
		const u8: GitHubBinaryFileWrite = {
			path: 'src/content/news/a/img.png',
			content: new Uint8Array([1, 2, 3]),
		};
		expect(isBinaryFileWrite(buf)).toBe(true);
		expect(isBinaryFileWrite(u8)).toBe(true);
	});

	it('batch wpisu łączy MD, asset i RC w jedną listę', () => {
		const files: GitHubFileWrite[] = [
			{ path: 'src/content/news/a/x.pdf', content: new Uint8Array([37, 80, 68, 70]) },
			{ path: 'src/content/news/a/index.md', content: '---\ntitle: A\n---\n' },
			{
				path: 'src/config/omnipress-layout.json',
				content: '{"slots":[]}',
			},
		];
		expect(files).toHaveLength(3);
		expect(files.filter(isBinaryFileWrite)).toHaveLength(1);
		expect(files.filter((f) => !isBinaryFileWrite(f))).toHaveLength(2);
	});
});
