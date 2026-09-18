import type { APIRoute } from 'astro';
import { handleInboundEmail } from '@/lib/inbound/handle';

export const maxDuration = 30;

export const POST: APIRoute = async ({ request }) => handleInboundEmail(request);
