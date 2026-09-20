import type { APIRoute } from 'astro';
import { inbound } from '@/i18n';
import { guardAdminJson, isGuardBlocked, jsonError } from '@/lib/api';
import { parseReplayEmailId, replayInboundEmail } from '@/lib/inbound/replay';

export const maxDuration = 300;

export const POST: APIRoute = async ({ request, locals }) => {
	const auth = guardAdminJson(locals);
	if (isGuardBlocked(auth)) return auth;

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return jsonError(inbound.replay.missingEmail, 400);
	}
	const emailId = parseReplayEmailId(
		payload && typeof payload === 'object' ? (payload as { emailId?: unknown }).emailId : null,
	);
	if (!emailId) return jsonError(inbound.replay.missingEmail, 400);
	return replayInboundEmail(emailId);
};
