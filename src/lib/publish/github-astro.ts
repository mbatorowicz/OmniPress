import type { SupabaseClient } from '@supabase/supabase-js';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
	resolveVercelTokenForDestination,
} from './credentials';
import {
	httpStatusFromError,
	isGitHubRetryable,
	parseGitHubRepoConfig,
	putGitHubFilesBatch,
	type GitHubFileWrite,
} from './github-api';
import { explainGitHubError } from './github-error-message';
import { prepareRecentChangeAppendWrite } from '@/lib/recent-changes/github';
import { buildPostRecentChangeEntry } from '@/lib/recent-changes/post-entry';
import { parseVercelConfig } from './vercel-api';
import { waitForVercelBuild } from './vercel-deploy';
import type { DestinationForPublish, PostForPublish, PublishResult } from './types';
import { prepareGitHubAstroPublish } from './github-astro-prepare';

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
		const prepared = await prepareGitHubAstroPublish(
			supabase,
			post,
			existingExternalId,
			cfg,
			creds.token,
		);
		if (prepared.status === 'done') return prepared.result;

		const batchFiles: GitHubFileWrite[] = [...prepared.assetWrites, ...prepared.pdfViewerWrites];
		if (!prepared.mdUnchanged) {
			batchFiles.push({ path: prepared.filePath, content: prepared.fileContent });
		}

		try {
			const rcWrite = await prepareRecentChangeAppendWrite(
				cfg,
				creds.token,
				destination.config,
				buildPostRecentChangeEntry(post, prepared.publishSlug),
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
			{ deletes: prepared.deletes },
		);

		const skippedAssets = prepared.assetsCount - prepared.assetWrites.length;
		const skippedNote =
			skippedAssets > 0 ? `, ${skippedAssets} asset(ów) bez zmian` : '';
		const githubSummary = `GitHub ${cfg.repo}@${cfg.branch} (${commitSha.slice(0, 7)}, 1 commit${skippedNote})`;

		const vercelCfg = parseVercelConfig(destination.config);
		const vercelToken = resolveVercelTokenForDestination(creds);
		if (!vercelCfg) {
			return { ok: true, externalId: prepared.externalId, summary: githubSummary };
		}
		if (!vercelToken) {
			return {
				ok: true,
				externalId: prepared.externalId,
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
		return { ok: true, externalId: prepared.externalId, summary };
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'GitHub: nieznany błąd';
		const status = httpStatusFromError(msg);
		return {
			ok: false,
			summary: explainGitHubError(msg).slice(0, 500),
			retryable: status !== null ? isGitHubRetryable(status) : true,
		};
	}
}
