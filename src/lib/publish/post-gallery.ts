import { markdownForUploadedAsset } from '@/lib/posts/upload';
import { assetUrlKeys, resolveAssetUrl } from '@/lib/publish/asset-model';
import type { PostAsset } from '@/lib/publish/asset-model';
import {
	markdownToPlainExcerpt,
	stripImageMarkdown,
	type PreparedAstroPost,
} from './post-content';

/** Tekst wpisu + linki do załączników plikowych (PDF, DOCX). Zdjęcia tylko w galerii. */
export function buildPublishedBodyMd(
	contentMd: string,
	fileAssets: PostAsset[],
	urlMap: Map<string, string>,
): string {
	let body = stripImageMarkdown(contentMd).trim();
	for (const asset of fileAssets) {
		const url = resolveAssetUrl(asset, urlMap);
		if (!url) continue;
		body += `\n\n${markdownForUploadedAsset(asset.filename, url, asset.mime_type)}\n`;
	}
	return body.trim();
}

/** cover + galeria ze zdjęć (pierwsze = zajawka). */
export function prepareAstroPostFromGallery(
	contentMd: string,
	galleryUrls: string[],
): PreparedAstroPost {
	const bodyMd = stripImageMarkdown(contentMd);
	return {
		bodyMd,
		coverImage: galleryUrls[0] ?? null,
		galleryImages: galleryUrls.slice(1),
		excerpt: markdownToPlainExcerpt(bodyMd),
	};
}

export function galleryUrlsFromAssets(
	imageAssets: PostAsset[],
	urlMap: Map<string, string>,
): string[] {
	// Galeria na stronie musi wskazywać plik w repo Astro — adres panelu nie wystarczy.
	return imageAssets.flatMap((asset) => {
		for (const key of assetUrlKeys(asset)) {
			const published = urlMap.get(key);
			if (published) return [published];
		}
		return [];
	});
}
