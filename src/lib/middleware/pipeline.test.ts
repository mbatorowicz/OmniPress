import type { APIContext, MiddlewareNext } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/i18n';
import type { Profile, UserRole } from '@/lib/types';

const mocks = vi.hoisted(() => ({
	configured: true,
	client: null as unknown as SupabaseClient,
}));

vi.mock('@/lib/supabase/env', () => ({ isSupabaseConfigured: () => mocks.configured }));
vi.mock('@/lib/supabase/resolve-env', () => ({
	resolveSupabaseUrl: () => 'https://projekt.supabase.co',
}));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: () => mocks.client }));

const { runMiddlewarePipeline } = await import('./pipeline');

type Factor = { status: 'verified' | 'unverified' };
type Aal = { currentLevel: string | null; nextLevel: string | null };

type SessionOptions = {
	role?: UserRole;
	totp?: Factor[];
	aal?: Aal;
};

const AAL2: Aal = { currentLevel: 'aal2', nextLevel: 'aal2' };
const AAL1_PENDING: Aal = { currentLevel: 'aal1', nextLevel: 'aal2' };

function profileOf(role: UserRole): Profile {
	return {
		id: 'u1',
		role,
		display_name: null,
		default_site_id: null,
		created_at: '',
		updated_at: '',
	};
}

function fakeClient(options: SessionOptions | null): SupabaseClient {
	const user = options ? { id: 'u1' } : null;
	return {
		auth: {
			getUser: async () => ({
				data: { user },
				error: user ? null : { message: 'no session' },
			}),
			mfa: {
				listFactors: async () => ({ data: { totp: options?.totp ?? [] } }),
				getAuthenticatorAssuranceLevel: async () => ({ data: options?.aal ?? AAL2 }),
			},
		},
		from: () => ({
			select: () => ({
				eq: () => ({
					maybeSingle: async () => ({
						data: options ? profileOf(options.role ?? 'editor') : null,
						error: null,
					}),
				}),
			}),
		}),
	} as unknown as SupabaseClient;
}

async function run(pathname: string, session: SessionOptions | null = null) {
	mocks.client = fakeClient(session);
	const url = new URL(`https://panel.test${pathname}`);
	const locals = {} as App.Locals;
	const next = vi.fn(async () => new Response('<html></html>', { status: 200 }));
	const context = {
		url,
		locals,
		cookies: {},
		request: new Request(url),
		redirect: (to: string, status = 302) =>
			new Response(null, { status, headers: { Location: to } }),
	} as unknown as APIContext;

	const response = (await runMiddlewarePipeline(
		context,
		next as unknown as MiddlewareNext,
	)) as Response;
	return { response, locals, next, target: response.headers.get('Location') };
}

beforeEach(() => {
	mocks.configured = true;
});

describe('nagłówki bezpieczeństwa i nonce', () => {
	it('nonce trafia do locals i do polityki CSP', async () => {
		const { response, locals } = await run('/dashboard', { role: 'editor' });
		expect(locals.cspNonce).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
		expect(response.headers.get('Content-Security-Policy')).toContain(
			`'nonce-${locals.cspNonce}'`,
		);
	});

	it('CSP dopuszcza połączenia do Supabase', async () => {
		const { response } = await run('/dashboard', { role: 'editor' });
		expect(response.headers.get('Content-Security-Policy')).toContain(
			'https://projekt.supabase.co',
		);
	});

	it('nagłówki są też na odpowiedziach przekierowujących', async () => {
		const { response } = await run('/dashboard');
		expect(response.status).toBe(302);
		expect(response.headers.get('X-Frame-Options')).toBe('DENY');
	});

	it('nagłówki są na odpowiedziach JSON API', async () => {
		const { response } = await run('/api/admin/posts');
		expect(response.status).toBe(401);
		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
	});
});

describe('brak konfiguracji Supabase', () => {
	beforeEach(() => {
		mocks.configured = false;
	});

	it('przepuszcza stronę startową', async () => {
		const { next } = await run('/');
		expect(next).toHaveBeenCalledOnce();
	});

	it('przepuszcza trasy publiczne', async () => {
		const { next } = await run('/login');
		expect(next).toHaveBeenCalledOnce();
	});

	it('kieruje panel na ekran konfiguracji', async () => {
		const { target, next } = await run('/admin');
		expect(target).toBe('/?setup=1');
		expect(next).not.toHaveBeenCalled();
	});

	it('nie tworzy klienta Supabase (brak URL i klucza)', async () => {
		const { locals } = await run('/admin');
		expect(locals.supabase).toBeUndefined();
	});
});

describe('PKCE ?code=', () => {
	it('kod z /login idzie do /auth/callback', async () => {
		const { target } = await run('/login?code=abc');
		expect(target).toBe('/auth/callback?code=abc');
	});

	it('reset hasła idzie do /auth/reset-password', async () => {
		const { target } = await run('/login?mode=reset&code=abc');
		expect(target).toBe('/auth/reset-password?code=abc');
	});

	it('rozstrzyga się przed sprawdzeniem sesji', async () => {
		const { target, next } = await run('/?code=abc');
		expect(target).toBe('/auth/callback?code=abc');
		expect(next).not.toHaveBeenCalled();
	});
});

