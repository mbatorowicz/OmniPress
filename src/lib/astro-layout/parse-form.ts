import { parseNavigationJson } from './parse';
import { parseNavEditorDepthColorsFromForm } from '@/lib/admin/nav-editor-colors';
import { applyNavDropdownFieldsFromForm } from '@/lib/admin/nav-dropdown-layout';
import {
	getComponentKind,
	isCategoryFeedComponent,
	isLayoutComponentId,
	isSingletonComponent,
} from './components';
import { validateBannerWidget } from './banners';
import { slotFormFields } from './slot-form-fields';
import { mergeCategoryDisplays, sortSlotsByOrder } from './slots';
import { isExternalHref, normalizeInternalHref, countNavigationHrefs } from './validate-nav';
import { applyCategoryArchiveFieldsFromForm } from './category-archive';
import type { CategoryDefinition, DisplaySlot, NavItem, SiteAstroLayout, SlotWidgetConfig } from './types';

export type LayoutFormSection = 'navigation' | 'categories' | 'components' | 'all';

export type LayoutFormError =
	| 'invalid_navigation'
	| 'no_categories'
	| 'no_slots'
	| 'invalid_section';

function parseIntField(raw: FormDataEntryValue | null): number | undefined {
	const n = Number(String(raw ?? '').trim());
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

function parseOrderField(raw: FormDataEntryValue | null): number | undefined {
	const n = Number(String(raw ?? '').trim());
	return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

function strField(form: FormData, name: string): string {
	return String(form.get(name) ?? '').trim();
}

function strFields(form: FormData, name: string): string[] {
	return form.getAll(name).map((v) => String(v).trim());
}

function parseBaseWidget(form: FormData, id: string, index: number): SlotWidgetConfig {
	const widget: SlotWidgetConfig = {};
	const order = parseOrderField(form.getAll('slot_widget_order')[index] ?? null);
	widget.order = order ?? (index + 1) * 10;
	if (form.get(`slot_enabled_${id}`) !== 'on') widget.enabled = false;
	return widget;
}

function parseFeedListFields(
	form: FormData,
	id: string,
	fields: {
		title: (id: string) => string;
		limit: (id: string) => string;
		emptyText: (id: string) => string;
		variant: (id: string) => string;
	},
	widget: SlotWidgetConfig,
): void {
	const title = strField(form, fields.title(id));
	if (title) widget.title = title;
	const limit = parseIntField(form.get(fields.limit(id)));
	if (limit) widget.limit = limit;
	const emptyText = strField(form, fields.emptyText(id));
	if (emptyText) widget.emptyText = emptyText;
	if (form.get(slotFormFields.hideWhenEmpty(id)) === 'on') widget.hideWhenEmpty = true;
	const variant = strField(form, fields.variant(id));
	if (variant === 'alert' || variant === 'default') widget.variant = variant;
}

function parseHomeFeedWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	parseFeedListFields(form, id, slotFormFields.homeFeed, widget);
	const sectionTitle = strField(form, slotFormFields.homeFeed.sectionTitle(id));
	if (sectionTitle) widget.sectionTitle = sectionTitle;
	const moreLink = strField(form, slotFormFields.homeFeed.moreLink(id));
	if (moreLink) widget.moreLink = moreLink;
}

function parseRecentChangesWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	parseFeedListFields(form, id, slotFormFields.recentChanges, widget);
}

function parseCertWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	parseFeedListFields(form, id, slotFormFields.cert, widget);
	const categoryFilter = strField(form, slotFormFields.cert.categoryFilter(id));
	if (categoryFilter) widget.categoryFilter = categoryFilter;
}

function parseBannerWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	widget.style = strField(form, slotFormFields.banner.style(id)) === 'text' ? 'text' : 'image';
	const imageUrl = strField(form, slotFormFields.banner.imageUrl(id));
	if (imageUrl) widget.imageUrl = imageUrl;
	if (strField(form, slotFormFields.banner.imageVariant(id)) === 'blue') widget.imageVariant = 'blue';
	const textTitle = strField(form, slotFormFields.banner.textTitle(id));
	if (textTitle) widget.textTitle = textTitle;
	const textButton = strField(form, slotFormFields.banner.textButton(id));
	if (textButton) widget.textButton = textButton;
	const linkType = strField(form, slotFormFields.banner.linkType(id));
	if (linkType === 'category' || linkType === 'page' || linkType === 'external') {
		widget.linkType = linkType;
	}
	if (widget.linkType === 'category') {
		const categorySlug = strField(form, slotFormFields.banner.categorySlug(id));
		if (categorySlug) widget.categorySlug = categorySlug;
	}
	if (widget.linkType === 'page') {
		const pagePath = strField(form, slotFormFields.banner.pagePath(id));
		if (pagePath) widget.pagePath = pagePath;
	}
	if (widget.linkType === 'external') {
		const externalUrl = strField(form, slotFormFields.banner.externalUrl(id));
		if (externalUrl) widget.externalUrl = externalUrl;
	}
}

