import type { SupabaseClient } from '@supabase/supabase-js';
import { nextGallerySortOrder } from '@/lib/posts/assets';
import { extensionForMime } from '@/lib/posts/upload-markdown';
import type { UploadKind } from '@/lib/posts/upload-mime';

const BUCKET = 'post-assets';

export type StoreInboundAttachmentInput = {
	postId: string;
	filename: string;
	mime: string;
	kind: UploadKind;
	bytes: Uint8Array;
	displayMode?: 'link' | 'embed';
};

export async function storeInboundAttachment(
	supabase: SupabaseClient,
	input: StoreInboundAttachmentInput,
): Promise<boolean> {
	const path = `${input.postId}/${crypto.randomUUID()}.${extensionForMime(input.mime)}`;
	const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, input.bytes, {
		contentType: input.mime,
		upsert: false,
	});
	if (uploadError) return false;

	const sortOrder =
		input.kind === 'gallery' ? await nextGallerySortOrder(supabase, input.postId) : 0;
	const { error: insertError } = await supabase.from('assets').insert({
		post_id: input.postId,
		storage_path: path,
		filename: input.filename,
		mime_type: input.mime,
		sort_order: sortOrder,
		display_mode: input.displayMode === 'embed' ? 'embed' : 'link',
	});
	if (!insertError) return true;

	await supabase.storage.from(BUCKET).remove([path]);
	return false;
}

export async function saveInboundDraftContent(
	supabase: SupabaseClient,
	postId: string,
	contentMd: string,
): Promise<void> {
	await supabase.from('posts').update({ content_md: contentMd }).eq('id', postId);
}
