export type FlashVariant = 'success' | 'error' | 'warning' | 'info';

export interface FlashMessage {
	variant: FlashVariant;
	message: string;
	detail?: string;
}

export interface FlashQueryConfig {
	saved?: string;
	errorMap?: Record<string, string>;
	successMap?: Record<string, string>;
	extra?: (params: URLSearchParams) => FlashMessage[];
}

/** Mapuje parametry URL na komunikaty flash dla stron panelowych. */
export function parseQueryFlash(url: URL, config: FlashQueryConfig): FlashMessage[] {
	const messages: FlashMessage[] = [];
	const params = url.searchParams;

	if (params.get('saved') === '1' && config.saved) {
		messages.push({ variant: 'success', message: config.saved });
	}

	const errorCode = params.get('error');
	if (errorCode && config.errorMap?.[errorCode]) {
		messages.push({ variant: 'error', message: config.errorMap[errorCode] });
	}

	const successCode = params.get('success');
	if (successCode && config.successMap?.[successCode]) {
		messages.push({ variant: 'success', message: config.successMap[successCode] });
	}

	if (config.extra) {
		messages.push(...config.extra(params));
	}

	return messages;
}
