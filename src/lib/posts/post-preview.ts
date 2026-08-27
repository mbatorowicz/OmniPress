/**
 * Render podglądu wpisu w panelu — ta sama treść, którą zobaczy strona po publikacji.
 * Wspólne dla podglądu redaktora (`/dashboard/posts/[id]`) i akceptacji admina
 * (`/admin/posts/[id]`).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildPublishedBodyMd } from '@/lib/publish/post-gallery';
import type { PostAsset } from '@/lib/publish/asset-model';
import {
	assetsForPreviewRender,
	isFileAttachmentAsset,
	isGalleryImageAsset,
	isPdfAsset,
	publicUrlForAsset,
	type PostAssetRow,
} from '@/lib/posts/asset-model';
import { loadPostAssetsForPost } from '@/lib/posts/assets';
import { renderPostContentHtml } from '@/lib/posts/render-content';

export type PostPreview = {
	postAssets: PostAssetRow[];
	galleryAssets: PostAssetRow[];
	contentHtml: string;
};

export async function loadPostPreview(
	supabase: SupabaseClient,
	postId: string,
	contentMd: string,
): Promise<PostPreview> {
	const postAssets = await loadPostAssetsForPost(supabase, postId);
	const fileAssets = postAssets.filter(isFileAttachmentAsset);
	const pdfAssets = postAssets.filter(isPdfAsset);

	// Podgląd pokazuje pliki spod tych samych adresów, pod którymi wyjdą na stronę.
	const fileUrlMap = new Map(
		fileAssets.flatMap((a) => {
			const url = publicUrlForAsset(a.storage_path);
			return url ? ([[url, url]] as const) : [];
		}),
	);

	const previewMd = buildPublishedBodyMd(contentMd, fileAssets as PostAsset[], fileUrlMap);

	return {
		postAssets,
		galleryAssets: postAssets.filter(isGalleryImageAsset),
		contentHtml: renderPostContentHtml(previewMd, assetsForPreviewRender(postId, pdfAssets)),
	};
}
