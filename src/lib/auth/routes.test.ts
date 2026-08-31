import { describe, expect, it } from 'vitest';
import {
	ADMIN_API_PREFIX,
	AUTH_API_PREFIX,
	PUBLIC_PATHS,
	isAdminApiPath,
	isProtectedPath,
	isPublicPath,
	roleHomePath,
} from './routes';

describe('isPublicPath', () => {
	it.each([...PUBLIC_PATHS])('%s jest publiczne', (path) => {
		expect(isPublicPath(path)).toBe(true);
	});

	it('obejmuje całe /api/auth/', () => {
		expect(isPublicPath(`${AUTH_API_PREFIX}sign-in`)).toBe(true);
		expect(isPublicPath(`${AUTH_API_PREFIX}mfa/verify`)).toBe(true);
	});

	it.each(['/dashboard', '/admin', '/api/admin/posts', '/', '/api/auth'])(
		'%s nie jest publiczne',
		(path) => {
			expect(isPublicPath(path)).toBe(false);
		},
	);

	it('obie trasy MFA są publiczne — inaczej pętla przekierowań admina', () => {
		expect(isPublicPath('/auth/mfa')).toBe(true);
		expect(isPublicPath('/auth/mfa/setup')).toBe(true);
	});

	it('nie łapie ścieżek tylko z prefiksem w nazwie', () => {
		expect(isPublicPath('/login-evil')).toBe(false);
		expect(isPublicPath('/api/authx/sign-in')).toBe(false);
	});
});

describe('isProtectedPath', () => {
	it.each([
		'/dashboard',
		'/dashboard/help',
		'/dashboard/posts/1',
		'/admin',
		'/admin/units/1/navigation',
	])(
		'%s wymaga sesji',
		(path) => {
			expect(isProtectedPath(path)).toBe(true);
		},
	);

	it.each(['/login', '/', '/auth/callback', '/api/admin/posts'])(
		'%s nie jest trasą HTML za logowaniem',
		(path) => {
			expect(isProtectedPath(path)).toBe(false);
		},
	);
});

describe('isAdminApiPath', () => {
	it('obejmuje /api/admin/', () => {
		expect(isAdminApiPath(`${ADMIN_API_PREFIX}posts`)).toBe(true);
	});

	it.each(['/api/auth/sign-in', '/api/worker/publish', '/admin'])('%s nie jest API admina', (path) => {
		expect(isAdminApiPath(path)).toBe(false);
	});
});

describe('roleHomePath', () => {
	it('admin trafia do panelu administracji', () => {
		expect(roleHomePath('admin')).toBe('/admin');
	});

	it('redaktor trafia do panelu treści', () => {
		expect(roleHomePath('editor')).toBe('/dashboard');
	});
});
