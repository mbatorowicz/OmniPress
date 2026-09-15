import type { APIRoute } from 'astro';
import { guardAdminJson, isGuardBlocked } from '@/lib/api';
import { servePageAssetFile } from '@/lib/site-pages/asset-file';

export const GET: APIRoute = async ({ params, locals }) => {
	const siteId = params.id;
	const pageId = params.pageId;
	const assetId = params.assetId;
	if (!siteId || !pageId || !assetId) return new Response(null, { status: 400 });

	const auth = guardAdminJson(locals);
	if (isGuardBlocked(auth)) return auth;

	const result = await servePageAssetFile(auth.supabase, siteId, pageId, assetId);
	if (!result.ok) return new Response(null, { status: result.status });

	return new Response(result.body, {
		status: 200,
		headers: {
			'Content-Type': result.mimeType,
			'Content-Disposition': `inline; filename="${encodeURIComponent(result.filename)}"`,
			'Cache-Control': 'private, max-age=3600',
		},
	});
};
