import type { APIRoute } from 'astro';
import { handleInboundEmail } from '@/lib/inbound/webhook-auth';

export const POST: APIRoute = async ({ request }) => handleInboundEmail(request);
