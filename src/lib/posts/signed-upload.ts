import type { SupabaseClient } from '@supabase/supabase-js';
import { api, formatUploadError, posts } from '@/i18n';
import { nextGallerySortOrder } from '@/lib/posts/assets';
import { publicAssetUrl } from '@/lib/publish/assets';
import {
	extensionForMime,
	markdownForUploadedAsset,
	MAX_FILE_ATTACHMENT_BYTES,
	parseUploadKind,
	validateMagicBytesForMime,
	validateUploadMeta,
	type UploadKind,
} from '@/lib/posts/upload';

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

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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

async function fetchStorageHead(path: string): Promise<{
	size: number | null;
	head: Uint8Array | null;
}> {
	const url = publicAssetUrl(path);
	if (!url) return { size: null, head: null };

	const res = await fetch(url, { headers: { Range: 'bytes=0-15' } });
	if (!res.ok && res.status !== 206) return { size: null, head: null };

	const contentRange = res.headers.get('content-range');
	let size: number | null = null;
	if (contentRange) {
		const match = contentRange.match(/\/(\d+)\s*$/);
		if (match) size = Number(match[1]);
	}
	if (size == null) {
		const len = res.headers.get('content-length');
		if (len) size = Number(len);
	}

	const head = new Uint8Array(await res.arrayBuffer());
	return { size, head };
}

function sizeErrorForMime(mime: string, size: number): string | null {
	if (mime.startsWith('image/')) {
		return size > MAX_IMAGE_BYTES ? posts.upload.tooLarge : null;
	}
	return size > MAX_FILE_ATTACHMENT_BYTES ? posts.upload.fileTooLarge : null;
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

	const { size, head } = await fetchStorageHead(input.path);
	if (!head || !validateMagicBytesForMime(head, meta.mime)) {
		await supabase.storage.from('post-assets').remove([input.path]);
		return { ok: false, status: 400, error: posts.upload.invalidContent };
	}

	const effectiveSize = size ?? input.size;
	const sizeErr = sizeErrorForMime(meta.mime, effectiveSize);
	if (sizeErr) {
		await supabase.storage.from('post-assets').remove([input.path]);
		return { ok: false, status: 400, error: sizeErr };
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

	const { data: publicData } = supabase.storage.from('post-assets').getPublicUrl(input.path);
	const publicUrl = publicData.publicUrl;
	const markdown =
		kind === 'pdf' || kind === 'docx' || kind === 'file'
			? markdownForUploadedAsset(input.filename, publicUrl, meta.mime)
			: null;

	return {
		ok: true,
		url: publicUrl,
		markdown,
		asset: {
			id: assetRow.id,
			filename: assetRow.filename,
			mime_type: assetRow.mime_type,
			display_mode: assetRow.display_mode ?? 'link',
			sort_order: assetRow.sort_order ?? 0,
			url: publicUrl,
		},
	};
}
