import type { GitHubConfig, GitHubTextFileWrite } from '@/lib/publish/github-api';
import { getGitHubFile, getGitHubFileText, putGitHubFile } from '@/lib/publish/github-api';
import { filterCertAdvisories } from './filter';
import { fetchCertAdvisories } from './fetch';
import { buildCertAdvisoriesPayload } from './payload';
import type { CertAdvisoriesFile } from './types';
import { certAdvisoriesPath } from './types';
import type { CertAdvisoriesWidgetConfig } from '@/lib/astro-layout/types';

export async function prepareCertAdvisoriesFileWrite(
	destinationConfig: Record<string, unknown>,
	widgetConfig?: CertAdvisoriesWidgetConfig,
): Promise<GitHubTextFileWrite & { count: number } | null> {
	if (!widgetConfig || widgetConfig.enabled === false) return null;

	const all = await fetchCertAdvisories();
	const entries = filterCertAdvisories(all, widgetConfig);
	const path = certAdvisoriesPath(destinationConfig);
	const file: CertAdvisoriesFile = {
		updatedAt: new Date().toISOString(),
		entries,
	};

	return {
		path,
		content: buildCertAdvisoriesPayload(file),
		count: entries.length,
	};
}

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
		const prepared = await prepareCertAdvisoriesFileWrite(destinationConfig, widgetConfig);
		if (!prepared) return { ok: true, count: 0 };

		const existing = await getGitHubFile(cfg, token, prepared.path);
		const { commitSha } = await putGitHubFile(
			cfg,
			token,
			prepared.path,
			prepared.content,
			'OmniPress: komunikaty CERT Polska',
			existing?.sha,
		);

		return { ok: true, count: prepared.count, commitSha };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'cert_sync_failed';
		return { ok: false, error: message };
	}
}
