import type { SupabaseClient } from '@supabase/supabase-js';
import type { DestinationType } from '@/lib/types';
import { canEncryptCredentials, encryptSecret } from '@/lib/crypto';
import { resolveWpRestV2Base } from './wordpress-url';
import { normalizeGitHubRepo } from './github-repo';

export type DestinationRow = {
	id: string;
	name: string;
	type: DestinationType;
	config: Record<string, unknown>;
	is_active: boolean;
};

export type WordPressConfig = {
	wp_rest_base: string;
};

export type GitHubAstroConfig = {
	repo: string;
	branch: string;
	content_path: string;
};

export function parseDestinationType(raw: string): DestinationType | null {
	if (raw === 'wordpress' || raw === 'github_astro') return raw;
	return null;
}

export function buildConfig(type: DestinationType, form: FormData): Record<string, unknown> {
	if (type === 'wordpress') {
		const raw = String(form.get('wp_rest_base') ?? '').trim();
		const resolved = resolveWpRestV2Base(raw);
		return {
			wp_site_url: raw,
			wp_rest_base: resolved ?? '',
		};
	}
	return {
		repo: normalizeGitHubRepo(String(form.get('repo') ?? '')),
		branch: String(form.get('branch') ?? 'main').trim() || 'main',
		content_path: String(form.get('content_path') ?? 'src/content').trim() || 'src/content',
		content_layout: String(form.get('content_layout') ?? 'flat').trim() === 'folder' ? 'folder' : 'flat',
	};
}

export type DestinationConfigError = 'config_wp_rest_base' | 'config_repo';

export function validateDestinationConfig(
	type: DestinationType,
	config: Record<string, unknown>,
): DestinationConfigError | null {
	if (type === 'wordpress') {
		const raw =
			typeof config.wp_site_url === 'string' && config.wp_site_url.trim()
				? config.wp_site_url
				: String(config.wp_rest_base ?? '');
		if (!resolveWpRestV2Base(raw)) return 'config_wp_rest_base';
		return null;
	}
	const repo = normalizeGitHubRepo(String(config.repo ?? ''));
	if (!repo.includes('/')) return 'config_repo';
	return null;
}

export async function encryptCredentialsFromForm(
	type: DestinationType,
	form: FormData,
): Promise<string | null> {
	if (!canEncryptCredentials()) return null;

	if (type === 'wordpress') {
		const username = String(form.get('wp_username') ?? '').trim();
		const password = String(form.get('wp_app_password') ?? '').trim();
		if (!username || !password) return null;
		return encryptSecret(JSON.stringify({ username, application_password: password }));
	}

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
