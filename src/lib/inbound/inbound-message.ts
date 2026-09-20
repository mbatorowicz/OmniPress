import type { SupabaseClient } from '@supabase/supabase-js';
import {
	inboundRecordPayload,
	mapInboundMessageRow,
	type InboundMessageRow,
	type RecordInboundInput,
} from './inbound-message-model';

const UNIQUE_VIOLATION = '23505';

function errorCode(error: unknown): string {
	if (!error || typeof error !== 'object' || !('code' in error)) return '';
	const code = (error as { code?: unknown }).code;
	return typeof code === 'string' ? code : '';
}

export async function findInboundMessage(
	supabase: SupabaseClient,
	messageId: string,
): Promise<InboundMessageRow | null> {
	const id = messageId.trim();
	if (!id) return null;
	const { data } = await supabase
		.from('inbound_messages')
		.select('message_id, from_email, post_id, page_id, status, source_message_id')
		.eq('message_id', id)
		.maybeSingle();
	return mapInboundMessageRow(data);
}

export async function recordInboundMessage(
	supabase: SupabaseClient,
	input: RecordInboundInput,
): Promise<{ ok: true; created: boolean } | { ok: false }> {
	const existing = await findInboundMessage(supabase, input.messageId);
	if (existing) return { ok: true, created: false };
	const { error } = await supabase.from('inbound_messages').insert(inboundRecordPayload(input));
	if (!error) return { ok: true, created: true };
	if (errorCode(error) === UNIQUE_VIOLATION) return { ok: true, created: false };
	return { ok: false };
}
