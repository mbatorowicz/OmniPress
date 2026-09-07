import type { SupabaseClient } from '@supabase/supabase-js';
import { api, formatUploadError } from '@/i18n';
import { nextGallerySortOrder } from '@/lib/posts/assets';
import { assetFileUrlFor } from '@/lib/publish/asset-model';
import {
	extensionForMime,
	markdownForUploadedAsset,
	parseUploadKind,
	validateUploadMeta,
	type UploadKind,
} from '@/lib/posts/upload';
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

export async function createPostAssetSignedUpload(
	supabase: SupabaseClient,
	postId: string,
	input: { kind: string; filename: string; size: number; mimeType: string },
): Promise<SignedUploadUrlResult> {
	const kind = parseUploadKind(input.kind);
	if (!kind) return { ok: false, status: 400, error: api.posts.missingFile };

	const meta = validateUploadMeta(kind, input.filename, input.size, input.mimeType);
	if ('error' in meta) return { ok: false, status: 400, error: meta.error };

	const ext = extensionForMime(meta.mime);
	const storageFilename = `${crypto.randomUUID()}.${ext}`;
	const path = `${postId}/${storageFilename}`;

	const { data, error } = await supabase.storage
		.from('post-assets')
		.createSignedUploadUrl(path);

	if (error || !data) {
		return {
			ok: false,
			status: 500,
			error: formatUploadError(error?.message),
		};
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

export async function completePostAssetUpload(
	supabase: SupabaseClient,
	postId: string,
	input: {
		kind: string;
		path: string;
		filename: string;
		mime: string;
		size: number;
	},
): Promise<CompleteUploadResult> {
	const kind = parseUploadKind(input.kind);
	if (!kind) return { ok: false, status: 400, error: api.posts.missingFile };

	if (!input.path.startsWith(`${postId}/`) || input.path.includes('..')) {
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

	const sortOrder = kind === 'gallery' ? await nextGallerySortOrder(supabase, postId) : 0;

	const { data: assetRow, error: insertError } = await supabase
		.from('assets')
		.insert({
			post_id: postId,
			storage_path: input.path,
			filename: input.filename,
			mime_type: meta.mime,
			sort_order: sortOrder,
		})
		.select('id, filename, mime_type, display_mode, sort_order')
		.single();

	if (insertError || !assetRow) {
		await supabase.storage.from('post-assets').remove([input.path]);
		return { ok: false, status: 500, error: api.posts.uploadFailed };
	}

	const fileUrl = assetFileUrlFor(postId, assetRow.id);
	const markdown =
		kind === 'pdf' || kind === 'docx' || kind === 'file'
			? markdownForUploadedAsset(input.filename, fileUrl, meta.mime)
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