describe('trasy HTML bez sesji', () => {
	it.each(['/dashboard', '/dashboard/posts/1', '/admin', '/admin/sites'])(
		'%s przekierowuje na logowanie',
		async (path) => {
			const { target } = await run(path);
			expect(target).toBe('/login');
		},
	);

	it('strona startowa przekierowuje na logowanie', async () => {
		expect((await run('/')).target).toBe('/login');
	});

	it('ekran ustawiania hasła jest dostępny bez sesji', async () => {
		const { next, response } = await run('/auth/reset-password');
		expect(next).toHaveBeenCalledOnce();
		expect(response.status).toBe(200);
	});

	it('ekran logowania nie przekierowuje', async () => {
		const { next } = await run('/login');
		expect(next).toHaveBeenCalledOnce();
	});
});

describe('trasy HTML z sesją', () => {
	it('redaktor ze strony startowej trafia do panelu treści', async () => {
		expect((await run('/', { role: 'editor' })).target).toBe('/dashboard');
	});

	it('admin ze strony startowej trafia do administracji', async () => {
		expect((await run('/', { role: 'admin' })).target).toBe('/admin');
	});

	it('zalogowany na /login wraca do swojego panelu', async () => {
		expect((await run('/login', { role: 'editor' })).target).toBe('/dashboard');
	});

	it('redaktor nie wchodzi do /admin', async () => {
		const { target, next } = await run('/admin/sites', { role: 'editor' });
		expect(target).toBe('/dashboard');
		expect(next).not.toHaveBeenCalled();
	});

	it('admin wchodzi do /admin', async () => {
		const { next } = await run('/admin/sites', {
			role: 'admin',
			totp: [{ status: 'verified' }],
			aal: AAL2,
		});
		expect(next).toHaveBeenCalledOnce();
	});
});

describe('MFA administratora', () => {
	it('admin bez czynnika TOTP idzie do konfiguracji MFA', async () => {
		expect((await run('/admin', { role: 'admin', totp: [] })).target).toBe('/auth/mfa/setup');
	});

	it('niezweryfikowany czynnik nie liczy się jako MFA', async () => {
		const { target } = await run('/admin', { role: 'admin', totp: [{ status: 'unverified' }] });
		expect(target).toBe('/auth/mfa/setup');
	});

	it('admin z czynnikiem, ale bez AAL2 idzie na challenge', async () => {
		const { target } = await run('/admin', {
			role: 'admin',
			totp: [{ status: 'verified' }],
			aal: AAL1_PENDING,
		});
		expect(target).toBe('/auth/mfa');
	});

	it('nie zapętla się na własnej trasie MFA', async () => {
		const { next } = await run('/auth/mfa/setup', { role: 'admin', totp: [] });
		expect(next).toHaveBeenCalledOnce();
	});

	it('logowanie admina bez MFA kieruje na konfigurację zamiast do /admin', async () => {
		const { target } = await run('/login', { role: 'admin', totp: [] });
		expect(target).toBe('/auth/mfa/setup');
	});

	it('redaktora nie dotyczy wymóg MFA', async () => {
		const { next } = await run('/dashboard', { role: 'editor', totp: [], aal: AAL1_PENDING });
		expect(next).toHaveBeenCalledOnce();
	});
});

describe('API administratora', () => {
	it('bez sesji zwraca 401 JSON', async () => {
		const { response } = await run('/api/admin/posts');
		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({
			ok: false,
			error: api.posts.unauthorized,
		});
	});

	it('redaktor dostaje 403', async () => {
		const { response, next } = await run('/api/admin/posts', { role: 'editor' });
		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toEqual({ ok: false, error: api.admin.forbidden });
		expect(next).not.toHaveBeenCalled();
	});

	it('admin bez MFA dostaje 403 zamiast przekierowania HTML', async () => {
		const { response } = await run('/api/admin/posts', { role: 'admin', totp: [] });
		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toEqual({ ok: false, error: api.admin.mfaRequired });
	});

	it('admin z AAL2 przechodzi do handlera', async () => {
		const { next } = await run('/api/admin/posts', {
			role: 'admin',
			totp: [{ status: 'verified' }],
			aal: AAL2,
		});
		expect(next).toHaveBeenCalledOnce();
	});

	it('API auth nie podlega guardowi admina', async () => {
		const { next } = await run('/api/auth/sign-out', { role: 'editor' });
		expect(next).toHaveBeenCalledOnce();
	});
});

describe('locals', () => {
	it('udostępnia klienta, użytkownika i profil kolejnym warstwom', async () => {
		const { locals } = await run('/dashboard', { role: 'editor' });
		expect(locals.supabase).toBe(mocks.client);
		expect(locals.user?.id).toBe('u1');
		expect(locals.profile?.role).toBe('editor');
	});

	it('bez sesji zostawia user i profile puste', async () => {
		const { locals } = await run('/login');
		expect(locals.user).toBeNull();
		expect(locals.profile).toBeNull();
	});
});
