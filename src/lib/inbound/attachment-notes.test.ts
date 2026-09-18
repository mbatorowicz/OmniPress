import { describe, expect, it } from 'vitest';
import { inbound } from '@/i18n';
import { appendAttachmentNotes, attachmentSkipNote, overflowSkipNote } from './attachment-notes';

describe('attachment-notes', () => {
	it('sklada notatke i dopina ja do tresci szkicu', () => {
		expect(attachmentSkipNote('a.exe', 'invalid_type')).toBe(inbound.skippedType('a.exe'));
		expect(overflowSkipNote(3, 'x.png')).toBe(inbound.skippedLimitMany(3));
		expect(overflowSkipNote(1, 'x.png')).toBe(inbound.skippedLimit('x.png'));
		expect(appendAttachmentNotes('Zapraszamy.', [inbound.skippedType('a.exe')])).toBe(
			`Zapraszamy.\n\n${inbound.skippedType('a.exe')}`,
		);
		expect(appendAttachmentNotes('', [inbound.skippedList])).toBe(inbound.skippedList);
	});
});
