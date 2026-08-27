import { afterEach, describe, expect, it, vi } from 'vitest';
import { countCalls, installFetchFake, jsonResponse, type FetchHandler } from '@/lib/testing/fetch-fake';
import {
	deleteGitHubFilesBatch,
	httpStatusFromError,
	putGitHubFile,
	putGitHubFilesBatch,
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

type GitDataOptions = {
	/** Kolejne statusy PATCH refs — brak wpisu oznacza 200. */
	refPatchStatuses?: number[];
	existingFile?: { sha: string; path: string } | null;
};

/** Router Git Data API: ref → commit → blobs → tree → commit → PATCH ref. */
function gitDataHandler(options: GitDataOptions = {}): FetchHandler {
	let blobSeq = 0;
	let refPatchSeq = 0;
	let headSeq = 0;

	return (call) => {
		if (call.method === 'GET' && call.url.includes('/git/ref/heads/')) {
			return jsonResponse({ object: { sha: `head-${headSeq++}` } });
		}
		if (call.method === 'GET' && call.url.includes('/git/commits/')) {
			return jsonResponse({ tree: { sha: 'base-tree' } });
		}
		if (call.method === 'GET' && call.url.includes('/contents/')) {
			const existing = options.existingFile;
			return existing ? jsonResponse(existing) : jsonResponse({ message: 'Not Found' }, 404);
		}
		if (call.method === 'POST' && call.url.endsWith('/git/blobs')) {
			return jsonResponse({ sha: `blob-${blobSeq++}` });
		}
		if (call.method === 'POST' && call.url.endsWith('/git/trees')) {
			return jsonResponse({ sha: 'tree-sha' });
		}
		if (call.method === 'POST' && call.url.endsWith('/git/commits')) {
			return jsonResponse({ sha: 'commit-sha' });
		}
		if (call.method === 'PATCH' && call.url.includes('/git/refs/heads/')) {
			const status = options.refPatchStatuses?.[refPatchSeq++] ?? 200;
			return jsonResponse({ message: status === 200 ? 'ok' : 'conflict' }, status);
		}
		return undefined;
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('putGitHubFilesBatch — atomowy commit', () => {
	it('zapisuje wszystkie pliki jednym commitem', async () => {
		const fake = installFetchFake(gitDataHandler());
		const result = await putGitHubFilesBatch(
			cfg,
			TOKEN,
			[
				{ path: 'src/content/news/a/index.md', content: '# tytul' },
				{ path: 'src/content/news/a/foto.jpg', content: new Uint8Array([1, 2, 3]) },
			],
			'publikacja',
		);

		expect(result.written).toBe(2);
		expect(countCalls(fake.calls, 'POST', '/git/blobs')).toBe(2);
		expect(countCalls(fake.calls, 'POST', '/git/commits')).toBe(1);
		expect(countCalls(fake.calls, 'PATCH', '/git/refs/')).toBe(1);
	});

	it('zwraca sha blobów pod ścieżkami — baza pomija niezmienione assety', async () => {
		installFetchFake(gitDataHandler());
		const result = await putGitHubFilesBatch(
			cfg,
			TOKEN,
			[{ path: 'src/content/news/a/index.md', content: '# tytul' }],
			'publikacja',
		);
		expect(result.blobShas).toEqual({ 'src/content/news/a/index.md': 'blob-0' });
	});

	it('kasuje stary folder w tym samym commicie', async () => {
		const fake = installFetchFake(gitDataHandler());
		const result = await putGitHubFilesBatch(
			cfg,
			TOKEN,
			[{ path: 'src/content/news/nowy/index.md', content: '# tytul' }],
			'zmiana slug',
			{ deletes: ['src/content/news/stary/index.md'] },
		);

		expect(result.deleted).toBe(1);
		const tree = fake.calls.find((c) => c.method === 'POST' && c.url.endsWith('/git/trees'))!;
		expect((tree.body as { tree: unknown[] }).tree).toContainEqual({
			path: 'src/content/news/stary/index.md',
			mode: '100644',
			type: 'blob',
			sha: null,
		});
	});

	it('nie kasuje ścieżki, którą właśnie zapisuje', async () => {
		installFetchFake(gitDataHandler());
		const result = await putGitHubFilesBatch(
			cfg,
			TOKEN,
			[{ path: 'a/index.md', content: '# tytul' }],
			'publikacja',
			{ deletes: ['a/index.md'] },
		);
		expect(result.deleted).toBe(0);
	});

	it('deduplikuje powtórzone ścieżki', async () => {
		const fake = installFetchFake(gitDataHandler());
		const result = await putGitHubFilesBatch(
			cfg,
			TOKEN,
			[
				{ path: 'a/index.md', content: 'stara' },
				{ path: 'a/index.md', content: 'nowa' },
			],
			'publikacja',
		);
		expect(result.written).toBe(1);
		expect(countCalls(fake.calls, 'POST', '/git/blobs')).toBe(1);
	});

	it('pusty commit jest błędem — worker nie ma czego publikować', async () => {
		installFetchFake(gitDataHandler());
		await expect(putGitHubFilesBatch(cfg, TOKEN, [], 'pusto')).rejects.toThrow();
	});

	it('pomija pliki z pustą ścieżką', async () => {
		installFetchFake(gitDataHandler());
		await expect(
			putGitHubFilesBatch(cfg, TOKEN, [{ path: '   ', content: 'x' }], 'pusto'),
		).rejects.toThrow();
	});
});

describe('putGitHubFilesBatch — konflikt z równoległym commitem', () => {
	it('ponawia od świeżego HEAD po 409', async () => {
		const fake = installFetchFake(gitDataHandler({ refPatchStatuses: [409] }));
		const result = await putGitHubFilesBatch(
			cfg,
			TOKEN,
			[{ path: 'a/index.md', content: '# tytul' }],
			'publikacja',
		);

		expect(result.commitSha).toBe('commit-sha');
		expect(countCalls(fake.calls, 'GET', '/git/ref/heads/')).toBe(2);
		const commits = fake.calls.filter((c) => c.method === 'POST' && c.url.endsWith('/git/commits'));
		expect((commits[0]!.body as { parents: string[] }).parents).toEqual(['head-0']);
		expect((commits[1]!.body as { parents: string[] }).parents).toEqual(['head-1']);
	});

	it('nie wysyła blobów drugi raz', async () => {
		const fake = installFetchFake(gitDataHandler({ refPatchStatuses: [409, 422] }));
		await putGitHubFilesBatch(cfg, TOKEN, [{ path: 'a/index.md', content: 'x' }], 'publikacja');
		expect(countCalls(fake.calls, 'POST', '/git/blobs')).toBe(1);
	});

	it('po czterech konfliktach zgłasza błąd ze statusem', async () => {
		installFetchFake(gitDataHandler({ refPatchStatuses: [409, 409, 409, 409] }));
		const error = await putGitHubFilesBatch(
			cfg,
			TOKEN,
			[{ path: 'a/index.md', content: 'x' }],
			'publikacja',
		).catch((e: Error) => e);
		expect(httpStatusFromError((error as Error).message)).toBe(409);
	});

	it('błąd inny niż konflikt kończy próbę od razu', async () => {
		const fake = installFetchFake(gitDataHandler({ refPatchStatuses: [403] }));
		await expect(
			putGitHubFilesBatch(cfg, TOKEN, [{ path: 'a/index.md', content: 'x' }], 'publikacja'),
		).rejects.toThrow();
		expect(countCalls(fake.calls, 'PATCH', '/git/refs/')).toBe(1);
	});
});

describe('putGitHubFile — Contents API', () => {
	it('zapisuje plik na wskazanym branchu', async () => {
		const fake = installFetchFake((call) => {
			if (call.method === 'PUT') {
				return jsonResponse({ content: { sha: 'new-sha' }, commit: { sha: 'commit-sha' } });
			}
			return jsonResponse({ message: 'Not Found' }, 404);
		});
		expect(await putGitHubFile(cfg, TOKEN, 'a/index.md', 'tresc', 'publikacja')).toEqual({
			sha: 'new-sha',
			commitSha: 'commit-sha',
		});
		const put = fake.calls.find((c) => c.method === 'PUT')!;
		expect((put.body as { branch: string }).branch).toBe('main');
	});

	it('ze znanym sha nie odpytuje o plik', async () => {
		const fake = installFetchFake(() =>
			jsonResponse({ content: { sha: 'new-sha' }, commit: { sha: 'commit-sha' } }),
		);
		await putGitHubFile(cfg, TOKEN, 'a/index.md', 'tresc', 'publikacja', 'old-sha');
		expect(countCalls(fake.calls, 'GET', '/contents/')).toBe(0);
		expect((fake.calls[0]!.body as { sha?: string }).sha).toBe('old-sha');
	});

	it('bez sha pobiera aktualny stan pliku', async () => {
		const fake = installFetchFake((call) =>
			call.method === 'GET'
				? jsonResponse({ sha: 'istniejacy', path: 'a/index.md' })
				: jsonResponse({ content: { sha: 'new-sha' }, commit: { sha: 'commit-sha' } }),
		);
		await putGitHubFile(cfg, TOKEN, 'a/index.md', 'tresc', 'publikacja');
		expect((fake.calls[1]!.body as { sha?: string }).sha).toBe('istniejacy');
	});

	it('po 409 pobiera świeże sha i ponawia', async () => {
		let puts = 0;
		const fake = installFetchFake((call) => {
			if (call.method === 'GET') return jsonResponse({ sha: `sha-${puts}`, path: 'a/index.md' });
			puts++;
			return puts === 1
				? jsonResponse({ message: 'is at abc but expected def' }, 409)
				: jsonResponse({ content: { sha: 'new-sha' }, commit: { sha: 'commit-sha' } });
		});
		expect(await putGitHubFile(cfg, TOKEN, 'a/index.md', 'tresc', 'publikacja', 'stale')).toEqual({
			sha: 'new-sha',
			commitSha: 'commit-sha',
		});
		expect(countCalls(fake.calls, 'GET', '/contents/')).toBe(1);
	});

	it('po czterech konfliktach zgłasza błąd ze statusem', async () => {
		installFetchFake((call) =>
			call.method === 'GET'
				? jsonResponse({ sha: 'x', path: 'a/index.md' })
				: jsonResponse({ message: 'conflict' }, 409),
		);
		const error = await putGitHubFile(cfg, TOKEN, 'a/index.md', 'tresc', 'publikacja').catch(
			(e: Error) => e,
		);
		expect(httpStatusFromError((error as Error).message)).toBe(409);
	});

	it('duże pliki idą przez Git Data API zamiast base64 w Contents', async () => {
		const fake = installFetchFake(gitDataHandler());
		const big = new ArrayBuffer(8 * 1024 * 1024);
		const result = await putGitHubFile(cfg, TOKEN, 'a/duzy.pdf', big, 'publikacja');
		expect(result.commitSha).toBe('commit-sha');
		expect(countCalls(fake.calls, 'PUT', '/contents/')).toBe(0);
		expect(countCalls(fake.calls, 'POST', '/git/blobs')).toBe(1);
	});
});

describe('deleteGitHubFilesBatch', () => {
	it('usuwa istniejące pliki jednym commitem', async () => {
		const fake = installFetchFake(
			gitDataHandler({ existingFile: { sha: 's1', path: 'a/index.md' } }),
		);
		const result = await deleteGitHubFilesBatch(
			cfg,
			TOKEN,
			['a/index.md', 'a/foto.jpg'],
			'wycofanie',
		);
		expect(result).toEqual({ commitSha: 'commit-sha', deleted: 2 });
		expect(countCalls(fake.calls, 'POST', '/git/commits')).toBe(1);
	});

	it('nic nie robi, gdy pliki już nie istnieją', async () => {
		const fake = installFetchFake(gitDataHandler({ existingFile: null }));
		expect(await deleteGitHubFilesBatch(cfg, TOKEN, ['a/index.md'], 'wycofanie')).toBeNull();
		expect(countCalls(fake.calls, 'POST', '/git/commits')).toBe(0);
	});

	it('pusta lista nie generuje commita', async () => {
		const fake = installFetchFake(gitDataHandler());
		expect(await deleteGitHubFilesBatch(cfg, TOKEN, ['  ', ''], 'wycofanie')).toBeNull();
		expect(fake.calls).toHaveLength(0);
	});
});
