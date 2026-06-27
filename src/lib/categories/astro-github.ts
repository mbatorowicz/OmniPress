import { parseCategoriesFile } from '@/lib/astro-layout/parse';
import { categoriesConfigPath } from '@/lib/admin/config-paths';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from '@/lib/publish/credentials';
import { getGitHubFileText, parseGitHubRepoConfig } from '@/lib/publish/github-api';
import type { DestinationForPublish } from '@/lib/publish/types';
import type { CategoryOption } from './types';

export async function fetchAstroCategories(
	destination: DestinationForPublish,
): Promise<CategoryOption[]> {
	const cfg = parseGitHubRepoConfig(destination.config);
	if (!cfg) return [];

	const creds = await decryptDestinationCredentials(destination);
	if (!creds || !isGitHubCredentials(destination.type, creds)) {
		throw new Error('Brak tokenu GitHub do odczytu kategorii Astro');
	}

	const path = categoriesConfigPath(destination.config);
	const text = await getGitHubFileText(cfg, creds.token, path);
	if (!text) {
		throw new Error(
			`Brak pliku ${path} w repozytorium — dodaj listę kategorii w projekcie Astro`,
		);
	}

	try {
		const parsed = parseCategoriesFile(text);
		return parsed.categories
			.filter((c) => c.slug && c.name)
			.map((c) => ({
				slug: c.slug,
				name: c.name,
				sources: ['github_astro'] as const,
			}));
	} catch {
		throw new Error('Plik kategorii Astro: nieprawidłowy JSON');
	}
}
