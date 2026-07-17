export type UploadKind = 'gallery' | 'pdf' | 'docx' | 'file';

export type UploadedAsset = {
	id: string;
	filename: string;
	mime_type: string;
	display_mode: string;
	sort_order: number;
	url: string;
};

export type UploadAssetResult =
	| { ok: true; asset: UploadedAsset; markdown: string | null }
	| { ok: false; error: string };

type UploadUrlResponse = {
	path?: string;
	signedUrl?: string;
	mime?: string;
	filename?: string;
	kind?: string;
	error?: string;
};

type UploadCompleteResponse = {
	asset?: UploadedAsset;
	markdown?: string | null;
	error?: string;
};

export async function uploadPostAsset(
	postId: string,
	file: File,
	kind: UploadKind,
	labels: { uploadFailed: string; networkError: string },
): Promise<UploadAssetResult> {
	try {
		const urlRes = await fetch(`/api/posts/${postId}/upload-url`, {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kind,
				filename: file.name,
				size: file.size,
				mimeType: file.type,
			}),
		});
		const urlData = (await urlRes.json()) as UploadUrlResponse;
		if (!urlRes.ok || !urlData.signedUrl || !urlData.path || !urlData.mime) {
			return { ok: false, error: urlData.error ?? labels.uploadFailed };
		}

		// Jak @supabase/storage-js uploadToSignedUrl dla Blob/File — multipart FormData.
		// Wymuszamy MIME z API (np. GPKG zamiast octet-stream z przeglądarki).
		const typedFile = new File([file], file.name, { type: urlData.mime });
		const body = new FormData();
		body.append('cacheControl', '3600');
		body.append('', typedFile, file.name);
		const putRes = await fetch(urlData.signedUrl, {
			method: 'PUT',
			headers: { 'x-upsert': 'false' },
			body,
		});
		if (!putRes.ok) {
			return { ok: false, error: labels.uploadFailed };
		}

		const completeRes = await fetch(`/api/posts/${postId}/upload-complete`, {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kind: urlData.kind ?? kind,
				path: urlData.path,
				filename: urlData.filename ?? file.name,
				mime: urlData.mime,
				size: file.size,
			}),
		});
		const completeData = (await completeRes.json()) as UploadCompleteResponse;
		if (!completeRes.ok || !completeData.asset) {
			return { ok: false, error: completeData.error ?? labels.uploadFailed };
		}

		return {
			ok: true,
			asset: completeData.asset,
			markdown: completeData.markdown ?? null,
		};
	} catch {
		return { ok: false, error: labels.networkError };
	}
}
