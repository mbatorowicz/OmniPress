import type { SupabaseClient } from '@supabase/supabase-js';
import { updateAssetContentSha } from './assets';
import { publicAssetUrl, type PostAsset } from './asset-model';
import { gitBlobShaFromBytes } from './git-blob';
import {
	listGitHubDirectoryBlobs,
	type GitHubBinaryFileWrite,
	type GitHubConfig,
} from './github-api';
import { joinContentPath, postSlugFromMarkdownPath } from './paths';
import { publishedAssetUrl } from './github-astro-paths';

export function assetGitPath(
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

export function assetDirForListing(cfg: GitHubConfig, postDir: string): string {
	if (cfg.contentLayout === 'folder') return postDir;
	return joinContentPath(
		cfg.contentPath,
		'assets',
		postSlugFromMarkdownPath(`${postDir}/index.md`, cfg.contentPath),
	);
}

export type CollectedAssets = {
	writes: GitHubBinaryFileWrite[];
	map: Map<string, string>;
	errors: string[];
	deletes: string[];
	shaUpdates: { id?: string; sha: string }[];
};

/** Pobiera zmienione assety z Storage; pomija niezmienione (porównanie Git blob SHA). */
export async function collectPostAssetWrites(
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
