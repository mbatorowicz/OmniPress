import { iconSvg, type IconName } from '@/lib/ui/icons';

export type IconButtonVariant = 'iconDanger' | 'step' | 'toolbar';

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
	iconDanger: 'ui-btn--icon-danger',
	step: 'ui-btn--step',
	toolbar: 'ui-btn--toolbar',
};

function escapeAttr(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;');
}

export type IconButtonHtmlOptions = {
	variant: IconButtonVariant;
	ariaLabel: string;
	icon?: IconName;
	label?: string;
	disabled?: boolean;
	attrs?: Record<string, string>;
	className?: string;
};

/** Markup przycisku ikonowego — ten sam wzorzec co IconButton.astro (dla HTML z TS). */
export function iconButtonHtml(options: IconButtonHtmlOptions): string {
	const {
		variant,
		ariaLabel,
		icon = 'x',
		label,
		disabled = false,
		attrs = {},
		className = '',
	} = options;
	const dataAttrs = Object.entries(attrs)
		.map(([key, value]) => ` ${key}="${escapeAttr(value)}"`)
		.join('');
	const disabledAttr = disabled ? ' disabled' : '';
	const extraClass = className ? ` ${className}` : '';
	const inner = label ?? iconSvg(icon, variant === 'step' ? 14 : 16);
	return `<button type="button" class="ui-btn ${VARIANT_CLASS[variant]}${extraClass}" aria-label="${escapeAttr(ariaLabel)}"${dataAttrs}${disabledAttr}>${inner}</button>`;
}

export type StepButtonHtmlOptions = {
	ariaLabel: string;
	label: string;
	disabled?: boolean;
	attrs?: Record<string, string>;
	className?: string;
};

/** Przycisk strzałki (↑↓) w galerii i podglądzie layoutu. */
export function stepButtonHtml(options: StepButtonHtmlOptions): string {
	return iconButtonHtml({
		variant: 'step',
		ariaLabel: options.ariaLabel,
		label: options.label,
		disabled: options.disabled,
		attrs: options.attrs,
		className: options.className,
	});
}
