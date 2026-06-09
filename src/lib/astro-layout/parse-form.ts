import { parseNavigationJson } from './parse';
import { mergeCategoryDisplays } from './slots';
import type { CategoryDefinition, DisplaySlot, SiteAstroLayout, SiteWidgetsConfig } from './types';

function parseIntField(raw: FormDataEntryValue | null): number | undefined {
	const n = Number(String(raw ?? '').trim());
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

function parseSlotsFromForm(form: FormData): DisplaySlot[] {
	const ids = form.getAll('slot_id').map((v) => String(v).trim());
	const labels = form.getAll('slot_label').map((v) => String(v).trim());
	const components = form.getAll('slot_component').map((v) => String(v).trim());
	const titles = form.getAll('slot_widget_title').map((v) => String(v).trim());
	const sectionTitles = form.getAll('slot_widget_section_title').map((v) => String(v).trim());
	const limits = form.getAll('slot_widget_limit');
	const emptyTexts = form.getAll('slot_widget_empty_text').map((v) => String(v).trim());
	const moreLinks = form.getAll('slot_widget_more_link').map((v) => String(v).trim());
	const variants = form.getAll('slot_widget_variant').map((v) => String(v).trim());

	const slots: DisplaySlot[] = [];
	for (let i = 0; i < ids.length; i++) {
		const id = ids[i];
		const label = labels[i] ?? '';
		const component = components[i] ?? '';
		if (!id || !label || !component) continue;

		const widget: DisplaySlot['widget'] = {};
		if (titles[i]) widget.title = titles[i];
		if (sectionTitles[i]) widget.sectionTitle = sectionTitles[i];
		const limit = parseIntField(limits[i] ?? null);
		if (limit) widget.limit = limit;
		if (emptyTexts[i]) widget.emptyText = emptyTexts[i];
		if (moreLinks[i]) widget.moreLink = moreLinks[i];
		if (variants[i] === 'alert' || variants[i] === 'default') widget.variant = variants[i];
		if (form.get(`slot_enabled_${id}`) !== 'on') widget.enabled = false;

		slots.push({
			id,
			label,
			component,
			widget: Object.keys(widget).length > 0 ? widget : undefined,
		});
	}
	return slots;
}

function parseWidgetsFromForm(form: FormData): SiteWidgetsConfig {
	const widgets: SiteWidgetsConfig = {};

	const recentTitle = String(form.get('widget_recent_changes_title') ?? '').trim();
	const recentLimit = parseIntField(form.get('widget_recent_changes_limit'));
	const recentEnabled = form.get('widget_recent_changes_enabled') === 'on';
	const recent: SiteWidgetsConfig['recent_changes'] = {};
	if (recentTitle) recent.title = recentTitle;
	if (recentLimit) recent.limit = recentLimit;
	if (!recentEnabled) recent.enabled = false;
	if (Object.keys(recent).length > 0) widgets.recent_changes = recent;

	const certTitle = String(form.get('widget_cert_advisories_title') ?? '').trim();
	const certLimit = parseIntField(form.get('widget_cert_advisories_limit'));
	const certMoreLink = String(form.get('widget_cert_advisories_more_link') ?? '').trim();
	const certCategory = String(form.get('widget_cert_advisories_category') ?? '').trim();
	const certEnabled = form.get('widget_cert_advisories_enabled') === 'on';
	const certVariant = String(form.get('widget_cert_advisories_variant') ?? '').trim();
	const cert: SiteWidgetsConfig['cert_advisories'] = {};
	if (certTitle) cert.title = certTitle;
	if (certLimit) cert.limit = certLimit;
	if (certMoreLink) cert.moreLink = certMoreLink;
	if (certCategory) cert.categoryFilter = certCategory;
	if (!certEnabled) cert.enabled = false;
	if (certVariant === 'alert' || certVariant === 'default') cert.variant = certVariant;
	if (Object.keys(cert).length > 0) widgets.cert_advisories = cert;

	return widgets;
}

export function parseLayoutFromFormData(
	form: FormData,
	base: Pick<SiteAstroLayout, 'navigationPath' | 'categoriesPath'>,
): { ok: true; layout: SiteAstroLayout } | { ok: false; error: string } {
	const navText = String(form.get('navigation_json') ?? '').trim();
	if (!navText) return { ok: false, error: 'invalid_navigation' };

	let navigation;
	try {
		navigation = parseNavigationJson(navText);
	} catch {
		return { ok: false, error: 'invalid_navigation' };
	}

	const slugs = form.getAll('category_slug').map((v) => String(v).trim());
	const names = form.getAll('category_name').map((v) => String(v).trim());
	const categories: CategoryDefinition[] = [];

	for (let i = 0; i < slugs.length; i++) {
		const slug = slugs[i];
		const name = names[i] ?? '';
		if (!slug || !name) continue;
		categories.push({ slug, name });
	}

	if (categories.length === 0) return { ok: false, error: 'no_categories' };

	const slots = parseSlotsFromForm(form);
	if (slots.length === 0) return { ok: false, error: 'no_slots' };

	const categoryDisplays = mergeCategoryDisplays(slots, {});
	for (const slot of slots) {
		categoryDisplays[slot.id] = categories
			.filter((c) => form.get(`display_${slot.id}_${c.slug}`) === 'on')
			.map((c) => c.slug);
	}

	return {
		ok: true,
		layout: {
			navigation,
			categories,
			categoryDisplays,
			slots,
			widgets: parseWidgetsFromForm(form),
			navigationPath: base.navigationPath,
			categoriesPath: base.categoriesPath,
		},
	};
}
