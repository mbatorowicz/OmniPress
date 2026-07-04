/** Id formularzy edytora komponentów — pola dialogów poza `<form>` używają atrybutu `form`. */

export const UNIT_COMPONENTS_FORM_ID = 'unit-components-form';
export const ZONE_COMPONENTS_FORM_ID = 'zone-components-form';

export function slotFormAttr(formId: string | undefined): string {
	return formId ? ` form="${formId}"` : '';
}
