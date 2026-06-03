export type ContentLayout = 'flat' | 'folder';

export function parseContentLayout(config: Record<string, unknown>): ContentLayout {
	return config.content_layout === 'folder' ? 'folder' : 'flat';
}
