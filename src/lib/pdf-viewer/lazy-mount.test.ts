/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountWhenVisible } from './lazy-mount';

type Observed = {
	callback: IntersectionObserverCallback;
	targets: Element[];
	disconnected: boolean;
	options?: IntersectionObserverInit;
};

const original = globalThis.IntersectionObserver;

function stubObserver(): Observed[] {
	const created: Observed[] = [];
	class Stub {
		private readonly state: Observed;
		constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
			this.state = { callback, targets: [], disconnected: false, options };
			created.push(this.state);
		}
		observe(el: Element) {
			this.state.targets.push(el);
		}
		disconnect() {
			this.state.disconnected = true;
		}
		unobserve() {}
		takeRecords() {
			return [];
		}
	}
	globalThis.IntersectionObserver = Stub as unknown as typeof IntersectionObserver;
	return created;
}

function intersect(state: Observed, el: Element): void {
	state.callback(
		[{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry],
		{} as IntersectionObserver,
	);
}

afterEach(() => {
	globalThis.IntersectionObserver = original;
});

describe('mountWhenVisible', () => {
	it('nie montuje, dopóki element nie wejdzie w widok', () => {
		const created = stubObserver();
		const el = document.createElement('div');
		const mount = vi.fn();

		mountWhenVisible(el, mount);

		expect(mount).not.toHaveBeenCalled();
		expect(created[0]?.targets).toEqual([el]);
	});

	it('montuje po wejściu w widok i przestaje obserwować', () => {
		const created = stubObserver();
		const el = document.createElement('div');
		const mount = vi.fn();

		mountWhenVisible(el, mount);
		intersect(created[0]!, el);

		expect(mount).toHaveBeenCalledWith(el);
		expect(created[0]?.disconnected).toBe(true);
	});

	it('montuje tylko raz przy powtórnym przecięciu', () => {
		const created = stubObserver();
		const el = document.createElement('div');
		const mount = vi.fn();

		mountWhenVisible(el, mount);
		intersect(created[0]!, el);
		intersect(created[0]!, el);

		expect(mount).toHaveBeenCalledTimes(1);
	});

	it('startuje montaż z zapasem przed wejściem w widok', () => {
		const created = stubObserver();
		mountWhenVisible(document.createElement('div'), vi.fn());

		expect(created[0]?.options?.rootMargin).toBe('300px');
	});

	it('montuje od razu, gdy przeglądarka nie zna IntersectionObserver', () => {
		// @ts-expect-error — symulacja starszej przeglądarki
		globalThis.IntersectionObserver = undefined;
		const el = document.createElement('div');
		const mount = vi.fn();

		mountWhenVisible(el, mount);

		expect(mount).toHaveBeenCalledWith(el);
	});
});
