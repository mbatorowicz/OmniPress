import type { GitHubConfig } from '@/lib/publish/github-api';
import { getGitHubFile, putGitHubFile } from '@/lib/publish/github-api';
import { filterCertAdvisories } from './filter';
import { fetchCertAdvisories } from './fetch';
import { buildCertAdvisoriesPayload } from './payload';
import type { CertAdvisoriesFile } from './types';
import { certAdvisoriesPath } from './types';
import type { CertAdvisoriesWidgetConfig } from '@/lib/astro-layout/types';

export async function syncCertAdvisoriesOnGitHub(
	cfg: GitHubConfig,
	token: string,
	destinationConfig: Record<string, unknown>,
	widgetConfig?: CertAdvisoriesWidgetConfig,
): Promise<
	{ ok: true; count: number; commitSha?: string } | { ok: false; error: string }
> {
	if (!widgetConfig || widgetConfig.enabled === false) {
		return { ok: true, count: 0 };
	}

	try {
		const all = await fetchCertAdvisories();
		const entries = filterCertAdvisories(all, widgetConfig);
		const path = certAdvisoriesPath(destinationConfig);
		const file: CertAdvisoriesFile = {
			updatedAt: new Date().toISOString(),
			entries,
		};

		const existing = await getGitHubFile(cfg, token, path);
		const { commitSha } = await putGitHubFile(
			cfg,
			token,
			path,
			buildCertAdvisoriesPayload(file),
			'OmniPress: komunikaty CERT Polska',
			existing?.sha,
		);

		return { ok: true, count: entries.length, commitSha };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'cert_sync_failed';
		return { ok: false, error: message };
	}
}