function parseWeatherWidget(form: FormData, id: string, widget: SlotWidgetConfig): void {
	const title = strField(form, slotFormFields.weather.title(id));
	if (title) widget.title = title;
	const emptyText = strField(form, slotFormFields.weather.emptyText(id));
	if (emptyText) widget.emptyText = emptyText;
	if (form.get(slotFormFields.hideWhenEmpty(id)) === 'on') widget.hideWhenEmpty = true;
	const terytPowiat = strField(form, slotFormFields.weather.terytPowiat(id));
	if (terytPowiat) widget.terytPowiat = terytPowiat;
	const lat = Number(strField(form, slotFormFields.weather.lat(id)));
	const lon = Number(strField(form, slotFormFields.weather.lon(id)));
	if (Number.isFinite(lat) && Number.isFinite(lon)) widget.mapCenter = { lat, lon };
	const zoom = Number(strField(form, slotFormFields.weather.mapZoom(id)));
	if (Number.isFinite(zoom) && zoom > 0) widget.mapZoom = Math.floor(zoom);
	if (form.get(slotFormFields.weather.showMap(id)) !== 'on') widget.showMap = false;
	const mapScope = strField(form, slotFormFields.weather.mapScope(id));
	if (mapScope) {
		widget.mapScopePowiaty = mapScope
			.split(',')
			.map((c) => c.trim())
			.filter(Boolean);
	}
	const detailsDisplay = strField(form, slotFormFields.weather.detailsDisplay(id));
	if (detailsDisplay === 'modal' || detailsDisplay === 'inline') widget.detailsDisplay = detailsDisplay;
	const detailsLayout = strField(form, slotFormFields.weather.detailsLayout(id));
	if (detailsLayout === 'stacked' || detailsLayout === 'grid') widget.detailsLayout = detailsLayout;
	const detailsSummary = strField(form, slotFormFields.weather.detailsSummary(id));
	if (detailsSummary) widget.detailsSummary = detailsSummary;
	const detailsCloseLabel = strField(form, slotFormFields.weather.detailsCloseLabel(id));
	if (detailsCloseLabel) widget.detailsCloseLabel = detailsCloseLabel;
}

function parseSlotsFromForm(form: FormData): DisplaySlot[] {
	const ids = form.getAll('slot_id').map((v) => String(v).trim());
	const labels = form.getAll('slot_label').map((v) => String(v).trim());
	const components = form.getAll('slot_component').map((v) => String(v).trim());

	const seenSingletons = new Set<string>();
	const slots: DisplaySlot[] = [];

	for (let i = 0; i < ids.length; i++) {
		const id = ids[i];
		const label = labels[i] ?? '';
		const component = components[i] ?? '';
		if (!id || !label || !isLayoutComponentId(component)) continue;
		if (isSingletonComponent(component)) {
			if (seenSingletons.has(component)) continue;
			seenSingletons.add(component);
		}

		const widget = parseBaseWidget(form, id, i);
		const kind = getComponentKind(component);

		if (kind === 'home_feed') parseHomeFeedWidget(form, id, widget);
		if (kind === 'recent_changes') parseRecentChangesWidget(form, id, widget);
		if (kind === 'cert') parseCertWidget(form, id, widget);
		if (kind === 'weather') parseWeatherWidget(form, id, widget);
		if (kind === 'banner') {
			parseBannerWidget(form, id, widget);
			if (!validateBannerWidget(widget, label)) continue;
		}

		slots.push({
			id,
			label,
			component,
			widget: Object.keys(widget).length > 0 ? widget : undefined,
		});
	}
	return sortSlotsByOrder(slots);
}

