import { describe, expect, it } from 'vitest';
import { isMfaPublicPath, MFA_CHALLENGE_PATH, MFA_SETUP_PATH } from './mfa';

describe('isMfaPublicPath', () => {
	it('rozpoznaje trasy MFA', () => {
		expect(isMfaPublicPath(MFA_SETUP_PATH)).toBe(true);
		expect(isMfaPublicPath(MFA_CHALLENGE_PATH)).toBe(true);
		expect(isMfaPublicPath('/api/auth/mfa/verify')).toBe(true);
		expect(isMfaPublicPath('/admin')).toBe(false);
	});
});
