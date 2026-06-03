import { requireAuth, type AuthSession } from '@/lib/auth';

export function requireAdmin(locals: App.Locals): AuthSession | null {
	const session = requireAuth(locals);
	if (!session || session.profile.role !== 'admin') return null;
	return session;
}
