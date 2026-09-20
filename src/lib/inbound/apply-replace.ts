import type { SupabaseClient } from '@supabase/supabase-js';
import { reopenPostForEditing } from '@/lib/admin/posts';
import { extensionForMime } from '@/lib/posts/upload-markdown';
import { pickReplaceFile, replaceDisplayMode } from './apply-replace-model';
import type { InboundFileInventory } from './collect-attachment-texts';
import type { ReplaceCandidate } from './match-replace-model';

const BUCKET = 'post-assets';

export type ApplyReplaceInput = {
	candidate: ReplaceCandidate;
	inventory: InboundFileInventory[];
	filename?: string | null;
	display?: 'embed' | 'link' | null;
};

export type ApplyReplaceResult =
	| { ok: true; filename: string }
	| { ok: false; error: 'no_file' | 'no_asset' | 'upload_failed' | 'reopen_failed' };

async function loadAsset(
	supabase: SupabaseClient,
	candidate: ReplaceCandidate,
	filename?: string | null,
): Promise<{ id: string; storage_path: string; display_mode: string } | null> {
	const column = candidate.kind === 'post' ? 'post_id' : 'page_id';
	const { data } = await supabase
		.from('assets')
		.select('id, storage_path, filename, display_mode')
		.eq(column, candidate.id)
		.order('sort_order', { ascending: true });
	const rows = (data ?? []) as {
		id?: string;
		storage_path?: string;
		filename?: string;
		display_mode?: string;
	}[];
	const named = filename
		? rows.find((row) => row.filename?.toLowerCase() === filename.trim().toLowerCase())
		: null;
	const row = named ?? (rows.length === 1 ? rows[0] : null);
	if (!row?.id || !row.storage_path) return null;
	return { id: row.id, storage_path: row.storage_path, display_mode: row.display_mode ?? 'link' };
}

async function markPageDraft(supabase: SupabaseClient, pageId: string): Promise<boolean> {
	const { data, error } = await supabase
		.from('site_pages')
		.update({ status: 'draft' })
		.eq('id', pageId)
		.select('id')
		.maybeSingle();
	return !error && Boolean(data);
}

/** Podmiana wiersza assets. Stary obiekt Storage znika dopiero po udanym wgraniu. Zero publikacji. */
export async function applyInboundReplace(
	supabase: SupabaseClient,
	input: ApplyReplaceInput,
): Promise<ApplyReplaceResult> {
	const file = pickReplaceFile(input.inventory, input.filename ?? input.candidate.filename);
	if (!file) return { ok: false, error: 'no_file' };
	const asset = await loadAsset(supabase, input.candidate, input.filename ?? input.candidate.filename);
	if (!asset) return { ok: false, error: 'no_asset' };

	const path = `${input.candidate.id}/${crypto.randomUUID()}.${extensionForMime(file.mime)}`;
	const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file.bytes, {
		contentType: file.mime,
		upsert: false,
	});
	if (uploadError) return { ok: false, error: 'upload_failed' };

	const { error: updateError } = await supabase
		.from('assets')
		.update({
			storage_path: path,
			filename: file.filename,
			mime_type: file.mime,
			display_mode: replaceDisplayMode(asset.display_mode, input.display),
		})
		.eq('id', asset.id);
	if (updateError) {
		await supabase.storage.from(BUCKET).remove([path]);
		return { ok: false, error: 'upload_failed' };
	}

	await supabase.storage.from(BUCKET).remove([asset.storage_path]);

	if (input.candidate.kind === 'post') {
		const reopened = await reopenPostForEditing(supabase, input.candidate.id);
		if (!reopened.ok) return { ok: false, error: 'reopen_failed' };
	} else if (!(await markPageDraft(supabase, input.candidate.id))) {
		return { ok: false, error: 'reopen_failed' };
	}
	return { ok: true, filename: file.filename };
}
