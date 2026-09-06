import type { SupabaseClient } from '@supabase/supabase-js';
import { loadPostAssets } from './assets';
import { publicAssetUrl } from './asset-model';
import { applyAssetDisplayToMarkdown, type AssetForDisplay } from './asset-markdown';
import { preparePdfViewerWrites } from './github-pdf-viewer';
import {
	buildPublishedBodyMd,
	galleryUrlsFromAssets,
	prepareAstroPostFromGallery,
} from './post-gallery';
import { allPostCategorySlugs } from '@/lib/posts/category-model';
import { buildAstroMarkdown } from './frontmatter';
import { gitBlobShaFromText } from './git-blob';
import {
	getGitHubFileBlobSha,
	type GitHubBinaryFileWrite,
	type GitHubConfig,
	type GitHubFileWrite,
} from './github-api';
import {
	formatExternalGitHubPath,
	parseExternalGitHubPath,
	postDirFromMarkdownPath,
	postSlugFromMarkdownPath,
	resolvePostSlug,
} from './paths';
import { sanitizePublishMarkdown } from '@/lib/content/sanitize';
import type { PostForPublish, PublishResult } from './types';
import { collectPostAssetWrites } from './github-astro-assets';
import { resolvePublishMarkdownPath, resolveStaleFolderDeletes } from './github-astro-paths';
import { loadFirstPublishedAt, resolvePublishDate } from './publish-date';

export type PreparedGitHubAstroPublish =
	| { status: 'done'; result: PublishResult }
	| {
			status: 'ready';
			filePath: string;
			fileContent: string;
			mdUnchanged: boolean;
			assetWrites: GitHubBinaryFileWrite[];
			pdfViewerWrites: GitHubFileWrite[];
			deletes: string[];
			assetsCount: number;
			publishSlug: string;
			externalId: string;
	  };

export async function prepareGitHubAstroPublish(
	supabase: SupabaseClient,
	post: PostForPublish,
	existingExternalId: string | null | undefined,
	cfg: GitHubConfig,
	token: string,
): Promise<PreparedGitHubAstroPublish> {
	const slug = resolvePostSlug(post);
	const preferredPath = parseExternalGitHubPath(existingExternalId ?? null);
	const { filePath, cleanupExternalId } = await resolvePublishMarkdownPath(
		cfg,
		token,
		slug,
		preferredPath,
	);
	const postDir = postDirFromMarkdownPath(filePath);
	const publishSlug = postSlugFromMarkdownPath(filePath, cfg.contentPath);

	let deletes: string[] = [];
	if (cleanupExternalId) {
		try {
			deletes = await resolveStaleFolderDeletes(cfg, token, cleanupExternalId);
		} catch {
			// Sprzątanie nie blokuje publikacji — nowy folder i tak powstaje
		}
	}

	const assets = await loadPostAssets(supabase, post.id);
	const {
		writes: assetWrites,
		map: urlMap,
		errors: uploadErrors,
		deletes: orphanDeletes,
	} = await collectPostAssetWrites(supabase, cfg, token, postDir, assets);
	if (uploadErrors.length > 0) {
		return {
			status: 'done',
			result: {
				ok: false,
				summary: `Nie udało się wgrać załączników: ${uploadErrors.join('; ')}`.slice(0, 500),
				retryable: true,
			},
		};
	}
	deletes = [...new Set([...deletes, ...orphanDeletes])];

	const imageAssets = assets.filter((a) => a.mime_type.startsWith('image/'));
	const pdfAssets = assets.filter((a) => a.mime_type === 'application/pdf');
	const fileAssets = assets.filter(
		(a) =>
			a.mime_type === 'application/pdf' ||
			a.mime_type ===
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
			a.mime_type === 'application/geopackage+sqlite3',
	);

	const bodyWithFiles = buildPublishedBodyMd(post.content_md, fileAssets, urlMap);
	const assetsForDisplay: AssetForDisplay[] = pdfAssets.flatMap((asset) => {
		const sourceUrl = publicAssetUrl(asset.storage_path);
		if (!sourceUrl) return [];
		return [
			{
				filename: asset.filename,
				mime_type: asset.mime_type,
				display_mode: asset.display_mode === 'embed' ? 'embed' : 'link',
				sourceUrl,
				publishUrl: urlMap.get(sourceUrl) ?? sourceUrl,
			},
		];
	});
	const hasPdfEmbed = assetsForDisplay.some((a) => a.display_mode === 'embed');
	const pdfViewerWrites = hasPdfEmbed ? await preparePdfViewerWrites(cfg, token) : [];
	const publishedBody = sanitizePublishMarkdown(
		applyAssetDisplayToMarkdown(bodyWithFiles, assetsForDisplay, {
			forPublish: true,
		}),
	);
	const galleryUrls = galleryUrlsFromAssets(imageAssets, urlMap);
	const prepared = prepareAstroPostFromGallery(publishedBody, galleryUrls);
	let excerpt = prepared.excerpt;
	if (!excerpt.trim() && fileAssets.length > 0) {
		excerpt = fileAssets[0]!.filename.replace(/\.(pdf|docx|gpkg|xlsx|zip)$/i, '');
	}
	const pubDate = resolvePublishDate({
		scheduledPublishAt: post.scheduled_publish_at,
		firstPublishedAt: await loadFirstPublishedAt(supabase, post.id),
	});
	const categorySlugs = allPostCategorySlugs(
		post.category_slug ?? '',
		post.extra_category_slugs ?? [],
	);
	const fileContent = buildAstroMarkdown(post.title, prepared.bodyMd, pubDate, cfg.contentLayout, {
		slug: post.category_slug ?? '',
		name: post.category_name ?? '',
		categories: categorySlugs.length > 1 ? categorySlugs : undefined,
		coverImage: prepared.coverImage ?? undefined,
		galleryImages: prepared.galleryImages.length ? prepared.galleryImages : undefined,
		excerpt: excerpt || undefined,
		pinned: post.pinned ? true : undefined,
	});

	const remoteMdSha = await getGitHubFileBlobSha(cfg, token, filePath);
	const localMdSha = gitBlobShaFromText(fileContent);
	const mdUnchanged = Boolean(remoteMdSha && remoteMdSha === localMdSha);
	const externalId = formatExternalGitHubPath(filePath);

	const hasPayloadChanges =
		!mdUnchanged ||
		assetWrites.length > 0 ||
		pdfViewerWrites.length > 0 ||
		deletes.length > 0;

	if (!hasPayloadChanges) {
		return {
			status: 'done',
			result: {
				ok: true,
				externalId,
				summary: `GitHub ${cfg.repo}@${cfg.branch} — bez zmian (pominięto commit)`,
			},
		};
	}

	return {
		status: 'ready',
		filePath,
		fileContent,
		mdUnchanged,
		assetWrites,
		pdfViewerWrites,
		deletes,
		assetsCount: assets.length,
		publishSlug,
		externalId,
	};
}
