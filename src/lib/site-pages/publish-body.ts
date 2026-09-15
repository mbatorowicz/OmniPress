import { isFileAttachmentAsset } from '@/lib/posts/asset-model';
import { applyAssetDisplayToMarkdown, type AssetForDisplay } from '@/lib/publish/asset-markdown';
import { resolveAssetUrl, type PostAsset } from '@/lib/publish/asset-model';
import { buildPublishedBodyMd } from '@/lib/publish/post-gallery';
import { preparePublishMarkdown } from '@/lib/content/prepare-markdown';
import { buildSanitizedPageMarkdown } from './publish-guard';
import type { SitePageForPublish } from './types';

export function pageFileAssets(assets: PostAsset[]): PostAsset[] {
	return assets.filter((asset) =>
		isFileAttachmentAsset({
			id: asset.id ?? '',
			storage_path: asset.storage_path,
			filename: asset.filename,
			mime_type: asset.mime_type,
			display_mode: asset.display_mode === 'embed' ? 'embed' : 'link',
			sort_order: asset.sort_order ?? 0,
		}),
	);
}

export function buildPagePublishedMarkdown(
	page: SitePageForPublish,
	assets: PostAsset[],
	urlMap: Map<string, string>,
): { markdown: string; hasPdfEmbed: boolean } {
	const files = pageFileAssets(assets);
	const bodyWithFiles = buildPublishedBodyMd(page.content_md, files, urlMap);
	const assetsForDisplay: AssetForDisplay[] = files.flatMap((asset) => {
		if (asset.mime_type !== 'application/pdf') return [];
		const url = resolveAssetUrl(asset, urlMap);
		if (!url) return [];
		return [
			{
				filename: asset.filename,
				mime_type: asset.mime_type,
				display_mode: asset.display_mode === 'embed' ? 'embed' : 'link',
				sourceUrl: url,
				publishUrl: url,
			},
		];
	});
	const publishedBody = preparePublishMarkdown(
		applyAssetDisplayToMarkdown(bodyWithFiles, assetsForDisplay, { forPublish: true }),
	);
	return {
		markdown: buildSanitizedPageMarkdown(page, publishedBody),
		hasPdfEmbed: assetsForDisplay.some((asset) => asset.display_mode === 'embed'),
	};
}
