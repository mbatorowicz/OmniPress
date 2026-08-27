import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFetchFake, jsonResponse } from '@/lib/testing/fetch-fake';
import {
	getGitHubFile,
	getGitHubFileBinary,
	getGitHubFileText,
	httpStatusFromError,
	listGitHubDirectoryBlobs,
	listGitHubTreeBlobPaths,
	probeGitHubContentPath,
	probeGitHubRepository,
	resolveGitHubWithdrawPaths,
	type GitHubConfig,
} from './github-api';

const cfg: GitHubConfig = {
	owner: 'o',
	repo: 'r',
	branch: 'main',
	contentPath: 'src/content/news',
	contentLayout: 'folder',
	assetPublicBase: 'post-files',
};

const TOKEN = 'ghp_test';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('getGitHubFile', () => {
	it('zwraca sha i ścieżkę istniejącego pliku', async () => {
		installFetchFake(() => jsonResponse({ sha: 'abc', path: 'a/index.md' }));
		expect(await getGitHubFile(cfg, TOKEN, 'a/index.md')).toEqual({
			sha: 'abc',
			path: 'a/index.md',
		});
	});

	it('pyta o właściwy branch i przesyła token', async () => {
		const fake = installFetchFake(() => jsonResponse({ sha: 'abc', path: 'a/index.md' }));
		await getGitHubFile(cfg, TOKEN, 'src/content/news/a/index.md');
		expect(fake.calls[0]!.url).toBe(
			'https://api.github.com/repos/o/r/contents/src/content/news/a/index.md?ref=main',
		);
	});

	it('404 to brak pliku, nie błąd', async () => {
		installFetchFake(() => jsonResponse({ message: 'Not Found' }, 404));
		expect(await getGitHubFile(cfg, TOKEN, 'brak.md')).toBeNull();
	});

	it('błąd HTTP niesie status czytelny dla logiki ponowień', async () => {
		installFetchFake(() => jsonResponse({ message: 'server' }, 502));
		const error = await getGitHubFile(cfg, TOKEN, 'a.md').catch((e: Error) => e);
		expect(httpStatusFromError((error as Error).message)).toBe(502);
	});

	it('odpowiedź bez sha traktuje jak brak pliku', async () => {
		installFetchFake(() => jsonResponse({ path: 'a.md' }));
		expect(await getGitHubFile(cfg, TOKEN, 'a.md')).toBeNull();
	});
});

describe('getGitHubFileText', () => {
	it('dekoduje treść base64', async () => {
		installFetchFake(() =>
			jsonResponse({
				encoding: 'base64',
				content: Buffer.from('{"a":1}', 'utf8').toString('base64'),
			}),
		);
		expect(await getGitHubFileText(cfg, TOKEN, 'config.json')).toBe('{"a":1}');
	});

	it('radzi sobie z base64 łamanym na wiersze', async () => {
		const raw = Buffer.from('x'.repeat(120), 'utf8').toString('base64');
		installFetchFake(() =>
			jsonResponse({ encoding: 'base64', content: `${raw.slice(0, 40)}\n${raw.slice(40)}` }),
		);
		expect(await getGitHubFileText(cfg, TOKEN, 'a.txt')).toBe('x'.repeat(120));
	});

	it('zwraca null dla brakującego pliku', async () => {
		installFetchFake(() => jsonResponse({}, 404));
		expect(await getGitHubFileText(cfg, TOKEN, 'brak.json')).toBeNull();
	});

	it('zwraca null przy innym kodowaniu niż base64', async () => {
		installFetchFake(() => jsonResponse({ encoding: 'none', download_url: 'https://x' }));
		expect(await getGitHubFileText(cfg, TOKEN, 'duzy.json')).toBeNull();
	});
});

describe('getGitHubFileBinary', () => {
	it('dekoduje załącznik z base64', async () => {
		const bytes = Uint8Array.from([1, 2, 3, 250]);
		installFetchFake(() =>
			jsonResponse({ encoding: 'base64', content: Buffer.from(bytes).toString('base64') }),
		);
		const result = await getGitHubFileBinary(cfg, TOKEN, 'a.pdf');
		expect([...new Uint8Array(result!)]).toEqual([1, 2, 3, 250]);
	});

	it('pliki powyżej 1 MB pobiera z download_url', async () => {
		installFetchFake((call) => {
			if (call.url.includes('/contents/')) {
				return jsonResponse({ encoding: 'none', download_url: 'https://raw.test/a.pdf' });
			}
			return new Response(Uint8Array.from([9, 9]));
		});
		const result = await getGitHubFileBinary(cfg, TOKEN, 'a.pdf');
		expect([...new Uint8Array(result!)]).toEqual([9, 9]);
	});

	it('zwraca null, gdy pobranie z download_url padnie', async () => {
		installFetchFake((call) =>
			call.url.includes('/contents/')
				? jsonResponse({ encoding: 'none', download_url: 'https://raw.test/a.pdf' })
				: new Response(null, { status: 500 }),
		);
		expect(await getGitHubFileBinary(cfg, TOKEN, 'a.pdf')).toBeNull();
	});
});

