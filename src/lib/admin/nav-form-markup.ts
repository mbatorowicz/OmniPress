/** Markup nowej pozycji nawigacji dodawanej po stronie klienta (kafelek + panel edycji). */
import type { NavigationTableLabels } from './nav-form-labels';

let nextNavEntryId = 0;

/** Numeracja startuje od liczby pozycji wyrenderowanych przez serwer, żeby ID się nie powtarzały. */
export function resetNavEntryIds(startAt: number): void {
	nextNavEntryId = startAt;
}

function buildEditorPanelHtml(labels: NavigationTableLabels): string {
	const { hrefKinds, fieldLabels } = labels;
	return `
		<div class="nav-row-editor-panel">
			<div class="nav-row-editor-grid">
				<label class="nav-row-editor-field">
					<span class="nav-row-editor-label">${fieldLabels.navDepth}</span>
					<select name="nav_depth" class="ui-select-compact w-full nav-depth">
						<option value="0">${labels.depth0}</option>
						<option value="1">${labels.depth1}</option>
						<option value="2">${labels.depth2}</option>
					</select>
				</label>
				<div class="nav-row-editor-field">
					<span class="nav-row-editor-label">${fieldLabels.navParent}</span>
					<div class="nav-parent-cell ui-table-dense-td--wide">
						<span class="ui-muted text-xs nav-parent-root">${labels.navParentRoot}</span>
						<input type="hidden" name="nav_parent" class="nav-parent-submit" value="" />
					</div>
				</div>
				<label class="nav-row-editor-field nav-row-editor-field--wide">
					<span class="nav-row-editor-label">${fieldLabels.navLabel}</span>
					<input name="nav_label" required class="ui-input-compact w-full" />
				</label>
				<label class="nav-row-editor-field">
					<span class="nav-row-editor-label">${fieldLabels.navLinkType}</span>
					<input type="hidden" name="nav_href_kind" class="nav-href-kind-submit" value="none" />
					<select class="nav-href-kind ui-select-compact w-full">
						<option value="none">${hrefKinds.none}</option>
						<option value="category">${hrefKinds.category}</option>
						<option value="page">${hrefKinds.page}</option>
						<option value="static">${hrefKinds.static}</option>
						<option value="custom">${hrefKinds.custom}</option>
						<option value="external">${hrefKinds.external}</option>
					</select>
				</label>
				<label class="nav-row-editor-field nav-row-editor-field--wide">
					<span class="nav-row-editor-label">${fieldLabels.navLinkTarget}</span>
					<div class="nav-href-values">
						<input type="hidden" name="nav_href_value" class="nav-href-value-submit" value="" />
						<div class="nav-href-target-host"></div>
					</div>
				</label>
				<div class="nav-row-editor-field nav-row-editor-field--wide nav-dropdown-layout-field-wrap">
					<span class="nav-row-editor-label">${fieldLabels.navMenuColumns}</span>
					<div class="nav-dropdown-layout-cell">
						<input type="hidden" name="nav_menu_columns" class="nav-menu-columns-submit" value="1" />
						<input type="hidden" name="nav_menu_col_width_0" class="nav-menu-col-width-0-submit" value="" />
						<input type="hidden" name="nav_menu_col_width_1" class="nav-menu-col-width-1-submit" value="" />
						<div class="nav-dropdown-layout-grid">
							<label class="nav-dropdown-layout-field">
								<span class="nav-dropdown-layout-label">${fieldLabels.navMenuColumnCount}</span>
								<select class="nav-menu-columns ui-select-compact w-full">
									<option value="1">${labels.menuColumnOne}</option>
									<option value="2">${labels.menuColumnTwo}</option>
								</select>
							</label>
							<label class="nav-dropdown-layout-field">
								<span class="nav-dropdown-layout-label">${fieldLabels.navMenuColumnWidth1}</span>
								<input type="text" placeholder="np. 320px" class="nav-menu-col-width-0 ui-input-compact w-full" autocomplete="off" />
							</label>
							<label class="nav-dropdown-layout-field nav-menu-col-width-1-field hidden">
								<span class="nav-dropdown-layout-label">${fieldLabels.navMenuColumnWidth2}</span>
								<input type="text" placeholder="1fr" class="nav-menu-col-width-1 ui-input-compact w-full" autocomplete="off" />
							</label>
						</div>
						<p class="ui-hint mt-1 text-[10px] leading-tight">${labels.menuColumnsHint}</p>
					</div>
				</div>
			</div>
			<div class="nav-row-editor-footer">
				<button type="button" class="close-nav-row ui-btn ui-btn--ghost text-xs">${labels.closeEdit}</button>
			</div>
		</div>
	`;
}

export function createNavEntryElement(
	labels: NavigationTableLabels,
	openEditor: boolean,
): HTMLElement {
	const entryId = String(nextNavEntryId++);
	const entry = document.createElement('div');
	entry.className = 'nav-entry nav-row--depth-0';
	entry.dataset.navEntry = entryId;
	entry.innerHTML = `
		<div class="nav-tile nav-row-summary">
			<div class="nav-tile-main">
				<span class="nav-summary-label">—</span>
				<span class="nav-summary-sep" aria-hidden="true">·</span>
				<span class="nav-summary-link-text">${labels.hrefKinds.none}</span>
				<span class="nav-summary-layout">${labels.menuColumnOne}</span>
			</div>
			<div class="nav-tile-actions">
				<button type="button" class="edit-nav-row ui-btn ui-btn--link text-xs">${labels.edit}</button>
				<button type="button" class="add-nav-child ui-btn ui-btn--link text-xs">${labels.addNavChild}</button>
				<button type="button" class="remove-nav-row ui-btn ui-btn--link-danger text-xs">${labels.remove}</button>
			</div>
		</div>
		<div class="nav-row-editor${openEditor ? '' : ' hidden'}" data-nav-kind="none" data-nav-href="" data-nav-parent="">
			${buildEditorPanelHtml(labels)}
		</div>
	`;
	return entry;
}
