import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({
	loadSiteAstroDestination: vi.fn(),
	decryptDestinationCredentials: vi.fn(),
	isGitHubCredentials: vi.fn(),
	parseGitHubRepoConfig: vi.fn(),
	getGitHubFileText: vi.fn(),
	updatePayload: vi.fn(),
}));

vi.mock('@/lib/admin/sites', () => ({
	loadSiteAstroDestination: mocks.loadSiteAstroDestination,
}));

vi.mock('@/lib/publish/credentials', () => ({
	decryptDestinationCredentials: mocks.decryptDestinationCredentials,
	isGitHubCredentials: mocks.isGitHubCredentials,
}));

vi.mock('@/lib/publish/github-api', () => ({
	parseGitHubRepoConfig: mocks.parseGitHubRepoConfig,
	getGitHubFileText: mocks.getGitHubFileText,
}));

const GMINA_NAV = `[{"label":"Gmina","children":[{"href":"/gmina/plan-ogolny","label":"Plan ogólny"}]}]`;

const corruptLayout = {
	navigation: [{ label: 'Uszkodzone', children: [{ label: 'Bez linku' }] }],
	categories: [],
	categoryDisplays: {},
	slots: [],
	navigationPath: 'src/config/omnipress-navigation.json',
	categoriesPath: 'src/config/omnipress-categories.json',
};

function createSupabase(): SupabaseClient {
	let storedLayout = corruptLayout;
	return {
		from: vi.fn(() => ({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					maybeSingle: vi.fn().mockImplementation(async () => ({
						data: { astro_layout: storedLayout },
					})),
				}),
			}),
			update: vi.fn().mockImplementation((payload) => {
				mocks.updatePayload(payload);
				if (payload?.astro_layout) {
					storedLayout = payload.astro_layout;
				}
				return { eq: vi.fn().mockResolvedValue({ error: null }) };
			}),
		})),
	} as unknown as SupabaseClient;
}

describe('importSiteAstroLayoutFromGitHub', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.loadSiteAstroDestination.mockResolvedValue({
			is_active: true,
			type: 'github_astro',
			config: { repo: 'owner/repo', branch: 'main' },
		});
		mocks.parseGitHubRepoConfig.mockReturnValue({ owner: 'owner', repo: 'repo', branch: 'main' });
		mocks.decryptDestinationCredentials.mockResolvedValue({ token: 'token' });
		mocks.isGitHubCredentials.mockReturnValue(true);
	});

	it('zwraca błąd gdy plik menu nie istnieje w GitHub', async () => {
		mocks.getGitHubFileText.mockResolvedValue(null);
		const { importSiteAstroLayoutFromGitHub } = await import('./store');
		const result = await importSiteAstroLayoutFromGitHub(createSupabase(), 'site-1');
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error).toBe('import_nav_missing');
		expect(mocks.updatePayload).not.toHaveBeenCalled();
	});

	it('nadpisuje uszkodzone menu danymi z GitHub i zwraca raport', async () => {
		mocks.getGitHubFileText.mockImplementation(async (_cfg, _token, path: string) => {
			if (path.includes('navigation')) return GMINA_NAV;
			return null;
		});

		const { importSiteAstroLayoutFromGitHub } = await import('./store');
		const result = await importSiteAstroLayoutFromGitHub(createSupabase(), 'site-1');
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.layout.navigation[0]?.children?.[0]?.href).toBe('/gmina/plan-ogolny');
		expect(result.report.hrefCount).toBe(1);
		expect(result.report.navigationPath).toBe('src/config/omnipress-navigation.json');
		expect(mocks.updatePayload).toHaveBeenCalledOnce();
		const saved = mocks.updatePayload.mock.calls[0]?.[0]?.astro_layout;
		expect(saved.navigation[0]?.children?.[0]?.href).toBe('/gmina/plan-ogolny');
	});

	it('zwraca import_nav_empty gdy plik zawiera href ale drzewo nie ma linków', async () => {
		mocks.getGitHubFileText.mockResolvedValue(
			'[{"label":"X","href":"","children":[{"label":"Liść bez href"}]}]',
		);
		const { importSiteAstroLayoutFromGitHub } = await import('./store');
		const result = await importSiteAstroLayoutFromGitHub(createSupabase(), 'site-1');
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error).toBe('import_nav_empty');
		expect(mocks.updatePayload).not.toHaveBeenCalled();
	});
});
