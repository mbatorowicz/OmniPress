import { auth } from './pl/auth';

/** Mapowanie surowych komunikatów Supabase Auth → polski (SSOT: auth.supabase). */
export function mapAuthError(message: string): string {
	const m = message.toLowerCase();
	const s = auth.supabase;

	if (
		m.includes('invalid login') ||
		m.includes('invalid credentials') ||
		m.includes('user not found') ||
		m.includes('invalid email or password')
	) {
		return s.invalidCredentials;
	}
	if (m.includes('email not confirmed')) {
		return s.emailNotConfirmed;
	}
	if (m.includes('redirect') || m.includes('allow list') || m.includes('uri')) {
		return s.redirectMisconfig;
	}
	if (m.includes('rate limit') || m.includes('too many')) {
		return s.rateLimit;
	}

	if (m.includes('signup') && m.includes('disabled')) {
		return s.signupDisabled;
	}

	return s.genericFailure;
}
