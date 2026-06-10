import type { APIRoute } from 'astro';
import { fetchOsmetTeryt, normalizeOsmetTeryt } from '@/lib/weather';
import { WEATHER_WARNINGS_CACHE_TTL_MS } from '@/lib/weather/types';

const CACHE_SECONDS = WEATHER_WARNINGS_CACHE_TTL_MS / 1000;

function parseTerytPowiat(url: URL): string | null {
	const raw = url.searchParams.get('terytPowiat')?.trim();
	if (!raw || !/^\d{4}$/.test(raw)) return null;
	return raw;
}

function parseMapScope(url: URL): string[] {
	const raw = url.searchParams.get('mapScope')?.trim();
	if (!raw) return [];
	return raw
		.split(',')
		.map((c) => c.trim())
		.filter((c) => /^\d{4}$/.test(c));
}

export const GET: APIRoute = async ({ url }) => {
	const terytPowiat = parseTerytPowiat(url);
	if (!terytPowiat) {
		return new Response(JSON.stringify({ ok: false, error: 'invalid_teryt_powiat' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const mapScopePowiaty = parseMapScope(url).filter((c) => c !== terytPowiat);
	const lat = Number(url.searchParams.get('lat'));
	const lon = Number(url.searchParams.get('lon'));
	const mapCenter =
		Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : { lat: 0, lon: 0 };

	try {
		const raw = await fetchOsmetTeryt();
		const file = normalizeOsmetTeryt(raw, {
			terytPowiat,
			mapCenter,
			mapScopePowiaty,
		});

		return new Response(
			JSON.stringify({
				ok: true,
				updatedAt: file.updatedAt,
				source: file.source,
				terytPowiat: file.config.terytPowiat,
				active: file.active,
				terytLevels: file.terytLevels,
				mapHighlight: file.mapHighlight,
				mapScope: file.mapScope,
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
				},
			},
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'weather_fetch_error';
		return new Response(JSON.stringify({ ok: false, error: message }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
