import { describe, expect, it } from 'vitest';
import { classifyGitHubToken } from './github-token';

describe('classifyGitHubToken', () => {
	it('rozpoznaje fine-grained PAT', () => {
		expect(classifyGitHubToken('github_pat_11AAAA')).toBe('fine_grained');
	});

	it('rozpoznaje classic PAT', () => {
		expect(classifyGitHubToken('ghp_abc123')).toBe('classic');
	});

	it('zwraca unknown dla pustego', () => {
		expect(classifyGitHubToken('')).toBe('unknown');
	});
});
