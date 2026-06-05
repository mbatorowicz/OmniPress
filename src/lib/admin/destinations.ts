import type { SupabaseClient } from '@supabase/supabase-js';
import type { DestinationType } from '@/lib/types';
import { canEncryptCredentials, encryptSecret } from '@/lib/crypto';
import { normalizeGitHubRepo } from './github-repo';

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
		categories_path:
			String(form.get('categories_path') ?? 'src/config/omnipress-categories.json').trim() ||
			'src/config/omnipress-categories.json',
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

export async function encryptCredentialsFromForm(
	_type: DestinationType,
	form: FormData,
): Promise<string | null> {
	if (!canEncryptCredentials()) return null;

	const token = String(form.get('github_token') ?? '').trim();
	if (!token) return null;
	return encryptSecret(JSON.stringify({ token }));
}

export async function listDestinations(supabase: SupabaseClient): Promise<DestinationRow[]> {
	const { data } = await supabase
		.from('destinations')
		.select('id, name, type, config, is_active')
		.order('name');
	return (data ?? []) as DestinationRow[];
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
