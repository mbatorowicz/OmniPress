import type { SupabaseClient } from '@supabase/supabase-js';
import { loadPostAssets, publicAssetUrl } from './assets';
import { applyAssetDisplayToMarkdown, type AssetForDisplay } from './asset-markdown';
import { ensurePdfViewerOnGitHub } from './github-pdf-viewer';
import {
	buildPublishedBodyMd,
	galleryUrlsFromAssets,
	prepareAstroPostFromGallery,
} from './post-gallery';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
	resolveVercelTokenForDestination,
} from './credentials';
import { buildAstroMarkdown } from './frontmatter';
import {
	getGitHubFile,
	httpStatusFromError,
	parseGitHubRepoConfig,
	putGitHubFile,
	type GitHubConfig,
} from './github-api';
import {
	formatExternalGitHubPath,
	joinContentPath,
	parseExternalGitHubPath,
	resolvePostSlug,
	slugFileCandidates,
} from './paths';
import { appendRecentChangeOnGitHub } from '@/lib/recent-changes/github';
import { buildPostRecentChangeEntry } from '@/lib/recent-changes/post-entry';
import { parseVercelConfig } from './vercel-api';
import { waitForVercelBuild } from './vercel-deploy';
import type { DestinationForPublish, PostForPublish, PublishResult } from './types';

function publishedAssetUrl(cfg: GitHubConfig, slug: string, assetName: string): string {
	if (cfg.assetPublicBase && cfg.contentLayout === 'folder') {
		return `/${cfg.assetPublicBase}/${slug}/${assetName}`;
	}
	if (cfg.contentLayout === 'folder') return `./${assetName}`;
	return `./assets/${slug}/${assetName}`;
}

async function pickMarkdownPath(
	cfg: ReturnType<typeof parseGitHubRepoConfig> & object,
	token: string,
	slug: string,
	preferredPath: string | null,
): Promise<{ filePath: string; existingSha?: string }> {
	if (preferredPath) {
		const existing = await getGitHubFile(cfg, token, preferredPath);
		return { filePath: preferredPath, existingSha: existing?.sha };
	}

	for (const fileName of slugFileCandidates(slug, cfg.contentLayout)) {
		const filePath = joinContentPath(cfg.contentPath, fileName);
		const existing = await getGitHubFile(cfg, token, filePath);
		if (!existing) return { filePath };
	}
	const fallback =
		cfg.contentLayout === 'folder'
			? joinContentPath(cfg.contentPath, `${slug}-${Date.now()}`, 'index.md')
			: joinContentPath(cfg.contentPath, `${slug}-${Date.now()}.md`);
	return { filePath: fallback };
}

async function uploadPostAssets(
	cfg: ReturnType<typeof parseGitHubRepoConfig> & object,
	token: string,
	slug: string,
	assets: Awaited<ReturnType<typeof loadPostAssets>>,
): Promise<{ map: Map<string, string>; errors: string[] }> {
	const map = new Map<string, string>();
	const errors: string[] = [];
	for (const asset of assets) {
		const sourceUrl = publicAssetUrl(asset.storage_path);
		if (!sourceUrl) {
			errors.push(`${asset.filename}: brak publicznego URL Supabase`);
			continue;
		}

		const res = await fetch(sourceUrl);
		if (!res.ok) {
			errors.push(`${asset.filename}: pobranie HTTP ${res.status}`);
			continue;
		}

		const assetName = asset.storage_path.split('/').pop() ?? asset.filename;
		const gitPath =
			cfg.contentLayout === 'folder'
				? joinContentPath(cfg.contentPath, slug, assetName)
				: joinContentPath(cfg.contentPath, 'assets', slug, assetName);
		const relative = publishedAssetUrl(cfg, slug, assetName);

		try {
			await putGitHubFile(
				cfg,
				token,
				gitPath,
				await res.arrayBuffer(),
				`OmniPress: asset ${asset.filename}`,
			);
			map.set(sourceUrl, relative);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'GitHub upload failed';
			errors.push(`${asset.filename}: ${msg.slice(0, 120)}`);
		}
	}
	return { map, errors };
}

