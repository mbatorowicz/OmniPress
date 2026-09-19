import { inbound } from '@/i18n';
import { jsonError, jsonOk } from '@/lib/api/response';
import { isAllowedFrom, parseAllowlist } from './allowlist';
import { inboundDraftConfig, type InboundDraftConfig } from './config';
import { forgetPreviousInbound } from './forget-previous';
import type { InboundEmailDeps } from './handle-deps';
import { ingestFetchedInbound } from './process-received';
import { getReceivedEmail, inboundResendApiKey } from './receiving';

function readDraftConfig(deps: InboundEmailDeps): InboundDraftConfig | null {
	return deps.draftConfig !== undefined ? deps.draftConfig : inboundDraftConfig();
}

export function parseReplayEmailId(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const emailId = value.trim();
	if (!emailId || /[/?#]/.test(emailId)) return null;
	return emailId;
}

/** Usuwa poprzedni szkic z tego maila i puszcza Groka jeszcze raz. */
export async function replayInboundEmail(
	emailId: string,
	deps: InboundEmailDeps = {},
): Promise<Response> {
	const draftConfig = readDraftConfig(deps);
	if (!draftConfig) return jsonOk({ ignored: true });

	const apiKey = deps.apiKey !== undefined ? (deps.apiKey ?? '') : inboundResendApiKey();
	const fetchEmail = deps.fetchEmail ?? ((id) => getReceivedEmail(id, { apiKey }));
	if (!deps.fetchEmail && !apiKey) return jsonError(inbound.replay.fetchFailed, 502);

	const email = await fetchEmail(emailId);
	if (!email) return jsonError(inbound.replay.fetchFailed, 502);
	if (!isAllowedFrom(email.from, parseAllowlist(draftConfig.allowedFrom))) {
		return jsonOk({ ignored: true });
	}

	await (deps.forgetPrevious ?? forgetPreviousInbound)(emailId);
	return ingestFetchedInbound(
		{ emailId, from: email.from, subject: email.subject },
		email,
		deps,
	);
}
