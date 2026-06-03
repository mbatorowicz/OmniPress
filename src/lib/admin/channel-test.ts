import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptSecret } from '@/lib/crypto';
import { buildConfig } from './destinations';
import { resolveWpRestV2Base } from './wordpress-url';
import {
	parseGitHubRepoConfig,
	probeGitHubContentPath,
	probeGitHubRepository,
} from '@/lib/publish/github-api';

export type ChannelTestResult = { ok: true; message: string } | { ok: false; message: string };

function wpBasicAuth(username: string, password: string): string {
	const token = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
	return `Basic ${token}`;
}

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

async function resolveWpCredentials(
	supabase: SupabaseClient,
	form: FormData,
): Promise<{ username: string; application_password: string } | null> {
	const username = String(form.get('wp_username') ?? '').trim();
	const password = String(form.get('wp_app_password') ?? '').trim();
	if (username && password) return { username, application_password: password };

	const destId = String(
		form.get('wp_destination_id') ?? form.get('destination_id') ?? '',
	).trim();
	if (!destId) return null;

	const plain = await loadStoredCredentials(supabase, destId);
	if (!plain) return null;
	try {
		const parsed = JSON.parse(plain) as {
			username?: string;
			application_password?: string;
		};
		if (parsed.username && parsed.application_password) {
			return {
				username: parsed.username,
				application_password: parsed.application_password,
			};
		}
	} catch {
		return null;
	}
	return null;
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

export async function testWordPressChannel(
	supabase: SupabaseClient,
	form: FormData,
): Promise<ChannelTestResult> {
	const config = buildConfig('wordpress', form);
	const raw =
		typeof config.wp_site_url === 'string' && config.wp_site_url.trim()
			? config.wp_site_url
			: String(config.wp_rest_base ?? '');
	const v2 = resolveWpRestV2Base(raw);
	if (!v2) {
		return { ok: false, message: 'Podaj poprawny adres strony WordPress.' };
	}

	const restUrl = v2.replace(/\/$/, '');

	try {
		const probe = await fetch(`${restUrl}/posts?per_page=1`, {
			headers: { Accept: 'application/json' },
		});

		if (probe.status === 404) {
			return {
				ok: false,
				message: 'REST API nie odpowiada (404). Sprawdź adres i czy WordPress ma włączone REST API.',
			};
		}

		const creds = await resolveWpCredentials(supabase, form);
		if (!creds) {
			if (probe.ok) {
				return {
					ok: true,
					message: `REST API dostępne (${restUrl}). Dodaj login i hasło aplikacji, aby sprawdzić publikację.`,
				};
			}
			return {
				ok: false,
				message: `REST API zwróciło HTTP ${probe.status}. Uzupełnij credentials i spróbuj ponownie.`,
			};
		}

		const me = await fetch(`${restUrl}/users/me`, {
			headers: {
				Authorization: wpBasicAuth(creds.username, creds.application_password),
				Accept: 'application/json',
			},
		});

		if (!me.ok) {
			const detail = (await me.text()).slice(0, 160);
			return {
				ok: false,
				message: `Logowanie WP nie powiodło się (HTTP ${me.status}). ${detail}`,
			};
		}

		let name = creds.username;
		try {
			const json = (await me.json()) as { name?: string; slug?: string };
			name = json.name ?? json.slug ?? name;
		} catch {
			/* ignore */
		}

		return {
			ok: true,
			message: `Połączenie OK — REST API i konto „${name}” (gotowe do publikacji).`,
		};
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'nieznany błąd sieci';
		return { ok: false, message: `Nie udało się połączyć z WordPress: ${msg}` };
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
