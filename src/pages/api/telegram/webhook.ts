import type { APIRoute } from 'astro';
import { handleTelegramWebhook } from '@/lib/notify/telegram-webhook';

export const POST: APIRoute = async ({ request }) => handleTelegramWebhook(request);
