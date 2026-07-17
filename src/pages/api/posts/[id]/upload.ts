import type { APIRoute } from 'astro';
import { api } from '@/i18n';
import { jsonError } from '@/lib/api';

/** Legacy — upload przez body Vercel jest ograniczony (~4,5 MB). Użyj signed upload. */
export const POST: APIRoute = async () => {
	return jsonError(api.posts.uploadUseSigned, 410);
};
