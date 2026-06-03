import { describe, expect, it } from 'vitest';
import { auth } from './pl/auth';
import { mapAuthError } from './map-auth-error';

describe('mapAuthError', () => {
	it('mapuje invalid credentials', () => {
		expect(mapAuthError('Invalid login credentials')).toBe(auth.supabase.invalidCredentials);
	});
});
