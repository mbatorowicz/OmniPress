import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { GitHubConfig } from './github-api';

vi.mock('./github-api', () => ({ listGitHubDirectoryBlobs: vi.fn(async () => []) }));
vi.mock('./assets', () => ({ updateAssetContentSha: vi.fn(async () => {}) }));

const { collectPostAssetWrites } = await import('./github-astro-assets');

const POST_ID = '11111111-2222-3333-4444-555555555555';
const CFG = {
	repo: 'org/site',
	branch: 'main',
	contentPath: 'src/content/news',
	contentLayout: 'folder',
} as GitHubConfig;

const ASSET = {
	id: 'asset-1',
	storage_path: `${POST_ID}/abc.pdf`,
	filename: 'raport.pdf',
	mime_type: 'application/pdf',
};

function fakeSupabase(download: () => Promise<{ data: Blob | null; error: Error | null }>) {
	return { storage: { from: () => ({ download }) } } as unknown as SupabaseClient;
}

beforeEach(() => {
	vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => {
			throw new Error('publiczny bucket jest wyłączony — pobieranie musi iść klientem Storage');
		}),
	);
});

describe('collectPostAssetWrites', () => {
	it('pobiera bajty klientem Storage, bez żądania HTTP na publiczny URL', async () => {
		const supabase = fakeSupabase(async () => ({
			data: new Blob([new Uint8Array([1, 2, 3])]),
			error: null,
		}));

		const out = await collectPostAssetWrites(
			supabase,
			CFG,
			'token',
			'src/content/news/wpis',
			[ASSET],
		);

		expect(out.errors).toEqual([]);
		expect(out.writes).toHaveLength(1);
		expect(out.writes[0]?.path).toBe('src/content/news/wpis/abc.pdf');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('mapuje asset i ze starego publicznego URL, i z adresu panelu', async () => {
		const supabase = fakeSupabase(async () => ({
			data: new Blob([new Uint8Array([1, 2, 3])]),
			error: null,
		}));

		const { map } = await collectPostAssetWrites(
			supabase,
			CFG,
			'token',
			'src/content/news/wpis',
			[ASSET],
		);

		expect(map.get(`/api/posts/${POST_ID}/assets/asset-1/file`)).toBe('./abc.pdf');
		expect(
			map.get(
				`https://test.supabase.co/storage/v1/object/public/post-assets/${POST_ID}/abc.pdf`,
			),
		).toBe('./abc.pdf');
	});

	it('błąd Storage zgłasza jako błąd załącznika, nie commituje pustki', async () => {
		const supabase = fakeSupabase(async () => ({ data: null, error: new Error('Object not found') }));

		const out = await collectPostAssetWrites(
			supabase,
			CFG,
			'token',
			'src/content/news/wpis',
			[ASSET],
		);

		expect(out.writes).toHaveLength(0);
		expect(out.errors[0]).toContain('raport.pdf');
		expect(out.errors[0]).toContain('Object not found');
	});
});
