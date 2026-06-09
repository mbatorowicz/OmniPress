import type { GitHubConfig, GitHubTextFileWrite } from '@/lib/publish/github-api';
import { getGitHubFile, putGitHubFile } from '@/lib/publish/github-api';
import type { WeatherSlotWidgetConfig } from '@/lib/astro-layout/types';
import { fetchOsmetTeryt } from './fetch';
import { normalizeOsmetTeryt } from './normalize';
import { buildWeatherWarningsPayload } from './payload';
import type { WeatherWarningsFile } from './types';
import { weatherWarningsPath } from './types';

export async function prepareWeatherWarningsFileWrite(
	destinationConfig: Record<string, unknown>,
	widgetConfig?: WeatherSlotWidgetConfig | null,
): Promise<GitHubTextFileWrite & { count: number } | null> {
	if (!widgetConfig?.terytPowiat?.trim()) return null;

	const raw = await fetchOsmetTeryt();
	const file: WeatherWarningsFile = normalizeOsmetTeryt(raw, widgetConfig);
	return {
		path: weatherWarningsPath(destinationConfig),
		content: buildWeatherWarningsPayload(file),
		count: file.active.length,
	};
}

export async function syncWeatherWarningsOnGitHub(
	cfg: GitHubConfig,
	token: string,
	destinationConfig: Record<string, unknown>,
	widgetConfig?: WeatherSlotWidgetConfig | null,
): Promise<
	{ ok: true; count: number; commitSha?: string } | { ok: false; error: string }
> {
	if (!widgetConfig?.terytPowiat?.trim()) {
		return { ok: true, count: 0 };
	}

	try {
		const prepared = await prepareWeatherWarningsFileWrite(destinationConfig, widgetConfig);
		if (!prepared) return { ok: true, count: 0 };

		const existing = await getGitHubFile(cfg, token, prepared.path);
		const { commitSha } = await putGitHubFile(
			cfg,
			token,
			prepared.path,
			prepared.content,
			'OmniPress: ostrzeżenia pogodowe IMGW',
			existing?.sha,
		);

		return { ok: true, count: prepared.count, commitSha };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'weather_sync_failed';
		return { ok: false, error: message };
	}
}