function parseCategoriesFromForm(form: FormData): CategoryDefinition[] {
	const slugs = form.getAll('category_slug').map((v) => String(v).trim());
	const names = form.getAll('category_name').map((v) => String(v).trim());
	const layouts = form.getAll('category_archive_layout').map((v) => String(v).trim());
	const columns = form.getAll('category_archive_columns').map((v) => String(v).trim());
	const categories: CategoryDefinition[] = [];

	for (let i = 0; i < slugs.length; i++) {
		const slug = slugs[i];
		const name = names[i] ?? '';
		if (!slug || !name) continue;
		const item: CategoryDefinition = { slug, name };
		applyCategoryArchiveFieldsFromForm(
			item,
			layouts[i] ?? 'tiles',
			columns[i] ?? '2',
		);
		if (item.archiveLayout === 'title-list') {
			delete item.archiveColumns;
		} else {
			delete item.archiveLayout;
			if (item.archiveColumns === 2) delete item.archiveColumns;
		}
		categories.push(item);
	}
	return categories;
}

function resolveNavHref(kind: string, value: string): string | undefined {
	const trimmed = value.trim();
	if (kind === 'none' || !kind) return undefined;
	if (kind === 'external') return trimmed || undefined;
	if (kind === 'category') {
		if (!trimmed) return undefined;
		return normalizeInternalHref(trimmed.startsWith('/') ? trimmed : `/${trimmed}`);
	}
	if (kind === 'page' || kind === 'static' || kind === 'custom') {
		if (!trimmed) return undefined;
		if (isExternalHref(trimmed)) return trimmed;
		return normalizeInternalHref(trimmed);
	}
	return undefined;
}

function resolveRowHrefValue(values: string[], rowIndex: number, rowCount: number): string {
	const direct = values[rowIndex]?.trim() ?? '';
	if (direct) return direct;
	if (values.length > rowCount) {
		const stride = Math.max(1, Math.floor(values.length / rowCount));
		for (let offset = 1; offset < stride; offset++) {
			const candidate = values[rowIndex + offset * rowCount]?.trim() ?? '';
			if (candidate) return candidate;
		}
	}
	return '';
}

export function parseNavigationFromForm(form: FormData): NavItem[] {
	const depths = strFields(form, 'nav_depth');
	const labels = strFields(form, 'nav_label');
	const kinds = strFields(form, 'nav_href_kind');
	const values = strFields(form, 'nav_href_value');
	const parents = strFields(form, 'nav_parent');
	const menuColumns = strFields(form, 'nav_menu_columns');
	const menuColWidth0 = strFields(form, 'nav_menu_col_width_0');
	const menuColWidth1 = strFields(form, 'nav_menu_col_width_1');

	if (labels.length === 0) return [];

	const rowCount = labels.length;
	const items: (NavItem | null)[] = new Array(rowCount).fill(null);
	const roots: NavItem[] = [];

	for (let i = 0; i < rowCount; i++) {
		const label = labels[i]?.trim();
		if (!label) continue;

		const depth = Math.min(2, Math.max(0, Number(depths[i] ?? 0) || 0));
		const item: NavItem = { label };
		const href = resolveNavHref(
			kinds[i] ?? 'none',
			resolveRowHrefValue(values, i, rowCount),
		);
		if (href) item.href = href;
		if (depth === 0) {
			applyNavDropdownFieldsFromForm(
				item,
				menuColumns[i] ?? '1',
				menuColWidth0[i] ?? '',
				menuColWidth1[i] ?? '',
			);
			if (item.menuColumns === 1 && !item.menuColumnWidths?.length) {
				delete item.menuColumns;
			}
		}
		items[i] = item;
	}

	for (let i = 0; i < rowCount; i++) {
		const item = items[i];
		if (!item) continue;

		const depth = Math.min(2, Math.max(0, Number(depths[i] ?? 0) || 0));
		const parentRaw = parents[i]?.trim() ?? '';

		if (depth === 0) {
			roots.push(item);
			continue;
		}

		if (!parentRaw) return [];
		const parentIndex = Number(parentRaw);
		if (!Number.isInteger(parentIndex) || parentIndex < 0 || parentIndex >= i) return [];

		const parentItem = items[parentIndex];
		if (!parentItem) return [];

		const parentDepth = Math.min(2, Math.max(0, Number(depths[parentIndex] ?? 0) || 0));
		if (parentDepth !== depth - 1) return [];

		if (!parentItem.children) parentItem.children = [];
		parentItem.children.push(item);
	}

	return roots;
}

