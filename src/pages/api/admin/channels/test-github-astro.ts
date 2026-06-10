import type { APIRoute } from 'astro';
import { guardAdminJson, isGuardBlocked, jsonResponse } from '@/lib/api';
import { testGitHubAstroChannel } from '@/lib/admin';

export const POST: APIRoute = async ({ request, locals }) => {
	const auth = guardAdminJson(locals);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;

	const form = await request.formData();
	const result = await testGitHubAstroChannel(supabase, form);
	return jsonResponse(result);
};
