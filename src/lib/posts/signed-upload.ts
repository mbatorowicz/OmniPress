import type { SupabaseClient } from '@supabase/supabase-js';
import { api, formatUploadError } from '@/i18n';
import { nextGallerySortOrder } from '@/lib/posts/assets';
import { assetFileUrlFor, pageAssetFileUrlFor } from '@/lib/publish/asset-model';
import {
	extensionForMime,
	markdownForUploadedAsset,
	parseUploadKind,
	validateUploadMeta,
	type UploadKind,
} from '@/lib/posts/upload';
import { replaceOptimizedStoredImage } from '@/lib/posts/optimize-stored-image';
import { verifyUploadedFile } from '@/lib/posts/upload-verify';

export type SignedUploadUrlResult =
	| {
			ok: true;
			path: string;
			token: string;
			signedUrl: string;
			mime: string;
			filename: string;
			kind: UploadKind;
	  }
	| { ok: false; status: number; error: string };

export type CompleteUploadResult =
	| {
			ok: true;
			url: string;
			markdown: string | null;
			asset: {
				id: string;
				filename: string;
				mime_type: string;
				display_mode: string;
				sort_order: number;
				url: string;
			};
	  }
	| { ok: false; status: number; error: string };

export type AssetUploadOwner =
	| { kind: 'post'; id: string }
	| { kind: 'page'; id: string; siteId: string };

export async function createAssetSignedUpload(
	supabase: SupabaseClient,
	ownerId: string,
	input: { kind: string; filename: string; size: number; mimeType: string },
): Promise<SignedUploadUrlResult> {
	const kind = parseUploadKind(input.kind);
	if (!kind) return { ok: false, status: 400, error: api.posts.missingFile };

	const meta = validateUploadMeta(kind, input.filename, input.size, input.mimeType);
	if ('error' in meta) return { ok: false, status: 400, error: meta.error };

	const path = `${ownerId}/${crypto.randomUUID()}.${extensionForMime(meta.mime)}`;
	const { data, error } = await supabase.storage.from('post-assets').createSignedUploadUrl(path);
	if (error || !data) {
		return { ok: false, status: 500, error: formatUploadError(error?.message) };
	}

	return {
		ok: true,
		path: data.path,
		token: data.token,
		signedUrl: data.signedUrl,
		mime: meta.mime,
		filename: input.filename,
		kind,
	};
}

export function createPostAssetSignedUpload(
	supabase: SupabaseClient,
	postId: string,
	input: { kind: string; filename: string; size: number; mimeType: string },
): Promise<SignedUploadUrlResult> {
	return createAssetSignedUpload(supabase, postId, input);
}

export async function completeAssetUpload(
	supabase: SupabaseClient,
	owner: AssetUploadOwner,
	input: { kind: string; path: string; filename: string; mime: string; size: number },
): Promise<CompleteUploadResult> {
	const kind = parseUploadKind(input.kind);
	if (!kind) return { ok: false, status: 400, error: api.posts.missingFile };
	if (!input.path.startsWith(`${owner.id}/`) || input.path.includes('..')) {
		return { ok: false, status: 400, error: api.posts.missingFile };
	}

	const meta = validateUploadMeta(kind, input.filename, input.size, input.mime);
	if ('error' in meta) return { ok: false, status: 400, error: meta.error };
	if (meta.mime !== input.mime) {
		return { ok: false, status: 400, error: api.posts.missingFile };
	}

	const verified = await verifyUploadedFile(supabase, input.path, meta.mime, input.size);
	if (!verified.ok) {
		await supabase.storage.from('post-assets').remove([input.path]);
		return { ok: false, status: 400, error: verified.error };
	}

	const stored = await replaceOptimizedStoredImage(supabase, input.path, meta.mime);

	const sortOrder =
		kind === 'gallery' && owner.kind === 'post'
			? await nextGallerySortOrder(supabase, owner.id)
			: 0;
	const ownerKey = owner.kind === 'post' ? { post_id: owner.id } : { page_id: owner.id };
	const { data: assetRow, error: insertError } = await supabase
		.from('assets')
		.insert({
			...ownerKey,
			storage_path: stored.path,
			filename: input.filename,
			mime_type: stored.mime,
			sort_order: sortOrder,
		})
		.select('id, filename, mime_type, display_mode, sort_order')
		.single();

	if (insertError || !assetRow) {
		await supabase.storage.from('post-assets').remove([stored.path]);
		return { ok: false, status: 500, error: api.posts.uploadFailed };
	}

	const fileUrl =
		owner.kind === 'post'
			? assetFileUrlFor(owner.id, assetRow.id)
			: pageAssetFileUrlFor(owner.siteId, owner.id, assetRow.id);
	const markdown =
		kind === 'pdf' || kind === 'docx' || kind === 'file'
			? markdownForUploadedAsset(input.filename, fileUrl, stored.mime)
			: null;

	return {
		ok: true,
		url: fileUrl,
		markdown,
		asset: {
			id: assetRow.id,
			filename: assetRow.filename,
			mime_type: assetRow.mime_type,
			display_mode: assetRow.display_mode ?? 'link',
			sort_order: assetRow.sort_order ?? 0,
			url: fileUrl,
		},
	};
}

export function completePostAssetUpload(
	supabase: SupabaseClient,
	postId: string,
	input: { kind: string; path: string; filename: string; mime: string; size: number },
): Promise<CompleteUploadResult> {
	return completeAssetUpload(supabase, { kind: 'post', id: postId }, input);
}
