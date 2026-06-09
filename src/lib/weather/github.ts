import type { GitHubConfig } from '@/lib/publish/github-api';
import { getGitHubFile, putGitHubFile } from '@/lib/publish/github-api';
import type { WeatherSlotWidgetConfig } from '@/lib/astro-layout/types';
import { fetchOsmetTeryt } from './fetch';
import { normalizeOsmetTeryt } from './normalize';
import { buildWeatherWarningsPayload } from './payload';
import type { WeatherWarningsFile } from './types';
import { weatherWarningsPath } from './types';

export async function syncWeatherWarningsOnGitHub(
	cfg: GitHubConfig,
	token: string,
	destinationConfig: Record<string, unknown>,
	widgetConfig?: WeatherSlotWidgetConfig | null,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
	if (!widgetConfig?.terytPowiat?.trim()) {
		return { ok: true, count: 0 };
	}

	try {
		const raw = await fetchOsmetTeryt();
		const file: WeatherWarningsFile = normalizeOsmetTeryt(raw, widgetConfig);
		const path = weatherWarningsPath(destinationConfig);
		const existing = await getGitHubFile(cfg, token, path);
		await putGitHubFile(
			cfg,
			token,
			path,
			buildWeatherWarningsPayload(file),
			'OmniPress: ostrzeżenia pogodowe IMGW',
			existing?.sha,
		);

		return { ok: true, count: file.active.length };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'weather_sync_failed';
		return { ok: false, error: message };
	}
}
