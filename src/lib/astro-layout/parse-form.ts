import { parseNavigationJson } from './parse';
import {
	getComponentKind,
	isCategoryFeedComponent,
	isLayoutComponentId,
	isSingletonComponent,
} from './components';
import { validateBannerWidget } from './banners';
import { slotFormFields } from './slot-form-fields';
import { mergeCategoryDisplays, sortSlotsByOrder } from './slots';
import type { CategoryDefinition, DisplaySlot, SiteAstroLayout, SlotWidgetConfig } from './types';

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
		if (!isCategoryFeedComponent(slot.component)) continue;
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
			navigationPath: base.navigationPath,
			categoriesPath: base.categoriesPath,
		},
	};
}