export async function publishToGitHubAstro(
	supabase: SupabaseClient,
	post: PostForPublish,
	destination: DestinationForPublish,
	existingExternalId?: string | null,
): Promise<PublishResult> {
	if (!destination.is_active) {
		return { ok: false, summary: 'Destynacja nieaktywna', retryable: false };
	}

	const cfg = parseGitHubRepoConfig(destination.config);
	if (!cfg) {
		return { ok: false, summary: 'Brak repo (owner/name) w konfiguracji', retryable: false };
	}

	const creds = await decryptDestinationCredentials(destination);
	if (!creds || !isGitHubCredentials(destination.type, creds)) {
		return { ok: false, summary: 'Brak tokenu GitHub (ENCRYPTION_KEY?)', retryable: false };
	}

	try {
		const slug = resolvePostSlug(post);
		const preferredPath = parseExternalGitHubPath(existingExternalId ?? null);
		const { filePath, existingSha } = await pickMarkdownPath(
			cfg,
			creds.token,
			slug,
			preferredPath,
		);

		const assets = await loadPostAssets(supabase, post.id);
		const { map: urlMap, errors: uploadErrors } = await uploadPostAssets(
			cfg,
			creds.token,
			slug,
			assets,
		);
		if (uploadErrors.length > 0) {
			return {
				ok: false,
				summary: `Nie udało się wgrać załączników: ${uploadErrors.join('; ')}`.slice(0, 500),
				retryable: true,
			};
		}
		const imageAssets = assets.filter((a) => a.mime_type.startsWith('image/'));
		const pdfAssets = assets.filter((a) => a.mime_type === 'application/pdf');

		const bodyWithPdfs = buildPublishedBodyMd(post.content_md, pdfAssets, urlMap);
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
		if (hasPdfEmbed) {
			await ensurePdfViewerOnGitHub(cfg, creds.token);
		}
		const publishedBody = applyAssetDisplayToMarkdown(bodyWithPdfs, assetsForDisplay, {
			forPublish: true,
		});
		const galleryUrls = galleryUrlsFromAssets(imageAssets, urlMap);
		const prepared = prepareAstroPostFromGallery(publishedBody, galleryUrls);
		let excerpt = prepared.excerpt;
		if (!excerpt.trim() && pdfAssets.length > 0) {
			excerpt = pdfAssets[0]!.filename.replace(/\.pdf$/i, '');
		}
		const pubDate = post.scheduled_publish_at ?? post.updated_at ?? new Date().toISOString();
		const fileContent = buildAstroMarkdown(post.title, prepared.bodyMd, pubDate, cfg.contentLayout, {
			slug: post.category_slug ?? '',
			name: post.category_name ?? '',
			coverImage: prepared.coverImage ?? undefined,
			galleryImages: prepared.galleryImages.length ? prepared.galleryImages : undefined,
			excerpt: excerpt || undefined,
		});

		const { commitSha } = await putGitHubFile(
			cfg,
			creds.token,
			filePath,
			fileContent,
			`OmniPress: ${post.title}`,
			existingSha,
		);

		try {
			await appendRecentChangeOnGitHub(cfg, creds.token, destination.config, buildPostRecentChangeEntry(post, slug));
		} catch {
			// Rejestr zmian nie blokuje publikacji wpisu
		}

		const externalId = formatExternalGitHubPath(filePath);
		const githubSummary = `GitHub ${cfg.repo}@${cfg.branch} (${commitSha.slice(0, 7)})`;

		const vercelCfg = parseVercelConfig(destination.config);
		const vercelToken = resolveVercelTokenForDestination(creds);
		if (!vercelCfg) {
			return { ok: true, externalId, summary: githubSummary };
		}
		if (!vercelToken) {
			return {
				ok: true,
				externalId,
				summary: `${githubSummary} | Vercel: brak tokena (VERCEL_TOKEN lub pole w destynacji)`,
			};
		}

		const vercel = await waitForVercelBuild({
			cfg: vercelCfg,
			token: vercelToken,
			commitSha,
		});
		const summary = `${githubSummary} | ${vercel.summary}`;
		if (vercel.ok) {
			return { ok: true, externalId, summary };
		}
		return { ok: false, externalId, summary, retryable: vercel.retryable };
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'GitHub: nieznany błąd';
		const status = httpStatusFromError(msg);
		return {
			ok: false,
			summary: msg.slice(0, 500),
			retryable: status !== null ? status >= 500 || status === 429 : true,
		};
	}
}
