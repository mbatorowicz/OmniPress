import type { SiteAstroLayout, SlotWidgetConfig } from './types';
import { validateFooterLinks } from './validate-footer';
import { validateNavigationLinks, type NavValidationIssue } from './validate-nav';

export function findFooterMainWidget(layout: SiteAstroLayout): SlotWidgetConfig | undefined {
	return layout.zones.footer.components.find((slot) => slot.component === 'footer.main')?.widget;
}

/** Menu + stopka — te same known paths, bez self-checku (P0-9). */
export function validateLayoutPublicLinks(
	layout: SiteAstroLayout,
	knownInternalPaths: Set<string>,
): NavValidationIssue[] {
	return [
		...validateNavigationLinks(layout.navigation, knownInternalPaths),
		...validateFooterLinks(findFooterMainWidget(layout), knownInternalPaths),
	];
}
