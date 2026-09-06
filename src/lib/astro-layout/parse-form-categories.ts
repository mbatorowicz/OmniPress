/** Kategorie wpisów z formularza i ich przypisanie do feedów (`categoryDisplays`). */
import { isCategoryFeedComponent } from './components';
import { mergeCategoryDisplays } from './slots';
import { applyCategoryArchiveFieldsFromForm } from './category-archive';
import { isValidSlug, normalizeSlug } from '@/lib/admin/slug';
import { formHasDisplayFields } from './parse-form-fields';
import type { CategoryDefinition, DisplaySlot, SiteAstroLayout } from './types';

export type ParseCategoriesError = 'invalid_category_slug' | 'duplicate_category_slug';

export function parseCategoriesFromForm(
	form: FormData,
): { ok: true; categories: CategoryDefinition[] } | { ok: false; error: ParseCategoriesError } {
	const slugs = form.getAll('category_slug').map((v) => String(v).trim());
	const names = form.getAll('category_name').map((v) => String(v).trim());
	const layouts = form.getAll('category_archive_layout').map((v) => String(v).trim());
	const columns = form.getAll('category_archive_columns').map((v) => String(v).trim());
	const categories: CategoryDefinition[] = [];
	const seen = new Set<string>();

	for (let i = 0; i < slugs.length; i++) {
		const rawSlug = slugs[i] ?? '';
		const name = names[i] ?? '';
		if (!rawSlug && !name) continue;

		const slug = normalizeSlug(rawSlug);
		if (!slug || !isValidSlug(slug) || !name) {
			return { ok: false, error: 'invalid_category_slug' };
		}
		const key = slug.toLowerCase();
		if (seen.has(key)) {
			return { ok: false, error: 'duplicate_category_slug' };
		}
		seen.add(key);

		const item: CategoryDefinition = { slug, name };
		applyCategoryArchiveFieldsFromForm(item, layouts[i] ?? 'tiles', columns[i] ?? '2');
		// Kolumny mają sens tylko dla kafelków; wartość domyślna nie trafia do pliku.
		if (item.archiveLayout === 'title-list') {
			delete item.archiveColumns;
		} else {
			delete item.archiveLayout;
			if (item.archiveColumns === 2) delete item.archiveColumns;
		}
		categories.push(item);
	}
	return { ok: true, categories };
}

/** Przypisania czytamy tylko dla slotów obecnych w formularzu — reszta zostaje z zapisanego stanu. */
export function parseCategoryDisplaysFromForm(
	form: FormData,
	slots: DisplaySlot[],
	categories: CategoryDefinition[],
	existing: SiteAstroLayout['categoryDisplays'],
): SiteAstroLayout['categoryDisplays'] {
	const base = mergeCategoryDisplays(slots, existing);
	for (const slot of slots) {
		if (!isCategoryFeedComponent(slot.component)) continue;
		if (!formHasDisplayFields(form, slot.id)) continue;
		base[slot.id] = categories
			.filter((c) => form.get(`display_${slot.id}_${c.slug}`) === 'on')
			.map((c) => c.slug);
	}
	return base;
}

/** Zapis samej listy kategorii nie może zostawić w feedach przypisań do kategorii, których już nie ma. */
export function pruneCategoryDisplays(
	existing: SiteAstroLayout,
	categories: CategoryDefinition[],
): SiteAstroLayout['categoryDisplays'] {
	const displays = mergeCategoryDisplays(existing.slots, existing.categoryDisplays);
	for (const slot of existing.slots) {
		if (!isCategoryFeedComponent(slot.component)) continue;
		const slugs = existing.categoryDisplays[slot.id] ?? [];
		displays[slot.id] = slugs.filter((slug) => categories.some((c) => c.slug === slug));
	}
	return displays;
}
