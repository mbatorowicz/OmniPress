import { describe, expect, it } from 'vitest';
import { guardAdminRedirect, guardAuthJson, isGuardBlocked } from './guards';

const redirect = (path: string) => new Response(null, { status: 302, headers: { Location: path } });

describe('guardAdminRedirect', () => {
	it('redirectuje niezalogowanego na /login', () => {
		const result = guardAdminRedirect({} as App.Locals, redirect);
		expect(isGuardBlocked(result)).toBe(true);
		if (result instanceof Response) {
			expect(result.headers.get('Location')).toBe('/login');
		}
	});

	it('redirectuje redaktora na /dashboard', () => {
		const result = guardAdminRedirect(
			{
				user: { id: 'u1' },
				profile: { role: 'editor' },
				supabase: {},
			} as App.Locals,
			redirect,
		);
		expect(result instanceof Response).toBe(true);
		if (result instanceof Response) {
			expect(result.headers.get('Location')).toBe('/dashboard');
		}
	});
});

describe('guardAuthJson', () => {
	it('zwraca 401 bez sesji', async () => {
		const result = guardAuthJson({} as App.Locals);
		expect(result).toBeInstanceOf(Response);
		if (result instanceof Response) {
			expect(result.status).toBe(401);
		}
	});
});
