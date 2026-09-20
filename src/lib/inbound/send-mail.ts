import { inboundResendApiKey, RESEND_TIMEOUT_MS } from './receiving';
import { inboundMailPayload, RESEND_SEND_URL, type SendInboundMailInput } from './send-mail-model';

export type SendInboundMailOpts = {
	apiKey?: string;
	fetch?: typeof fetch;
	timeoutMs?: number;
};

/** Wysyłka Resend. Treści urzędowej nie logować. */
export async function sendInboundMail(
	input: SendInboundMailInput,
	opts: SendInboundMailOpts = {},
): Promise<boolean> {
	const apiKey = (opts.apiKey ?? inboundResendApiKey()).trim();
	const to = input.to.trim();
	if (!apiKey || !to) return false;
	const doFetch = opts.fetch ?? fetch;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? RESEND_TIMEOUT_MS);
	try {
		const response = await doFetch(RESEND_SEND_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(inboundMailPayload(input)),
			signal: controller.signal,
		});
		return response.ok;
	} catch {
		return false;
	} finally {
		clearTimeout(timer);
	}
}
