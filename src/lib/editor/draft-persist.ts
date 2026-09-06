import {
	applyExtraCategoryDraftValue,
	readExtraCategoryDraftValue,
	syncExtraCategoryOptions,
} from './extra-categories';
import {
	clearDraft,
	fieldsEqual,
	parseDraftFields,
	readDraft,
	shouldRestoreDraft,
	writeDraft,
	type PostDraftFields,
} from './draft-store';

const TEXT_FIELD_NAMES: (keyof PostDraftFields)[] = [
	'title',
	'slug',
	'category_slug',
	'content_md',
	'scheduled_publish_date',
	'scheduled_publish_hour',
];

const baselines = new WeakMap<HTMLFormElement, PostDraftFields>();
const bound = new WeakSet<HTMLFormElement>();

function fieldValue(form: HTMLFormElement, name: keyof PostDraftFields): string {
	const el = form.elements.namedItem(name);
	if (
		el instanceof HTMLInputElement ||
		el instanceof HTMLSelectElement ||
		el instanceof HTMLTextAreaElement
	) {
		return el.value;
	}
	return '';
}

export function readFormDraftFields(form: HTMLFormElement): PostDraftFields {
	return {
		title: fieldValue(form, 'title'),
		slug: fieldValue(form, 'slug'),
		category_slug: fieldValue(form, 'category_slug'),
		extra_category_slugs: readExtraCategoryDraftValue(form),
		content_md: fieldValue(form, 'content_md'),
		scheduled_publish_date: fieldValue(form, 'scheduled_publish_date'),
		scheduled_publish_hour: fieldValue(form, 'scheduled_publish_hour'),
	};
}

export function applyFormDraftFields(form: HTMLFormElement, values: PostDraftFields): void {
	for (const name of TEXT_FIELD_NAMES) {
		const el = form.elements.namedItem(name);
		if (
			el instanceof HTMLInputElement ||
			el instanceof HTMLSelectElement ||
			el instanceof HTMLTextAreaElement
		) {
			el.value = values[name];
		}
	}
	applyExtraCategoryDraftValue(form, values.extra_category_slugs);
}

export function persistPostDraft(
	form: HTMLFormElement,
	postId: string,
	baseline: PostDraftFields,
): void {
	const values = readFormDraftFields(form);
	if (fieldsEqual(values, baseline)) {
		clearDraft(sessionStorage, postId);
		return;
	}
	writeDraft(sessionStorage, postId, { baseline, values });
}

export function readServerDraftBaseline(form: HTMLFormElement): PostDraftFields {
	try {
		const parsed = parseDraftFields(JSON.parse(form.dataset.draftBaseline ?? 'null'));
		if (parsed) return parsed;
	} catch {
		// invalid data-draft-baseline — fall back to live form
	}
	return readFormDraftFields(form);
}

export function restorePostDraft(
	form: HTMLFormElement,
	postId: string,
	server: PostDraftFields = readServerDraftBaseline(form),
): { restored: boolean; baseline: PostDraftFields } {
	const draft = readDraft(sessionStorage, postId);
	if (draft && shouldRestoreDraft(draft, server)) {
		applyFormDraftFields(form, draft.values);
		return { restored: true, baseline: draft.baseline };
	}
	return { restored: false, baseline: server };
}

export function persistOpenDraft(form: HTMLFormElement): void {
	const postId = form.dataset.postId;
	const baseline = baselines.get(form);
	if (!postId || !baseline) return;
	persistPostDraft(form, postId, baseline);
}

export function initPostDraftPersist(form: HTMLFormElement): boolean {
	if (bound.has(form)) return false;
	const postId = form.dataset.postId;
	if (!postId) return false;

	bound.add(form);
	const { restored, baseline } = restorePostDraft(form, postId);
	baselines.set(form, baseline);

	syncExtraCategoryOptions(form);
	const persist = () => persistPostDraft(form, postId, baseline);
	form.addEventListener('input', persist);
	form.addEventListener('change', () => {
		syncExtraCategoryOptions(form);
		persist();
	});
	form.addEventListener('submit', () => clearDraft(sessionStorage, postId));
	window.addEventListener('pagehide', persist);

	if (!restored) persist();

	if (restored) {
		form.querySelector('[data-draft-restored]')?.classList.remove('hidden');
	}
	return restored;
}
