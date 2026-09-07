import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	assetFileUrl,
	assetUrlKeys,
	legacyPublicAssetUrl,
	postIdFromStoragePath,
	resolveAssetUrl,
} from './asset-model';

const POST_ID = '11111111-2222-3333-4444-555555555555';
const ASSET = { id: 'asset-1', storage_path: `${POST_ID}/abc.pdf` };
const LEGACY_URL = `https://test.supabase.co/storage/v1/object/public/post-assets/${POST_ID}/abc.pdf`;

beforeEach(() => {
	vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
});

describe('postIdFromStoragePath', () => {
	it('bierze id wpisu z pierwszego segmentu ścieżki', () => {
		expect(postIdFromStoragePath(`${POST_ID}/abc.pdf`)).toBe(POST_ID);
	});

	it('zwraca null dla pustej ścieżki', () => {
		expect(postIdFromStoragePath('')).toBeNull();
	});
});

describe('assetFileUrl', () => {
	it('nie prowadzi do publicznego Storage', () => {
		expect(assetFileUrl(ASSET)).toBe(`/api/posts/${POST_ID}/assets/asset-1/file`);
		expect(assetFileUrl(ASSET)).not.toContain('object/public');
	});
});

describe('assetUrlKeys', () => {
	it('rozpoznaje asset i po adresie panelu, i po starym publicznym URL', () => {
		expect(assetUrlKeys(ASSET)).toEqual([`/api/posts/${POST_ID}/assets/asset-1/file`, LEGACY_URL]);
	});

	it('bez id assetu zostaje tylko klucz legacy', () => {
		expect(assetUrlKeys({ storage_path: `${POST_ID}/abc.pdf` })).toEqual([LEGACY_URL]);
	});
});

describe('resolveAssetUrl', () => {
	it('podmienia stary publiczny URL z treści na ścieżkę w repo Astro', () => {
		const map = new Map([[LEGACY_URL, './abc.pdf']]);
		expect(resolveAssetUrl(ASSET, map)).toBe('./abc.pdf');
	});

	it('podmienia adres panelu na ścieżkę w repo Astro', () => {
		const map = new Map([[`/api/posts/${POST_ID}/assets/asset-1/file`, './abc.pdf']]);
		expect(resolveAssetUrl(ASSET, map)).toBe('./abc.pdf');
	});

	it('bez mapy publikacji (podgląd) wskazuje proxy panelu, nie Storage', () => {
		expect(resolveAssetUrl(ASSET, new Map())).toBe(`/api/posts/${POST_ID}/assets/asset-1/file`);
	});
});

describe('legacyPublicAssetUrl', () => {
	it('zostaje wyłącznie jako klucz parowania starych treści', () => {
		expect(legacyPublicAssetUrl(`${POST_ID}/abc.pdf`)).toBe(LEGACY_URL);
	});
});