function parseNavigationSection(form: FormData): NavItem[] | { error: 'invalid_navigation' } {
	const labels = strFields(form, 'nav_label');
	const hasTableRows = labels.some((label) => label.trim() !== '');
	const jsonFallback = String(form.get('navigation_json') ?? '').trim();

	if (hasTableRows) {
		const tableTree = parseNavigationFromForm(form);
		if (tableTree.length === 0) return { error: 'invalid_navigation' };

		if (jsonFallback) {
			try {
				const jsonTree = parseNavigationJson(jsonFallback);
				const tableHrefs = countNavigationHrefs(tableTree);
				const jsonHrefs = countNavigationHrefs(jsonTree);
				if (tableHrefs === 0 && jsonHrefs > 0) {
					return jsonTree;
				}
			} catch {
				// zostaw drzewo z tabeli
			}
		}

		return tableTree;
	}

	if (jsonFallback) {
		try {
			return parseNavigationJson(jsonFallback);
		} catch {
			return { error: 'invalid_navigation' };
		}
	}

	return { error: 'invalid_navigation' };
}

function parseCategoryDisplaysFromForm(
	form: FormData,
	slots: DisplaySlot[],
	categories: CategoryDefinition[],
	existing: SiteAstroLayout['categoryDisplays'],
): SiteAstroLayout['categoryDisplays'] {
	const base = mergeCategoryDisplays(slots, existing);
	for (const slot of slots) {
		if (!isCategoryFeedComponent(slot.component)) continue;
		base[slot.id] = categories
			.filter((c) => form.get(`display_${slot.id}_${c.slug}`) === 'on')
			.map((c) => c.slug);
	}
	return base;
}

export function mergeLayoutFromFormData(
	form: FormData,
	existing: SiteAstroLayout,
	section: LayoutFormSection,
): { ok: true; layout: SiteAstroLayout } | { ok: false; error: LayoutFormError } {
	const layout: SiteAstroLayout = { ...existing };

	if (section === 'navigation' || section === 'all') {
		const navigation = parseNavigationSection(form);
		if ('error' in navigation) return { ok: false, error: navigation.error };
		layout.navigation = navigation;
		layout.navEditorDepthColors = parseNavEditorDepthColorsFromForm(form);
	}

	if (section === 'components' || section === 'all') {
		const slots = parseSlotsFromForm(form);
		if (slots.length === 0) return { ok: false, error: 'no_slots' };
		layout.slots = slots;
	}

	if (section === 'categories' || section === 'all') {
		const categories = parseCategoriesFromForm(form);
		if (categories.length === 0) return { ok: false, error: 'no_categories' };
		layout.categories = categories;
		if (section === 'all') {
			layout.categoryDisplays = parseCategoryDisplaysFromForm(form, layout.slots, categories, {});
		} else {
			layout.categoryDisplays = mergeCategoryDisplays(existing.slots, existing.categoryDisplays);
			for (const slot of existing.slots) {
				if (!isCategoryFeedComponent(slot.component)) continue;
				const slugs = existing.categoryDisplays[slot.id] ?? [];
				layout.categoryDisplays[slot.id] = slugs.filter((slug) =>
					categories.some((c) => c.slug === slug),
				);
			}
		}
	}

	if (section === 'components') {
		layout.categoryDisplays = parseCategoryDisplaysFromForm(
			form,
			layout.slots,
			existing.categories,
			existing.categoryDisplays,
		);
	}

	return { ok: true, layout };
}

/** @deprecated Użyj mergeLayoutFromFormData z section=all */
export function parseLayoutFromFormData(
	form: FormData,
	base: Pick<SiteAstroLayout, 'navigationPath' | 'categoriesPath'>,
): { ok: true; layout: SiteAstroLayout } | { ok: false; error: string } {
	const existing: SiteAstroLayout = {
		navigation: [],
		categories: [],
		categoryDisplays: {},
		slots: [],
		navigationPath: base.navigationPath,
		categoriesPath: base.categoriesPath,
	};
	const result = mergeLayoutFromFormData(form, existing, 'all');
	if (!result.ok) return result;
	return result;
}

export function parseLayoutSection(form: FormData, existing: SiteAstroLayout): ReturnType<typeof mergeLayoutFromFormData> {
	const raw = String(form.get('section') ?? 'all').trim();
	const section: LayoutFormSection =
		raw === 'navigation' || raw === 'categories' || raw === 'components' || raw === 'all'
			? raw
			: 'all';
	return mergeLayoutFromFormData(form, existing, section);
}
