import type { APIRoute } from 'astro';
import { handleInboundEmail } from '@/lib/inbound/handle';

export const maxDuration = 300;

export const POST: APIRoute = async ({ request }) =>
	handleInboundEmail(request, { deferIngest: true });
