function isElementLike(target: unknown): target is Element {
	return (
		typeof target === 'object' &&
		target !== null &&
		'nodeType' in target &&
		(target as Node).nodeType === 1 &&
		'closest' in target &&
		typeof (target as Element).closest === 'function'
	);
}

/** Cel zdarzenia DOM (HTML, SVG itd.) — nie używaj `instanceof HTMLElement` przy delegacji kliknięć. */
export function eventTargetElement(event: Event): Element | null {
	const target = event.target;
	return isElementLike(target) ? target : null;
}
