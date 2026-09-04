import { tryLayoutEditorActionStatus, tryLayoutEditorErrorStatus } from './layout-editor-status-flash';
import {
	buildLayoutEditorIdleStatus,
	tryLayoutEditorNavMissingHref,
} from './layout-editor-status-draft';
import {
	layoutEditorStatusDates,
	type LayoutEditorStatusInput,
	type LayoutEditorStatusMessages,
	type LayoutEditorStatusView,
} from './layout-editor-status-types';

export function buildLayoutEditorStatus(
	input: LayoutEditorStatusInput,
	messages: LayoutEditorStatusMessages,
): LayoutEditorStatusView {
	const dates = layoutEditorStatusDates(input, messages);
	return (
		tryLayoutEditorErrorStatus(input) ??
		tryLayoutEditorNavMissingHref(input, messages, dates) ??
		tryLayoutEditorActionStatus(input, messages, dates) ??
		buildLayoutEditorIdleStatus(input, messages, dates)
	);
}
