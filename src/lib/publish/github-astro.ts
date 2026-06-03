import type { SupabaseClient } from '@supabase/supabase-js';
import { loadPostAssets, publicAssetUrl } from './assets';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from './credentials';
import { buildAstroMarkdown } from './frontmatter';
import {
	getGitHubFile,
	httpStatusFromError,
	parseGitHubRepoConfig,
	putGitHubFile,
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
import type { DestinationForPublish, PostForPublish, PublishResult } from './types';

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

function rewriteAssetUrls(contentMd: string, replacements: Map<string, string>): string {
	let out = contentMd;
	for (const [from, to] of replacements) {
		out = out.split(from).join(to);
	}
	return out;
}

async function uploadPostAssets(
	cfg: ReturnType<typeof parseGitHubRepoConfig> & object,
	token: string,
	slug: string,
	assets: Awaited<ReturnType<typeof loadPostAssets>>,
): Promise<Map<string, string>> {
	const map = new Map<string, string>();
	for (const asset of assets) {
		const sourceUrl = publicAssetUrl(asset.storage_path);
		if (!sourceUrl) continue;

		const res = await fetch(sourceUrl);
		if (!res.ok) continue;

		const assetName = asset.storage_path.split('/').pop() ?? asset.filename;
		const gitPath =
			cfg.contentLayout === 'folder'
				? joinContentPath(cfg.contentPath, slug, assetName)
				: joinContentPath(cfg.contentPath, 'assets', slug, assetName);
		const relative =
			cfg.contentLayout === 'folder' ? `./${assetName}` : `./assets/${slug}/${assetName}`;

		await putGitHubFile(
			cfg,
			token,
			gitPath,
			await res.arrayBuffer(),
			`OmniPress: asset ${asset.filename}`,
		);
		map.set(sourceUrl, relative);
	}
	return map;
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
		const urlMap = await uploadPostAssets(cfg, creds.token, slug, assets);
		const bodyMd = rewriteAssetUrls(post.content_md, urlMap);
		const pubDate = post.updated_at ?? new Date().toISOString();
		const fileContent = buildAstroMarkdown(post.title, bodyMd, pubDate, cfg.contentLayout, {
			slug: post.category_slug ?? 'aktualnosci',
			name: post.category_name ?? 'Aktualności',
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

		return {
			ok: true,
			externalId: formatExternalGitHubPath(filePath),
			summary: `GitHub ${cfg.repo}@${cfg.branch} (${commitSha.slice(0, 7)})`,
		};
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
