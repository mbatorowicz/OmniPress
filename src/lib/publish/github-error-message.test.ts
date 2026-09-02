import { describe, expect, it } from 'vitest';
import { explainGitHubError } from './github-error-message';

describe('explainGitHubError', () => {
	it('401 tłumaczy na wskazówkę o wymianie tokenu', () => {
		const msg = explainGitHubError('GitHub GET 401: {"message":"Bad credentials"}');
		expect(msg).toContain('wygasł');
		expect(msg).toContain('Kanał publikacji');
		expect(msg).toContain('Bad credentials');
	});

	it('403 wskazuje uprawnienia lub limit zapytań', () => {
		expect(explainGitHubError('GitHub ref GET 403: rate limit')).toContain('403');
	});

	it('inne statusy zostawia bez zmian', () => {
		const raw = 'GitHub PUT 409: {"message":"is at abc but expected def"}';
		expect(explainGitHubError(raw)).toBe(raw);
	});

	it('komunikat bez statusu zostaje bez zmian', () => {
		expect(explainGitHubError('ECONNRESET')).toBe('ECONNRESET');
	});
});
