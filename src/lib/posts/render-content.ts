import { applyAssetDisplayToMarkdown, segmentContentForRender, type AssetForDisplay } from '@/lib/publish/asset-markdown';
import { markdownToSafeHtml } from '@/lib/publish/markdown';

export function renderPostContentHtml(contentMd: string, assets: AssetForDisplay[]): string {
	const prepared = applyAssetDisplayToMarkdown(contentMd, assets);
	return segmentContentForRender(prepared)
		.map((segment) => (segment.type === 'embed' ? segment.value : markdownToSafeHtml(segment.value)))
		.join('');
}