describe('listGitHubDirectoryBlobs', () => {
	it('zwraca pliki katalogu bez podkatalogów', async () => {
		installFetchFake(() =>
			jsonResponse([
				{ type: 'file', path: 'a/index.md', sha: 's1', name: 'index.md' },
				{ type: 'file', path: 'a/foto.jpg', sha: 's2', name: 'foto.jpg' },
				{ type: 'dir', path: 'a/galeria', sha: 's3', name: 'galeria' },
			]),
		);
		expect(await listGitHubDirectoryBlobs(cfg, TOKEN, 'a')).toEqual([
			{ path: 'a/index.md', sha: 's1', name: 'index.md' },
			{ path: 'a/foto.jpg', sha: 's2', name: 'foto.jpg' },
		]);
	});

	it('nieistniejący katalog to pusta lista', async () => {
		installFetchFake(() => jsonResponse({}, 404));
		expect(await listGitHubDirectoryBlobs(cfg, TOKEN, 'brak')).toEqual([]);
	});

	it('pusta ścieżka nie odpytuje GitHuba', async () => {
		const fake = installFetchFake(() => jsonResponse([]));
		expect(await listGitHubDirectoryBlobs(cfg, TOKEN, '/')).toEqual([]);
		expect(fake.calls).toHaveLength(0);
	});

	it('pojedynczy plik zamiast katalogu daje pustą listę', async () => {
		installFetchFake(() => jsonResponse({ path: 'a.md', type: 'file' }));
		expect(await listGitHubDirectoryBlobs(cfg, TOKEN, 'a.md')).toEqual([]);
	});
});

describe('listGitHubTreeBlobPaths', () => {
	it('zwraca same blob-y z rekurencyjnego drzewa', async () => {
		installFetchFake((call) => {
			if (call.url.includes('/git/ref/heads/main')) return jsonResponse({ object: { sha: 'c1' } });
			if (call.url.includes('/git/commits/c1')) return jsonResponse({ tree: { sha: 't1' } });
			return jsonResponse({
				tree: [
					{ path: 'a/index.md', type: 'blob' },
					{ path: 'a', type: 'tree' },
				],
			});
		});
		expect(await listGitHubTreeBlobPaths(cfg, TOKEN)).toEqual(['a/index.md']);
	});

	it('błąd odczytu ref jest rozpoznawalny po statusie', async () => {
		installFetchFake(() => jsonResponse({ message: 'nope' }, 403));
		const error = await listGitHubTreeBlobPaths(cfg, TOKEN).catch((e: Error) => e);
		expect(httpStatusFromError((error as Error).message)).toBe(403);
	});
});

describe('resolveGitHubWithdrawPaths', () => {
	it('dokłada pliki z folderu wpisu', async () => {
		installFetchFake(() =>
			jsonResponse([
				{ type: 'file', path: 'src/content/news/a/index.md', sha: 's1', name: 'index.md' },
				{ type: 'file', path: 'src/content/news/a/doc.pdf', sha: 's2', name: 'doc.pdf' },
			]),
		);
		const paths = await resolveGitHubWithdrawPaths(cfg, TOKEN, [
			'github:src/content/news/a/index.md',
		]);
		expect(paths.sort()).toEqual([
			'src/content/news/a/doc.pdf',
			'src/content/news/a/index.md',
		]);
	});

	it('nie listuje katalogu w układzie flat', async () => {
		const fake = installFetchFake(() => jsonResponse([]));
		const flat: GitHubConfig = { ...cfg, contentLayout: 'flat' };
		expect(await resolveGitHubWithdrawPaths(flat, TOKEN, ['github:src/content/news/a.md'])).toEqual(
			['src/content/news/a.md'],
		);
		expect(fake.calls).toHaveLength(0);
	});

	it('awaria listowania nie blokuje usunięcia samego wpisu', async () => {
		installFetchFake(() => jsonResponse({ message: 'server' }, 500));
		expect(
			await resolveGitHubWithdrawPaths(cfg, TOKEN, ['github:src/content/news/a/index.md']),
		).toEqual(['src/content/news/a/index.md']);
	});

	it('pomija identyfikatory bez ścieżki', async () => {
		const fake = installFetchFake(() => jsonResponse([]));
		expect(await resolveGitHubWithdrawPaths(cfg, TOKEN, [''])).toEqual([]);
		expect(fake.calls).toHaveLength(0);
	});
});

describe('sondy konfiguracji kanału', () => {
	it('istniejące repozytorium przechodzi test', async () => {
		installFetchFake(() => jsonResponse({ full_name: 'o/r' }));
		expect(await probeGitHubRepository(cfg, TOKEN)).toEqual({ ok: true });
	});

	it('brak dostępu zwraca status do komunikatu w panelu', async () => {
		installFetchFake(() => jsonResponse({ message: 'Bad credentials' }, 401));
		expect(await probeGitHubRepository(cfg, TOKEN)).toMatchObject({ ok: false, status: 401 });
	});

	it('brakujący folder treści wskazuje branch w opisie', async () => {
		installFetchFake(() => jsonResponse({}, 404));
		const result = await probeGitHubContentPath(cfg, TOKEN);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.detail).toContain('src/content/news');
			expect(result.detail).toContain('main');
		}
	});

	it('istniejący folder treści przechodzi test', async () => {
		installFetchFake(() => jsonResponse([]));
		expect(await probeGitHubContentPath(cfg, TOKEN)).toEqual({ ok: true });
	});
});
