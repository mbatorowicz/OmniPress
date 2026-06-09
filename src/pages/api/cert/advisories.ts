import type { APIRoute } from 'astro';
import { fetchCertAdvisories, filterCertAdvisories } from '@/lib/cert';

export const GET: APIRoute = async ({ url }) => {
	const limitParam = url.searchParams.get('limit');
	const category = url.searchParams.get('category')?.trim() || undefined;
	const limit = limitParam ? Number(limitParam) : 5;

	try {
		const all = await fetchCertAdvisories();
		const entries = filterCertAdvisories(all, {
			limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 5,
			categoryFilter: category,
		});

		return new Response(
			JSON.stringify({
				ok: true,
				updatedAt: new Date().toISOString(),
				source: 'https://moje.cert.pl/komunikaty/',
				entries,
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=900, s-maxage=900',
				},
			},
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'cert_feed_error';
		return new Response(JSON.stringify({ ok: false, error: message }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
