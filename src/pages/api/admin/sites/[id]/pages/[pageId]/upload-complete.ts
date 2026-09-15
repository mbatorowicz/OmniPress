import type { APIRoute } from 'astro';
import { api } from '@/i18n';
import { guardAdminJson, isGuardBlocked, jsonError, jsonResponse } from '@/lib/api';
import { completeAssetUpload } from '@/lib/posts';
import { getSitePageById } from '@/lib/site-pages';

export const prerender = false;
export const maxDuration = 15;

export const POST: APIRoute = async ({ params, request, locals }) => {
	const pageId = params.pageId;
	const siteId = params.id;
	if (!pageId || !siteId) return jsonError(api.posts.missingPostId, 400);

	const auth = guardAdminJson(locals);
	if (isGuardBlocked(auth)) return auth;

	const page = await getSitePageById(auth.supabase, pageId);
	if (!page || page.site_id !== siteId) return jsonError(api.posts.forbidden, 403);

	let body: { kind?: string; path?: string; filename?: string; mime?: string; size?: number };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return jsonError(api.posts.missingFile, 400);
	}

	const path = String(body.path ?? '').trim();
	const filename = String(body.filename ?? '').trim();
	const mime = String(body.mime ?? '').trim();
	const size = Number(body.size);
	if (!path || !filename || !mime || !Number.isFinite(size) || size < 1) {
		return jsonError(api.posts.missingFile, 400);
	}

	const result = await completeAssetUpload(
		auth.supabase,
		{ kind: 'page', id: pageId, siteId },
		{ kind: String(body.kind ?? ''), path, filename, mime, size },
	);
	if (!result.ok) return jsonError(result.error, result.status);

	return jsonResponse({
		url: result.url,
		markdown: result.markdown,
		asset: result.asset,
	});
};
