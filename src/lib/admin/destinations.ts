import type { SupabaseClient } from '@supabase/supabase-js';
import type { DestinationType } from '@/lib/types';
import { canEncryptCredentials, encryptSecret } from '@/lib/crypto';
import { normalizeGitHubRepo } from './github-repo';
import { classifyGitHubToken } from './github-token';
import { adminSites } from '@/i18n/pl/admin-panels';
import type { GitHubCredentials } from '@/lib/publish/credentials';

export type DestinationRow = {
	id: string;
	name: string;
	type: DestinationType;
	config: Record<string, unknown>;
	is_active: boolean;
};

export type GitHubAstroConfig = {
	repo: string;
	branch: string;
	content_path: string;
};

export function parseDestinationType(raw: string): DestinationType | null {
	if (raw === 'github_astro') return raw;
	return null;
}

export function buildConfig(_type: DestinationType, form: FormData): Record<string, unknown> {
	return {
		repo: normalizeGitHubRepo(String(form.get('repo') ?? '')),
		branch: String(form.get('branch') ?? 'main').trim() || 'main',
		content_path: String(form.get('content_path') ?? 'src/content').trim() || 'src/content',
		content_layout: String(form.get('content_layout') ?? 'flat').trim() === 'folder' ? 'folder' : 'flat',
		layout_path:
			String(form.get('layout_path') ?? 'src/config/omnipress-layout.json').trim() ||
			'src/config/omnipress-layout.json',
		categories_path:
			String(form.get('categories_path') ?? 'src/config/omnipress-categories.json').trim() ||
			'src/config/omnipress-categories.json',
		navigation_path:
			String(form.get('navigation_path') ?? 'src/config/omnipress-navigation.json').trim() ||
			'src/config/omnipress-navigation.json',
		recent_changes_path:
			String(form.get('recent_changes_path') ?? 'src/config/omnipress-recent-changes.json').trim() ||
			'src/config/omnipress-recent-changes.json',
		vercel_project_id: String(form.get('vercel_project_id') ?? '').trim(),
		vercel_team_id: String(form.get('vercel_team_id') ?? '').trim(),
	};
}

export type DestinationConfigError = 'config_repo';

export function validateDestinationConfig(
	_type: DestinationType,
	config: Record<string, unknown>,
): DestinationConfigError | null {
	const repo = normalizeGitHubRepo(String(config.repo ?? ''));
	if (!repo.includes('/')) return 'config_repo';
	return null;
}

export function warnClassicGitHubPat(token: string): string | null {
	const trimmed = token.trim();
	if (!trimmed) return null;
	if (classifyGitHubToken(trimmed) === 'classic') {
		return adminSites.astroHelp.tokenClassicWarning;
	}
	return null;
}

export async function encryptCredentialsFromForm(
	_type: DestinationType,
	form: FormData,
	existing?: GitHubCredentials | null,
): Promise<string | null> {
	if (!canEncryptCredentials()) return null;

	const token = String(form.get('github_token') ?? '').trim() || existing?.token?.trim() || '';
	const vercelToken =
		String(form.get('vercel_token') ?? '').trim() || existing?.vercel_token?.trim() || '';

	if (!token) return null;

	const payload: GitHubCredentials = { token };
	if (vercelToken) payload.vercel_token = vercelToken;
	return encryptSecret(JSON.stringify(payload));
}

export async function getDestinationById(
	supabase: SupabaseClient,
	id: string,
): Promise<DestinationRow | null> {
	const { data } = await supabase
		.from('destinations')
		.select('id, name, type, config, is_active')
		.eq('id', id)
		.maybeSingle();
	return (data as DestinationRow | null) ?? null;
}
