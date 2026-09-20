import { describe, expect, it } from 'vitest';
import { buildLayoutSlotsClientScriptVars, layoutSlotsVarsToClientConfig } from './layout-slots-client-vars';
import { toInlineJson } from '@/lib/ui/inline-json';

describe('layout slots client vars', () => {
	it('dają się wstawić do script type=application/json', () => {
		const vars = buildLayoutSlotsClientScriptVars('<option value="home.pinned">Pinned</option>');
		expect(() => JSON.parse(toInlineJson(vars))).not.toThrow();
		const config = layoutSlotsVarsToClientConfig(vars, 'zone-components-form-home');
		expect(config.formId).toBe('zone-components-form-home');
		expect(config.componentOptionsHtml).toContain('home.pinned');
	});
});
