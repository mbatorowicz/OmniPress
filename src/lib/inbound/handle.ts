import { jsonError, jsonOk } from '@/lib/api/response';
import { isAllowedFrom, parseAllowlist } from './allowlist';
import type { InboundDraftConfig } from './config';
import { inboundDraftConfig } from './config';
import type { InboundEmailDeps } from './handle-deps';
import { notifyInboundDraft } from './notify-draft';
import { ingestFetchedInbound } from './process-received';
import { getReceivedEmail, inboundResendApiKey } from './receiving';
import { scheduleInboundIngest } from './schedule';
import { authorizeInboundWebhook, inboundWebhookSecret } from './webhook-auth';
import { parseEmailReceivedEvent } from './webhook-event';

export type { InboundEmailDeps } from './handle-deps';

function readSecret(deps: InboundEmailDeps): string {
	return deps.secret !== undefined ? (deps.secret ?? '') : inboundWebhookSecret();
}

function readDraftConfig(deps: InboundEmailDeps): InboundDraftConfig | null {
	return deps.draftConfig !== undefined ? deps.draftConfig : inboundDraftConfig();
}

async function runInboundIngest(
	event: { emailId: string; from: string; subject: string },
	deps: InboundEmailDeps,
): Promise<Response> {
	const apiKey = deps.apiKey !== undefined ? (deps.apiKey ?? '') : inboundResendApiKey();
	const fetchEmail = deps.fetchEmail ?? ((id) => getReceivedEmail(id, { apiKey }));
	if (!deps.fetchEmail && !apiKey) return jsonOk({ ignored: true });
	const email = await fetchEmail(event.emailId);
	if (!email) {
		await (deps.notify ?? notifyInboundDraft)(null, event.subject, { kind: 'failed' });
		return jsonError('fetch_failed', 502);
	}
	return ingestFetchedInbound(event, email, deps);
}

export async function handleInboundEmail(
	request: Request,
	deps: InboundEmailDeps = {},
): Promise<Response> {
	const rawBody = await request.text();
	if (!authorizeInboundWebhook(request.headers, rawBody, readSecret(deps), deps.nowSec)) {
		return new Response('Unauthorized', { status: 401 });
	}

	let payload: unknown;
	try {
		payload = JSON.parse(rawBody) as unknown;
	} catch {
		return jsonOk({ ignored: true });
	}

	const event = parseEmailReceivedEvent(payload);
	const draftConfig = readDraftConfig(deps);
	if (!event || !draftConfig) return jsonOk({ ignored: true });
	if (!isAllowedFrom(event.from, parseAllowlist(draftConfig.allowedFrom))) {
		return jsonOk({ ignored: true });
	}

	if (deps.deferIngest) {
		scheduleInboundIngest(
			runInboundIngest(event, deps).catch(() => {}),
			deps.schedule,
		);
		return jsonOk({ accepted: true });
	}
	return runInboundIngest(event, deps);
}
