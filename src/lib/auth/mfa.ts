import type { SupabaseClient } from '@supabase/supabase-js';

export const MFA_SETUP_PATH = '/auth/mfa/setup';
export const MFA_CHALLENGE_PATH = '/auth/mfa';

export function isMfaPublicPath(pathname: string): boolean {
	return (
		pathname === MFA_SETUP_PATH ||
		pathname === MFA_CHALLENGE_PATH ||
		pathname.startsWith('/api/auth/mfa/')
	);
}

function verifiedTotpFactors(factors: Awaited<
	ReturnType<SupabaseClient['auth']['mfa']['listFactors']>
>['data']) {
	return (factors?.totp ?? []).filter((factor) => factor.status === 'verified');
}

/** Gdzie przekierować admina wymagającego MFA; null = OK (AAL2 lub brak wymogu). */
export async function resolveAdminMfaRedirect(
	supabase: SupabaseClient,
	pathname: string,
): Promise<string | null> {
	if (isMfaPublicPath(pathname)) return null;

	const [{ data: factors }, { data: aal }] = await Promise.all([
		supabase.auth.mfa.listFactors(),
		supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
	]);

	if (verifiedTotpFactors(factors).length === 0) {
		return MFA_SETUP_PATH;
	}

	if (aal?.currentLevel !== 'aal2' && aal?.nextLevel === 'aal2') {
		return MFA_CHALLENGE_PATH;
	}

	return null;
}

export async function getVerifiedTotpFactorId(supabase: SupabaseClient): Promise<string | null> {
	const { data: factors } = await supabase.auth.mfa.listFactors();
	const factor = verifiedTotpFactors(factors)[0];
	return factor?.id ?? null;
}
