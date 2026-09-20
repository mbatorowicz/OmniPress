import { jsonOk } from '@/lib/api/response';
import { extractFromEmail } from './allowlist';
import { inboundClarifyMail } from './clarify-mail';
import type { InboundEmailDeps } from './handle-deps';
import type { ReplaceCandidate } from './match-replace-model';
import { notifyInboundDraft } from './notify-draft';
import { sendInboundMail } from './send-mail';

export async function ingestClarify(input: {
	emailId: string;
	from: string;
	subject: string;
	question: string;
	candidates?: ReplaceCandidate[];
	sourceMessageId?: string | null;
	deps: InboundEmailDeps;
	record: NonNullable<InboundEmailDeps['recordInbound']>;
}): Promise<Response> {
	const to = extractFromEmail(input.from);
	if (!to) return jsonOk({ created: false, clarified: false });

	const recorded = await input.record({
		messageId: input.emailId,
		fromEmail: to,
		status: 'awaiting_clarification',
		sourceMessageId: input.sourceMessageId ?? null,
	});
	if (!recorded.ok) return jsonOk({ created: false, clarified: false });
	if (!recorded.created) return jsonOk({ created: false, clarified: false });

	const mail = inboundClarifyMail({
		emailId: input.emailId,
		to,
		subject: input.subject,
		question: input.question,
		candidates: input.candidates,
	});
	const send = input.deps.sendClarify ?? ((payload) => sendInboundMail(payload));
	await send(mail);
	await (input.deps.notify ?? notifyInboundDraft)(null, input.subject, {
		kind: 'clarify',
		question: input.question,
	});
	return jsonOk({ created: false, clarified: true });
}
