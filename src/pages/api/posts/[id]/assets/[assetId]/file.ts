import type { APIRoute } from 'astro';
import { guardAuthJson, isGuardBlocked } from '@/lib/api';
import { servePostAssetFile } from '@/lib/posts/asset-file';

export const GET: APIRoute = async ({ params, locals }) => {
	const postId = params.id;
	const assetId = params.assetId;
	if (!postId || !assetId) return new Response(null, { status: 400 });

	const auth = guardAuthJson(locals);
	if (isGuardBlocked(auth)) return auth;

	const result = await servePostAssetFile(
		auth.supabase,
		postId,
		assetId,
		auth.user.id,
		auth.profile.role,
	);

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
