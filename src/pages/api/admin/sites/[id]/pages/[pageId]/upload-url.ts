import type { APIRoute } from 'astro';
import { api } from '@/i18n';
import { guardAdminJson, isGuardBlocked, jsonError, jsonResponse } from '@/lib/api';
import { createAssetSignedUpload } from '@/lib/posts';
import { getSitePageById } from '@/lib/site-pages';

export const POST: APIRoute = async ({ params, request, locals }) => {
	const pageId = params.pageId;
	const siteId = params.id;
	if (!pageId || !siteId) return jsonError(api.posts.missingPostId, 400);

	const auth = guardAdminJson(locals);
	if (isGuardBlocked(auth)) return auth;

	const page = await getSitePageById(auth.supabase, pageId);
	if (!page || page.site_id !== siteId) return jsonError(api.posts.forbidden, 403);

	let body: { kind?: string; filename?: string; size?: number; mimeType?: string };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return jsonError(api.posts.missingFile, 400);
	}

	const filename = String(body.filename ?? '').trim();
	const size = Number(body.size);
	if (!filename || !Number.isFinite(size) || size < 1) {
		return jsonError(api.posts.missingFile, 400);
	}

	const result = await createAssetSignedUpload(auth.supabase, pageId, {
		kind: String(body.kind ?? ''),
		filename,
		size,
		mimeType: String(body.mimeType ?? ''),
	});
	if (!result.ok) return jsonError(result.error, result.status);

	return jsonResponse({
		path: result.path,
		token: result.token,
		signedUrl: result.signedUrl,
		mime: result.mime,
		filename: result.filename,
		kind: result.kind,
	});
};
