import { describe, expect, it } from 'vitest';
import { adminSitePages } from '@/i18n';
import {
	decideReconcile,
	hashPublishedContent,
	isPlaceholderOrEmpty,
	isProtectedWorkflowStatus,
	shouldRefusePublish,
	type ReconcileInput,
} from './policy';

const base: ReconcileInput = {
	omniExists: true,
	omniContent: 'Treść w Omni',
	liveBlobSha: 'live-2',
	storedLiveBlobSha: 'live-1',
	publishedContentSha: hashPublishedContent('Treść w Omni'),
	currentContentSha: hashPublishedContent('Treść w Omni'),
};

describe('isPlaceholderOrEmpty', () => {
	it('uznaje pusto i placeholder', () => {
		expect(isPlaceholderOrEmpty('')).toBe(true);
		expect(isPlaceholderOrEmpty('  \n')).toBe(true);
		expect(isPlaceholderOrEmpty(adminSitePages.placeholderContent)).toBe(true);
		expect(isPlaceholderOrEmpty('Harmonogram')).toBe(false);
	});
});

describe('isProtectedWorkflowStatus', () => {
	it('chroni szkic, kolejkę i harmonogram', () => {
		expect(isProtectedWorkflowStatus('draft')).toBe(true);
		expect(isProtectedWorkflowStatus('pending')).toBe(true);
		expect(isProtectedWorkflowStatus('rejected')).toBe(true);
		expect(isProtectedWorkflowStatus('scheduled')).toBe(true);
		expect(isProtectedWorkflowStatus('published')).toBe(false);
	});
});

describe('shouldRefusePublish', () => {
	it('odmawia pustki nad bogatszym plikiem', () => {
		expect(shouldRefusePublish('', 'Pełna treść')).toBe(true);
		expect(shouldRefusePublish(adminSitePages.placeholderContent, 'Pełna treść')).toBe(true);
		expect(shouldRefusePublish('Nowa treść', 'Stara treść')).toBe(false);
		expect(shouldRefusePublish('', null)).toBe(false);
	});
});

describe('decideReconcile', () => {
	it('ciągnie brakujący rekord i placeholder', () => {
		expect(decideReconcile({ ...base, omniExists: false })).toBe('pull');
		expect(decideReconcile({ ...base, omniContent: '' })).toBe('pull');
	});

	it('zostawia chroniony workflow z treścią', () => {
		expect(decideReconcile({ ...base, workflowStatus: 'draft' })).toBe('keep');
		expect(decideReconcile({ ...base, workflowStatus: 'pending' })).toBe('keep');
	});

	it('ciągnie placeholder nawet przy statusie draft', () => {
		expect(
			decideReconcile({
				...base,
				omniContent: adminSitePages.placeholderContent,
				workflowStatus: 'draft',
			}),
		).toBe('pull');
	});

	it('oznacza identyczny blob bez pobierania treści', () => {
		expect(decideReconcile({ ...base, storedLiveBlobSha: 'live-2' })).toBe('mark');
	});

	it('zostawia lokalne poprawki (draft_ahead)', () => {
		expect(
			decideReconcile({
				...base,
				currentContentSha: hashPublishedContent('Poprawka w Omni'),
			}),
		).toBe('keep');
	});

	it('ciągnie gdy live inne i Omni nie edytował', () => {
		expect(decideReconcile(base)).toBe('pull');
	});

	it('porównuje treści gdy brak odcisku publikacji', () => {
		const withoutSnap = { ...base, publishedContentSha: null, storedLiveBlobSha: null };
		expect(
			decideReconcile({
				...withoutSnap,
				liveContentSha: hashPublishedContent('Treść w Omni'),
			}),
		).toBe('mark');
		expect(
			decideReconcile({
				...withoutSnap,
				liveContentSha: hashPublishedContent('Inna na GitHub'),
			}),
		).toBe('keep');
		expect(decideReconcile(withoutSnap)).toBe('inspect');
	});
});
