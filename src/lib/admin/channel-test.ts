import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptSecret } from '@/lib/crypto';
import { buildConfig } from './destinations';
import {
	parseGitHubRepoConfig,
	probeGitHubContentPath,
	probeGitHubRepository,
} from '@/lib/publish/github-api';
import {
	deploymentStateLabel,
	listRecentDeployments,
	parseVercelConfig,
	probeVercelProject,
	resolveVercelToken,
} from '@/lib/publish/vercel-api';
import { auditGitHubToken, classifyGitHubToken } from './github-token';
import { adminDestinations, adminUnit } from '@/i18n/pl/admin-panels';
import type { GitHubCredentials } from '@/lib/publish/credentials';

export type ChannelTestResult = { ok: true; message: string } | { ok: false; message: string };

const ct = adminDestinations.channelTest;

function formatTokenAuditMessages(token: string): string[] {
	const lines: string[] = [];
	const kind = classifyGitHubToken(token);
	if (kind === 'classic') {
		lines.push(adminUnit.astroHelp.tokenClassicWarning);
	}
	return lines;
}

async function appendTokenAuditMessages(
	cfg: NonNullable<ReturnType<typeof parseGitHubRepoConfig>>,
	token: string,
	baseMessage: string,
): Promise<string> {
	const warnings = formatTokenAuditMessages(token);
	try {
		const audit = await auditGitHubToken(cfg, token);
		if (audit.repoAccessible) {
			warnings.push(`${adminUnit.astroHelp.tokenRepoAccess} ${audit.repoDetail}`);
		} else {
			warnings.push(`${adminUnit.astroHelp.tokenRepoDenied} ${audit.repoDetail}`);
		}
	} catch {
		// probe już zwrócił błąd wyżej
	}

	if (warnings.length === 0) return baseMessage;
	return `${baseMessage} ${warnings.join(' ')}`;
}

async function loadStoredCredentials(
	supabase: SupabaseClient,
	destinationId: string,
): Promise<GitHubCredentials | null> {
	const { data } = await supabase
		.from('destinations')
		.select('encrypted_credentials')
		.eq('id', destinationId)
		.maybeSingle();
	if (!data?.encrypted_credentials) return null;
	try {
		const plain = await decryptSecret(data.encrypted_credentials as string);
		return JSON.parse(plain) as GitHubCredentials;
	} catch {
		return null;
	}
}

async function resolveGitHubToken(
	supabase: SupabaseClient,
	form: FormData,
): Promise<string | null> {
	const token = String(form.get('github_token') ?? '').trim();
	if (token) return token;

	const destId = String(
		form.get('astro_destination_id') ?? form.get('destination_id') ?? '',
	).trim();
	if (!destId) return null;

	const stored = await loadStoredCredentials(supabase, destId);
	return stored?.token?.trim() || null;
}

async function resolveVercelTokenFromForm(
	supabase: SupabaseClient,
	form: FormData,
): Promise<string | null> {
	const token = String(form.get('vercel_token') ?? '').trim();
	if (token) return token;

	const destId = String(
		form.get('astro_destination_id') ?? form.get('destination_id') ?? '',
	).trim();
	if (destId) {
		const stored = await loadStoredCredentials(supabase, destId);
		const fromStored = resolveVercelToken(stored?.vercel_token);
		if (fromStored) return fromStored;
	}

	return resolveVercelToken(null);
}

async function probeVercelChannel(
	config: Record<string, unknown>,
	vercelToken: string,
): Promise<string> {
	const vercelCfg = parseVercelConfig(config);
	if (!vercelCfg) {
		return ct.vercelNotConfigured;
	}

	const projectProbe = await probeVercelProject(vercelCfg, vercelToken);
	if (!projectProbe.ok) {
		return ct.vercelProjectError(projectProbe.detail);
	}

	try {
		const recent = await listRecentDeployments(vercelCfg, vercelToken, 1);
		const latest = recent[0];
		if (!latest) {
			return ct.vercelNoDeploys(projectProbe.name);
		}
		const state = deploymentStateLabel(latest);
		const sha = latest.meta?.githubCommitSha?.slice(0, 7) ?? '—';
		return ct.vercelOk(projectProbe.name, state, sha);
	} catch (e) {
		const msg = e instanceof Error ? e.message : ct.unknownError;
		return ct.vercelDeployListError(msg.slice(0, 120));
	}
}

export async function testGitHubAstroChannel(
	supabase: SupabaseClient,
	form: FormData,
): Promise<ChannelTestResult> {
	const config = buildConfig('github_astro', form);
	const cfg = parseGitHubRepoConfig(config);
	if (!cfg) {
		return { ok: false, message: ct.invalidRepo };
	}

	const token = await resolveGitHubToken(supabase, form);
	if (!token) {
		return { ok: false, message: ct.noGitHubToken };
	}

	try {
		const repoProbe = await probeGitHubRepository(cfg, token);
		if (!repoProbe.ok) {
			return {
				ok: false,
				message: ct.githubRepoError(repoProbe.status, repoProbe.detail),
			};
		}

		const pathProbe = await probeGitHubContentPath(cfg, token);
		if (!pathProbe.ok) {
			return { ok: false, message: pathProbe.detail };
		}

		const githubMsg = ct.githubOk(cfg.owner, cfg.repo, cfg.branch, cfg.contentPath);
		const vercelCfg = parseVercelConfig(config);
		if (!vercelCfg) {
			return {
				ok: true,
				message: await appendTokenAuditMessages(
					cfg,
					token,
					`${githubMsg} ${ct.vercelNotConfiguredShort}`,
				),
			};
		}

		const vercelToken = await resolveVercelTokenFromForm(supabase, form);
		if (!vercelToken) {
			return {
				ok: true,
				message: await appendTokenAuditMessages(
					cfg,
					token,
					`${githubMsg} ${ct.vercelNoToken}`,
				),
			};
		}

		const vercelMsg = await probeVercelChannel(config, vercelToken);
		return {
			ok: true,
			message: await appendTokenAuditMessages(cfg, token, `${githubMsg} ${vercelMsg}`),
		};
	} catch (e) {
		const msg = e instanceof Error ? e.message : ct.unknownNetworkError;
		return { ok: false, message: ct.connectFailed(msg) };
	}
}
