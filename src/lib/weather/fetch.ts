import type { OsmetTerytResponse } from './types';
import { OSMET_TERYT_URL, WEATHER_WARNINGS_CACHE_TTL_MS } from './types';

let cachedResponse: OsmetTerytResponse | null = null;
let cachedAt = 0;

export function clearWeatherWarningsCache(): void {
	cachedResponse = null;
	cachedAt = 0;
}

export async function fetchOsmetTeryt(force = false): Promise<OsmetTerytResponse> {
	const now = Date.now();
	if (!force && cachedResponse && now - cachedAt < WEATHER_WARNINGS_CACHE_TTL_MS) {
		return cachedResponse;
	}

	const response = await fetch(OSMET_TERYT_URL, {
		headers: { Accept: 'application/json' },
	});

	if (!response.ok) {
		throw new Error(`imgw_osmet_${response.status}`);
	}

	const data = (await response.json()) as OsmetTerytResponse;
	if (!data.warnings || !data.teryt) {
		throw new Error('imgw_osmet_invalid');
	}

	cachedResponse = data;
	cachedAt = now;
	return data;
}
