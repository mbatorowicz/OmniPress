import { parseReceivedAttachments, type InboundAttachmentMeta } from './attachment-model';
import { RESEND_RECEIVING_BASE, RESEND_TIMEOUT_MS } from './receiving';

export type DownloadAttachmentResult =
	| { ok: true; bytes: Uint8Array }
	| { ok: false; reason: 'fetch_failed' | 'too_large' };

export type ReceivingFetchOpts = {
	fetch?: typeof fetch;
	timeoutMs?: number;
};

function receivingAttachmentsUrl(emailId: string): string {
	return `${RESEND_RECEIVING_BASE}/${encodeURIComponent(emailId)}/attachments`;
}

async function fetchWithTimeout(
	url: string,
	init: RequestInit,
	opts: ReceivingFetchOpts,
): Promise<Response | null> {
	const doFetch = opts.fetch ?? fetch;
	const timeoutMs = opts.timeoutMs ?? RESEND_TIMEOUT_MS;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await doFetch(url, { ...init, signal: controller.signal });
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

/** GET emails.receiving.attachments.list — bez logowania URL plikow. */
export async function listReceivedAttachments(
	emailId: string,
	opts: ReceivingFetchOpts & { apiKey: string },
): Promise<InboundAttachmentMeta[] | null> {
	const apiKey = opts.apiKey.trim();
	const id = emailId.trim();
	if (!apiKey || !id) return null;

	const response = await fetchWithTimeout(
		receivingAttachmentsUrl(id),
		{ method: 'GET', headers: { Authorization: `Bearer ${apiKey}` } },
		opts,
	);
	if (!response?.ok) return null;
	try {
		return parseReceivedAttachments(await response.json());
	} catch {
		return null;
	}
}

export async function downloadReceivedAttachment(
	downloadUrl: string,
	opts: ReceivingFetchOpts & { maxBytes: number },
): Promise<DownloadAttachmentResult> {
	const url = downloadUrl.trim();
	if (!url.startsWith('https://') || opts.maxBytes <= 0) {
		return { ok: false, reason: 'fetch_failed' };
	}

	const response = await fetchWithTimeout(url, { method: 'GET' }, opts);
	if (!response?.ok) return { ok: false, reason: 'fetch_failed' };

	const length = Number(response.headers.get('content-length') ?? '');
	if (Number.isFinite(length) && length > opts.maxBytes) {
		return { ok: false, reason: 'too_large' };
	}

	try {
		const bytes = new Uint8Array(await response.arrayBuffer());
		if (bytes.byteLength > opts.maxBytes) return { ok: false, reason: 'too_large' };
		if (bytes.byteLength === 0) return { ok: false, reason: 'fetch_failed' };
		return { ok: true, bytes };
	} catch {
		return { ok: false, reason: 'fetch_failed' };
	}
}
