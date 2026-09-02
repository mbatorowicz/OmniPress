/** Audyt tokenu GitHub dopisywany do wyniku testu kanału publikacji. */
import type { parseGitHubRepoConfig } from '@/lib/publish/github-api';
import { auditGitHubToken, classifyGitHubToken, formatTokenExpiry } from './github-token';
import { adminDestinations, adminUnit } from '@/i18n/pl/admin-panels';

const ct = adminDestinations.channelTest;

type GitHubRepoConfig = NonNullable<ReturnType<typeof parseGitHubRepoConfig>>;

export async function appendTokenAuditMessages(
	cfg: GitHubRepoConfig,
	token: string,
	baseMessage: string,
): Promise<string> {
	const warnings: string[] = [];
	if (classifyGitHubToken(token) === 'classic') {
		warnings.push(adminUnit.astroHelp.tokenClassicWarning);
	}

	try {
		const audit = await auditGitHubToken(cfg, token);
		if (audit.repoAccessible) {
			warnings.push(`${adminUnit.astroHelp.tokenRepoAccess} ${audit.repoDetail}`);
			warnings.push(
				audit.expiresAt ? ct.tokenExpiresAt(formatTokenExpiry(audit.expiresAt)) : ct.tokenNoExpiry,
			);
		} else {
			warnings.push(`${adminUnit.astroHelp.tokenRepoDenied} ${audit.repoDetail}`);
		}
	} catch {
		// probe już zwrócił błąd wyżej
	}

	if (warnings.length === 0) return baseMessage;
	return `${baseMessage} ${warnings.join(' ')}`;
}
