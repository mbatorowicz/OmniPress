import type { SupabaseClient } from '@supabase/supabase-js';
import { loadPostAssets, publicAssetUrl, updateAssetContentSha, type PostAsset } from './assets';
import { applyAssetDisplayToMarkdown, type AssetForDisplay } from './asset-markdown';
import { preparePdfViewerWrites } from './github-pdf-viewer';
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
import { gitBlobShaFromBytes, gitBlobShaFromText } from './git-blob';
import {
	getGitHubFile,
	getGitHubFileBlobSha,
	httpStatusFromError,
	isGitHubRetryable,
	listGitHubDirectoryBlobs,
	parseGitHubRepoConfig,
	putGitHubFilesBatch,
	resolveGitHubWithdrawPaths,
	type GitHubBinaryFileWrite,
	type GitHubConfig,
	type GitHubFileWrite,
} from './github-api';
import {
	formatExternalGitHubPath,
	joinContentPath,
	parseExternalGitHubPath,
	postDirFromMarkdownPath,
	postSlugFromMarkdownPath,
	resolvePostSlug,
	slugFileCandidates,
} from './paths';
import { prepareRecentChangeAppendWrite } from '@/lib/recent-changes/github';
import { buildPostRecentChangeEntry } from '@/lib/recent-changes/post-entry';
import { sanitizePublishMarkdown } from '@/lib/content/sanitize';
import { parseVercelConfig } from './vercel-api';
import { waitForVercelBuild } from './vercel-deploy';
import type { DestinationForPublish, PostForPublish, PublishResult } from './types';

