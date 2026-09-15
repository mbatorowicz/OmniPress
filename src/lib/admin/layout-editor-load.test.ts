import { afterEach, describe, expect, it, vi } from 'vitest';

describe('loadLayoutForEditor', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetModules();
	});

	it('nie importuje wpisów i stron przy otwarciu edytora layoutu', async () => {
		const ensureSite = vi.fn();
		vi.doMock('@/lib/sync/ensure-site', () => ({
			ensureSiteFromGitHub: ensureSite,
		}));
		vi.doMock('@/lib/admin/layout-auto-import', () => ({
			ensureLayoutFromGitHub: async () => ({
				layout: { navigation: [], categories: [], slots: [] },
				imported: false,
			}),
		}));
		vi.doMock('@/lib/astro-layout/store', () => ({
			loadSiteAstroLayout: async () => ({ navigation: [] }),
		}));

		const { loadLayoutForEditor } = await import('./layout-editor-load');
		await loadLayoutForEditor({} as never, 'site-1', { authorId: 'user-1' });
		expect(ensureSite).not.toHaveBeenCalled();
	});
});
