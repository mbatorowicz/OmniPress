import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptSecret } from '@/lib/crypto';
import { buildConfig } from './destinations';
import {
	parseGitHubRepoConfig,
	probeGitHubContentPath,
	probeGitHubRepository,
} from '@/lib/publish/github-api';

export type ChannelTestResult = { ok: true; message: string } | { ok: false; message: string };

async function loadStoredCredentials(
	supabase: SupabaseClient,
	destinationId: string,
): Promise<string | null> {
	const { data } = await supabase
		.from('destinations')
		.select('encrypted_credentials')
		.eq('id', destinationId)
		.maybeSingle();
	if (!data?.encrypted_credentials) return null;
	try {
		return await decryptSecret(data.encrypted_credentials as string);
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

	const plain = await loadStoredCredentials(supabase, destId);
	if (!plain) return null;
	try {
		const parsed = JSON.parse(plain) as { token?: string };
		return typeof parsed.token === 'string' && parsed.token.trim() ? parsed.token.trim() : null;
	} catch {
		return null;
	}
}

export async function testGitHubAstroChannel(
	supabase: SupabaseClient,
	form: FormData,
): Promise<ChannelTestResult> {
	const config = buildConfig('github_astro', form);
	const cfg = parseGitHubRepoConfig(config);
	if (!cfg) {
		return { ok: false, message: 'Podaj repozytorium w formacie owner/nazwa.' };
	}

	const token = await resolveGitHubToken(supabase, form);
	if (!token) {
		return {
			ok: false,
			message: 'Brak tokena GitHub — wpisz PAT lub zapisz destynację z zapisanym tokenem.',
		};
	}

	try {
		const repoProbe = await probeGitHubRepository(cfg, token);
		if (!repoProbe.ok) {
			return {
				ok: false,
				message: `GitHub repo: HTTP ${repoProbe.status}. ${repoProbe.detail}`,
			};
		}

		const pathProbe = await probeGitHubContentPath(cfg, token);
		if (!pathProbe.ok) {
			return { ok: false, message: pathProbe.detail };
		}

		return {
			ok: true,
			message: `Połączenie OK — ${cfg.owner}/${cfg.repo} (${cfg.branch}), folder „${cfg.contentPath}” istnieje.`,
		};
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'nieznany błąd sieci';
		return { ok: false, message: `Nie udało się połączyć z GitHub: ${msg}` };
	}
}
