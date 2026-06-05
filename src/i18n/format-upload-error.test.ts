import { describe, expect, it } from 'vitest';
import { formatUploadError } from './pl/api';

describe('formatUploadError', () => {
	it('rozpoznaje brak bucketu', () => {
		expect(formatUploadError('Bucket not found')).toContain('post-assets');
	});

	it('rozpoznaje mime type', () => {
		expect(formatUploadError('mime type application/pdf is not allowed')).toContain('PDF');
	});

	it('zwraca detail gdy nieznany', () => {
		expect(formatUploadError('custom error')).toContain('custom error');
	});
});
