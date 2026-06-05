import { parseImageRefsFromMarkdown } from '@/lib/publish/post-content';
import type { PostAssetRow } from './assets';
import { publicUrlForAsset } from './assets';

const IMAGE_MIME_PREFIX = 'image/';

export type ImageAttachmentRole = 'cover' | 'gallery' | 'unused';

export function isImageAsset(asset: PostAssetRow): boolean {
	return asset.mime_type.startsWith(IMAGE_MIME_PREFIX);
}

function urlMatchesAsset(url: string, asset: PostAssetRow, publicUrl: string | null): boolean {
	if (publicUrl && url === publicUrl) return true;
	if (url.includes(asset.storage_path.split('/').pop() ?? '')) return true;
	if (url.includes(encodeURIComponent(asset.filename))) return true;
	return url.endsWith(asset.filename);
}

/** Mapuje asset.id → rola wg kolejności obrazków w treści. */
export function imageRolesByAssetId(
	contentMd: string,
	assets: PostAssetRow[],
): Map<string, { role: ImageAttachmentRole; order: number | null }> {
	const refs = parseImageRefsFromMarkdown(contentMd);
	const roles = new Map<string, { role: ImageAttachmentRole; order: number | null }>();

	for (const asset of assets) {
		if (!isImageAsset(asset)) continue;
		roles.set(asset.id, { role: 'unused', order: null });
	}

	let imageIndex = 0;
	for (const ref of refs) {
		const asset = assets.find((a) => {
			if (!isImageAsset(a)) return false;
			return urlMatchesAsset(ref.url, a, publicUrlForAsset(a.storage_path));
		});
		if (!asset) continue;
		const role: ImageAttachmentRole = imageIndex === 0 ? 'cover' : 'gallery';
		roles.set(asset.id, { role, order: imageIndex });
		imageIndex++;
	}

	return roles;
}

export function sortImageAssetsForDisplay(
	contentMd: string,
	assets: PostAssetRow[],
): PostAssetRow[] {
	const roles = imageRolesByAssetId(contentMd, assets);
	return [...assets].sort((a, b) => {
		const ao = roles.get(a.id)?.order;
		const bo = roles.get(b.id)?.order;
		if (ao != null && bo != null) return ao - bo;
		if (ao != null) return -1;
		if (bo != null) return 1;
		return 0;
	});
}
