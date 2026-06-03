import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from '@/lib/publish/credentials';
import { getGitHubFileText, parseGitHubRepoConfig } from '@/lib/publish/github-api';
import type { DestinationForPublish } from '@/lib/publish/types';
import type { CategoryOption } from './types';

const DEFAULT_CATEGORIES_PATH = 'src/config/omnipress-categories.json';

function categoriesPath(config: Record<string, unknown>): string {
	const raw = config.categories_path;
	return typeof raw === 'string' && raw.trim() ? raw.trim() : DEFAULT_CATEGORIES_PATH;
}

type RawCategory = { slug?: string; name?: string };

function parseCategoriesJson(text: string): CategoryOption[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error('Plik kategorii Astro: nieprawidłowy JSON');
	}

	const rows: RawCategory[] = Array.isArray(parsed)
		? parsed
		: parsed && typeof parsed === 'object' && Array.isArray((parsed as { categories?: RawCategory[] }).categories)
			? (parsed as { categories: RawCategory[] }).categories
			: [];

	return rows
		.filter((r) => typeof r.slug === 'string' && typeof r.name === 'string')
		.map((r) => ({
			slug: String(r.slug).trim(),
			name: String(r.name).trim(),
			wpCategoryId: null,
			sources: ['github_astro'] as const,
		}));
}

export async function fetchAstroCategories(
	destination: DestinationForPublish,
): Promise<CategoryOption[]> {
	const cfg = parseGitHubRepoConfig(destination.config);
	if (!cfg) return [];

	const creds = await decryptDestinationCredentials(destination);
	if (!creds || !isGitHubCredentials(destination.type, creds)) {
		throw new Error('Brak tokenu GitHub do odczytu kategorii Astro');
	}

	const path = categoriesPath(destination.config);
	const text = await getGitHubFileText(cfg, creds.token, path);
	if (!text) {
		throw new Error(
			`Brak pliku ${path} w repozytorium — dodaj listę kategorii w projekcie Astro`,
		);
	}

	return parseCategoriesJson(text);
}
