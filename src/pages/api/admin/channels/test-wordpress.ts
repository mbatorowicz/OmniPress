import type { APIRoute } from 'astro';
import { requireAdmin, testWordPressChannel } from '@/lib/admin';

export const POST: APIRoute = async ({ request, locals }) => {
	if (!requireAdmin(locals)) {
		return new Response(JSON.stringify({ ok: false, message: 'Brak uprawnień.' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const form = await request.formData();
	const result = await testWordPressChannel(locals.supabase, form);
	return new Response(JSON.stringify(result), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
