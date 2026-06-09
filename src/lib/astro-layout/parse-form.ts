import { parseNavigationJson } from './parse';
import { isCategoryFeedComponent, isLayoutComponentId, isSingletonComponent } from './components';
import { validateBannerWidget } from './banners';
import { mergeCategoryDisplays, sortSlotsByOrder } from './slots';
import type { CategoryDefinition, DisplaySlot, SiteAstroLayout } from './types';

function parseIntField(raw: FormDataEntryValue | null): number | undefined {
	const n = Number(String(raw ?? '').trim());
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

function parseOrderField(raw: FormDataEntryValue | null): number | undefined {
	const n = Number(String(raw ?? '').trim());
	return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
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
	const orders = form.getAll('slot_widget_order');
	const certFilters = form.getAll('slot_cert_category_filter').map((v) => String(v).trim());

	const bannerStyles = form.getAll('slot_banner_style').map((v) => String(v).trim());
	const bannerImageUrls = form.getAll('slot_banner_image_url').map((v) => String(v).trim());
	const bannerImageVariants = form.getAll('slot_banner_image_variant').map((v) => String(v).trim());
	const bannerTextTitles = form.getAll('slot_banner_text_title').map((v) => String(v).trim());
	const bannerTextButtons = form.getAll('slot_banner_text_button').map((v) => String(v).trim());
	const bannerLinkTypes = form.getAll('slot_banner_link_type').map((v) => String(v).trim());
	const bannerCategorySlugs = form.getAll('slot_banner_category_slug').map((v) => String(v).trim());
	const bannerPagePaths = form.getAll('slot_banner_page_path').map((v) => String(v).trim());
	const bannerExternalUrls = form.getAll('slot_banner_external_url').map((v) => String(v).trim());

	const weatherIds = form.getAll('slot_weather_id').map((v) => String(v).trim());
	const weatherTeryt = form.getAll('slot_weather_teryt_powiat').map((v) => String(v).trim());
	const weatherLat = form.getAll('slot_weather_lat');
	const weatherLon = form.getAll('slot_weather_lon');
	const weatherZoom = form.getAll('slot_weather_map_zoom');
	const weatherScope = form.getAll('slot_weather_map_scope').map((v) => String(v).trim());
	const weatherBySlotId = new Map<
		string,
		{
			terytPowiat?: string;
			mapCenter?: { lat: number; lon: number };
			mapZoom?: number;
			showMap?: boolean;
			mapScopePowiaty?: string[];
		}
	>();

	for (let i = 0; i < weatherIds.length; i++) {
		const weatherId = weatherIds[i];
		if (!weatherId) continue;
		const entry: {
			terytPowiat?: string;
			mapCenter?: { lat: number; lon: number };
			mapZoom?: number;
			showMap?: boolean;
			mapScopePowiaty?: string[];
		} = {};
		if (weatherTeryt[i]) entry.terytPowiat = weatherTeryt[i];
		const lat = Number(String(weatherLat[i] ?? '').trim());
		const lon = Number(String(weatherLon[i] ?? '').trim());
		if (Number.isFinite(lat) && Number.isFinite(lon)) entry.mapCenter = { lat, lon };
		const zoom = Number(String(weatherZoom[i] ?? '').trim());
		if (Number.isFinite(zoom) && zoom > 0) entry.mapZoom = Math.floor(zoom);
		if (form.get(`slot_weather_show_map_${weatherId}`) !== 'on') entry.showMap = false;
		if (weatherScope[i]) {
			entry.mapScopePowiaty = weatherScope[i]
				.split(',')
				.map((c) => c.trim())
				.filter(Boolean);
		}
		weatherBySlotId.set(weatherId, entry);
	}

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

		const widget: DisplaySlot['widget'] = {};
		if (titles[i]) widget.title = titles[i];
		if (sectionTitles[i]) widget.sectionTitle = sectionTitles[i];
		const limit = parseIntField(limits[i] ?? null);
		if (limit) widget.limit = limit;
		if (emptyTexts[i]) widget.emptyText = emptyTexts[i];
		if (moreLinks[i]) widget.moreLink = moreLinks[i];
		if (variants[i] === 'alert' || variants[i] === 'default') widget.variant = variants[i];
		const order = parseOrderField(orders[i] ?? null);
		widget.order = order ?? (i + 1) * 10;
		if (form.get(`slot_enabled_${id}`) !== 'on') widget.enabled = false;
		if (certFilters[i]) widget.categoryFilter = certFilters[i];

		if (component === 'sidebar.banner') {
			widget.style = bannerStyles[i] === 'text' ? 'text' : 'image';
			if (bannerImageUrls[i]) widget.imageUrl = bannerImageUrls[i];
			if (bannerImageVariants[i] === 'blue') widget.imageVariant = 'blue';
			if (bannerTextTitles[i]) widget.textTitle = bannerTextTitles[i];
			if (bannerTextButtons[i]) widget.textButton = bannerTextButtons[i];
			const linkType = bannerLinkTypes[i];
			if (linkType === 'category' || linkType === 'page' || linkType === 'external') {
				widget.linkType = linkType;
			}
			if (widget.linkType === 'category' && bannerCategorySlugs[i]) {
				widget.categorySlug = bannerCategorySlugs[i];
			}
			if (widget.linkType === 'page' && bannerPagePaths[i]) widget.pagePath = bannerPagePaths[i];
			if (widget.linkType === 'external' && bannerExternalUrls[i]) {
				widget.externalUrl = bannerExternalUrls[i];
			}
			if (!validateBannerWidget(widget, label)) continue;
		}

		const weather = weatherBySlotId.get(id);
		if (weather?.terytPowiat) widget.terytPowiat = weather.terytPowiat;
		if (weather?.mapCenter) widget.mapCenter = weather.mapCenter;
		if (weather?.mapZoom) widget.mapZoom = weather.mapZoom;
		if (weather?.showMap === false) widget.showMap = false;
		if (weather?.mapScopePowiaty?.length) widget.mapScopePowiaty = weather.mapScopePowiaty;

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