function publishedAssetUrl(
	cfg: GitHubConfig,
	postDir: string,
	assetName: string,
): string {
	const folderSlug = postSlugFromMarkdownPath(`${postDir}/index.md`, cfg.contentPath);
	if (cfg.assetPublicBase && cfg.contentLayout === 'folder') {
		return `/${cfg.assetPublicBase}/${folderSlug}/${assetName}`;
	}
	if (cfg.contentLayout === 'folder') return `./${assetName}`;
	return `./assets/${folderSlug}/${assetName}`;
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

type MarkdownPathPick = { filePath: string; existingSha?: string; cleanupExternalId?: string };

/** Wybiera ścieżkę index.md; przy zmianie slug (folder) przenosi publikację do nowego folderu. */
async function resolvePublishMarkdownPath(
	cfg: ReturnType<typeof parseGitHubRepoConfig> & object,
	token: string,
	slug: string,
	preferredPath: string | null,
): Promise<MarkdownPathPick> {
	if (cfg.contentLayout === 'folder') {
		const slugPath = joinContentPath(cfg.contentPath, slug, 'index.md');
		if (preferredPath) {
			const preferredDir = postDirFromMarkdownPath(preferredPath);
			const slugDir = postDirFromMarkdownPath(slugPath);
			if (preferredDir !== slugDir) {
				const existing = await getGitHubFile(cfg, token, slugPath);
				return {
					filePath: slugPath,
					existingSha: existing?.sha,
					cleanupExternalId: formatExternalGitHubPath(preferredPath),
				};
			}
		}
	}

	const picked = await pickMarkdownPath(cfg, token, slug, preferredPath);
	return picked;
}

async function resolveStaleFolderDeletes(
	cfg: ReturnType<typeof parseGitHubRepoConfig> & object,
	token: string,
	cleanupExternalId: string,
): Promise<string[]> {
	return resolveGitHubWithdrawPaths(cfg, token, [cleanupExternalId]);
}

function assetGitPath(
	cfg: GitHubConfig,
	postDir: string,
	assetName: string,
): string {
	if (cfg.contentLayout === 'folder') {
		return joinContentPath(postDir, assetName);
	}
	return joinContentPath(
		cfg.contentPath,
		'assets',
		postSlugFromMarkdownPath(`${postDir}/index.md`, cfg.contentPath),
		assetName,
	);
}

function assetDirForListing(cfg: GitHubConfig, postDir: string): string {
	if (cfg.contentLayout === 'folder') return postDir;
	return joinContentPath(
		cfg.contentPath,
		'assets',
		postSlugFromMarkdownPath(`${postDir}/index.md`, cfg.contentPath),
	);
}

type CollectedAssets = {
	writes: GitHubBinaryFileWrite[];
	map: Map<string, string>;
	errors: string[];
	deletes: string[];
	shaUpdates: { id?: string; sha: string }[];
};

/** Pobiera zmienione assety z Storage; pomija niezmienione (porównanie Git blob SHA). */
async function collectPostAssetWrites(
	supabase: SupabaseClient,
	cfg: GitHubConfig,
	token: string,
	postDir: string,
	assets: PostAsset[],
): Promise<CollectedAssets> {
	const map = new Map<string, string>();
	const errors: string[] = [];
	const writes: GitHubBinaryFileWrite[] = [];
	const shaUpdates: { id?: string; sha: string }[] = [];
	const assetDir = assetDirForListing(cfg, postDir);

	let remoteByName = new Map<string, string>();
	try {
		const remote = await listGitHubDirectoryBlobs(cfg, token, assetDir);
		remoteByName = new Map(
			remote
				.filter((b) => !b.name.toLowerCase().endsWith('.md'))
				.map((b) => [b.name, b.sha]),
		);
	} catch {
		remoteByName = new Map();
	}

	const keepNames = new Set<string>();

	await Promise.all(
		assets.map(async (asset) => {
			const sourceUrl = publicAssetUrl(asset.storage_path);
			if (!sourceUrl) {
				errors.push(`${asset.filename}: brak publicznego URL Supabase`);
				return;
			}

			const assetName = asset.storage_path.split('/').pop() ?? asset.filename;
			keepNames.add(assetName);
			const gitPath = assetGitPath(cfg, postDir, assetName);
			const relative = publishedAssetUrl(cfg, postDir, assetName);
			const remoteSha = remoteByName.get(assetName);

			if (asset.content_sha && remoteSha && asset.content_sha === remoteSha) {
				map.set(sourceUrl, relative);
				return;
			}

			try {
				const res = await fetch(sourceUrl);
				if (!res.ok) {
					errors.push(`${asset.filename}: pobranie HTTP ${res.status}`);
					return;
				}
				const content = await res.arrayBuffer();
				const sha = gitBlobShaFromBytes(content);
				shaUpdates.push({ id: asset.id, sha });
				map.set(sourceUrl, relative);
				if (remoteSha && remoteSha === sha) return;
				writes.push({ path: gitPath, content });
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'Pobranie assetu nie powiodło się';
				errors.push(`${asset.filename}: ${msg.slice(0, 120)}`);
			}
		}),
	);

	const deletes = [...remoteByName.keys()]
		.filter((name) => !keepNames.has(name))
		.map((name) =>
			cfg.contentLayout === 'folder'
				? joinContentPath(postDir, name)
				: joinContentPath(assetDir, name),
		);

	for (const update of shaUpdates) {
		await updateAssetContentSha(supabase, update.id, update.sha);
	}

	return { writes, map, errors, deletes, shaUpdates };
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
		const { filePath, cleanupExternalId } = await resolvePublishMarkdownPath(
			cfg,
			creds.token,
			slug,
			preferredPath,
		);
		const postDir = postDirFromMarkdownPath(filePath);
		const publishSlug = postSlugFromMarkdownPath(filePath, cfg.contentPath);

		let deletes: string[] = [];
		if (cleanupExternalId) {
			try {
				deletes = await resolveStaleFolderDeletes(cfg, creds.token, cleanupExternalId);
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
		} = await collectPostAssetWrites(supabase, cfg, creds.token, postDir, assets);
		if (uploadErrors.length > 0) {
			return {
				ok: false,
				summary: `Nie udało się wgrać załączników: ${uploadErrors.join('; ')}`.slice(0, 500),
				retryable: true,
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
		const pdfViewerWrites = hasPdfEmbed
			? await preparePdfViewerWrites(cfg, creds.token)
			: [];
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
		const pubDate = post.scheduled_publish_at ?? post.updated_at ?? new Date().toISOString();
		const fileContent = buildAstroMarkdown(post.title, prepared.bodyMd, pubDate, cfg.contentLayout, {
			slug: post.category_slug ?? '',
			name: post.category_name ?? '',
			coverImage: prepared.coverImage ?? undefined,
			galleryImages: prepared.galleryImages.length ? prepared.galleryImages : undefined,
			excerpt: excerpt || undefined,
		});

		const remoteMdSha = await getGitHubFileBlobSha(cfg, creds.token, filePath);
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
				ok: true,
				externalId,
				summary: `GitHub ${cfg.repo}@${cfg.branch} — bez zmian (pominięto commit)`,
			};
		}

		const batchFiles: GitHubFileWrite[] = [...assetWrites, ...pdfViewerWrites];
		if (!mdUnchanged) {
			batchFiles.push({ path: filePath, content: fileContent });
		}

		try {
			const rcWrite = await prepareRecentChangeAppendWrite(
				cfg,
				creds.token,
				destination.config,
				buildPostRecentChangeEntry(post, publishSlug),
			);
			batchFiles.push(rcWrite);
		} catch {
			// Rejestr zmian nie blokuje publikacji wpisu
		}

		const { commitSha } = await putGitHubFilesBatch(
			cfg,
			creds.token,
			batchFiles,
			`OmniPress: ${post.title}`,
			{ deletes },
		);

		const skippedAssets = assets.length - assetWrites.length;
		const skippedNote =
			skippedAssets > 0 ? `, ${skippedAssets} asset(ów) bez zmian` : '';
		const githubSummary = `GitHub ${cfg.repo}@${cfg.branch} (${commitSha.slice(0, 7)}, 1 commit${skippedNote})`;

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
		// Commit GitHub jest źródłem prawdy — błąd weryfikacji Vercel nie wywołuje ponownej publikacji.
		const summary = vercel.ok
			? `${githubSummary} | ${vercel.summary}`
			: `${githubSummary} | Vercel: ${vercel.summary}`;
		return { ok: true, externalId, summary };
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'GitHub: nieznany błąd';
		const status = httpStatusFromError(msg);
		return {
			ok: false,
			summary: msg.slice(0, 500),
			retryable: status !== null ? isGitHubRetryable(status) : true,
		};
	}
}
