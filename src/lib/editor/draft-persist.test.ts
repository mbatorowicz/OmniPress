/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { draftStorageKey, writeDraft } from './draft-store';
import {
	applyFormDraftFields,
	initPostDraftPersist,
	persistOpenDraft,
	readFormDraftFields,
} from './draft-persist';

function mountForm(values: {
	title?: string;
	slug?: string;
	category?: string;
	content?: string;
	date?: string;
	hour?: string;
	baseline?: Record<string, string>;
} = {}): HTMLFormElement {
	const hour = values.hour ?? '10:00';
	const baseline = JSON.stringify(
		values.baseline ?? {
			title: values.title ?? '',
			slug: values.slug ?? '',
			category_slug: values.category ?? '',
			content_md: values.content ?? '',
			scheduled_publish_date: values.date ?? '',
			scheduled_publish_hour: hour,
		},
	);
	document.body.innerHTML = `
		<form id="post-form" data-post-id="post-1" data-draft-baseline='${baseline}'>
			<p data-draft-restored class="hidden">przywrócono</p>
			<input name="title" value="${values.title ?? ''}" />
			<input name="slug" value="${values.slug ?? ''}" />
			<select name="category_slug">
				<option value=""></option>
				<option value="aktualnosci" ${values.category === 'aktualnosci' ? 'selected' : ''}></option>
			</select>
			<textarea name="content_md">${values.content ?? ''}</textarea>
			<input name="scheduled_publish_date" value="${values.date ?? ''}" />
			<select name="scheduled_publish_hour">
				<option value="08:00" ${hour === '08:00' ? 'selected' : ''}></option>
				<option value="10:00" ${hour === '10:00' ? 'selected' : ''}></option>
			</select>
		</form>
	`;
	return document.getElementById('post-form') as HTMLFormElement;
}

describe('draft-persist', () => {
	beforeEach(() => {
		sessionStorage.clear();
		document.body.innerHTML = '';
	});

	afterEach(() => {
		sessionStorage.clear();
	});

	it('czyta i zapisuje pola formularza', () => {
		const form = mountForm({ title: 'A', content: 'B', category: 'aktualnosci' });
		const fields = readFormDraftFields(form);
		expect(fields.title).toBe('A');
		expect(fields.content_md).toBe('B');
		expect(fields.category_slug).toBe('aktualnosci');

		applyFormDraftFields(form, { ...fields, title: 'C', content_md: 'D' });
		expect(readFormDraftFields(form).title).toBe('C');
		expect(readFormDraftFields(form).content_md).toBe('D');
	});

	it('przywraca niewysłany szkic, gdy serwer jest nadal pusty', () => {
		writeDraft(sessionStorage, 'post-1', {
			baseline: {
				title: '',
				slug: '',
				category_slug: '',
				content_md: '',
				scheduled_publish_date: '',
				scheduled_publish_hour: '10:00',
			},
			values: {
				title: 'Szkic',
				slug: 'szkic',
				category_slug: 'aktualnosci',
				content_md: 'Treść',
				scheduled_publish_date: '2026-09-10',
				scheduled_publish_hour: '08:00',
			},
		});

		const form = mountForm({ hour: '10:00' });
		expect(initPostDraftPersist(form)).toBe(true);
		expect(readFormDraftFields(form)).toMatchObject({
			title: 'Szkic',
			content_md: 'Treść',
			category_slug: 'aktualnosci',
			scheduled_publish_date: '2026-09-10',
			scheduled_publish_hour: '08:00',
		});
		expect(form.querySelector('[data-draft-restored]')?.classList.contains('hidden')).toBe(false);
	});

	it('nie nadpisuje nowszego stanu z serwera', () => {
		writeDraft(sessionStorage, 'post-1', {
			baseline: {
				title: '',
				slug: '',
				category_slug: '',
				content_md: '',
				scheduled_publish_date: '',
				scheduled_publish_hour: '',
			},
			values: {
				title: 'Stary',
				slug: '',
				category_slug: '',
				content_md: '',
				scheduled_publish_date: '',
				scheduled_publish_hour: '',
			},
		});

		const form = mountForm({ title: 'Zapisany na serwerze' });
		expect(initPostDraftPersist(form)).toBe(false);
		expect(readFormDraftFields(form).title).toBe('Zapisany na serwerze');
	});

	it('zapisuje zmiany i czyści je przy zgodności z bazą oraz przy submit', () => {
		const form = mountForm();
		initPostDraftPersist(form);

		const title = form.elements.namedItem('title') as HTMLInputElement;
		title.value = 'Nowe';
		title.dispatchEvent(new Event('input', { bubbles: true }));
		expect(sessionStorage.getItem(draftStorageKey('post-1'))).toContain('Nowe');

		title.value = '';
		persistOpenDraft(form);
		expect(sessionStorage.getItem(draftStorageKey('post-1'))).toBeNull();

		title.value = 'Znowu';
		persistOpenDraft(form);
		form.dispatchEvent(new Event('submit'));
		expect(sessionStorage.getItem(draftStorageKey('post-1'))).toBeNull();
	});

	it('nie montuje się drugi raz na tym samym formularzu', () => {
		const form = mountForm();
		expect(initPostDraftPersist(form)).toBe(false);
		expect(initPostDraftPersist(form)).toBe(false);
	});

	it('zapisuje wartości wpisane zanim skrypt się podpiął — wg bazy z SSR', () => {
		const form = mountForm({
			title: 'Wpisane wcześniej',
			baseline: {
				title: '',
				slug: '',
				category_slug: '',
				content_md: '',
				scheduled_publish_date: '',
				scheduled_publish_hour: '10:00',
			},
		});
		expect(initPostDraftPersist(form)).toBe(false);
		expect(sessionStorage.getItem(draftStorageKey('post-1'))).toContain('Wpisane wcześniej');
	});
});
