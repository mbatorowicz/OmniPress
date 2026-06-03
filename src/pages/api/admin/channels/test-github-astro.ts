import type { APIRoute } from 'astro';
import { requireAdmin, testGitHubAstroChannel } from '@/lib/admin';

export const POST: APIRoute = async ({ request, locals }) => {
	if (!requireAdmin(locals)) {
		return new Response(JSON.stringify({ ok: false, message: 'Brak uprawnień.' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const form = await request.formData();
	const result = await testGitHubAstroChannel(locals.supabase, form);
	return new Response(JSON.stringify(result), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
