import { describe, expect, it } from 'vitest';
import { filterTypedText, preparePlainTitle, stripEmoji } from './strip-emoji';

describe('stripEmoji', () => {
	it('usuwa ozdobne emoji, zostawia datę i polskie znaki', () => {
		expect(stripEmoji('📅 9 sierpnia 2026 r. (niedziela)')).toBe('9 sierpnia 2026 r. (niedziela)');
		expect(stripEmoji('🌱 ochrony powietrza,')).toBe('ochrony powietrza,');
		expect(stripEmoji('Łódź i Gdańsk')).toBe('Łódź i Gdańsk');
		expect(stripEmoji('  wcięcie bez emoji')).toBe('  wcięcie bez emoji');
	});

	it('usuwa ikony z listy Uczty Pierogowej', () => {
		expect(stripEmoji('💰 sposobów na zmniejszenie kosztów ogrzewania domu.')).toBe(
			'sposobów na zmniejszenie kosztów ogrzewania domu.',
		);
		expect(stripEmoji('☀ odnawialnych źródeł energii,')).toBe('odnawialnych źródeł energii,');
		expect(stripEmoji('🏡 efektywności energetycznej budynków,')).toBe(
			'efektywności energetycznej budynków,',
		);
		expect(stripEmoji('🔥 możliwości wymiany starych źródeł ciepła,')).toBe(
			'możliwości wymiany starych źródeł ciepła,',
		);
	});

	it('zostawia znaczniki załączników 📄 i 📎', () => {
		expect(stripEmoji('[📄 raport.pdf](./a.pdf)')).toBe('[📄 raport.pdf](./a.pdf)');
		expect(stripEmoji('[📎 wniosek.docx](./a.docx)')).toBe('[📎 wniosek.docx](./a.docx)');
		expect(stripEmoji('📅 [📄 plik.pdf](./a.pdf)')).toBe('[📄 plik.pdf](./a.pdf)');
	});
});

describe('filterTypedText', () => {
	it('przepuszcza zwykły tekst', () => {
		expect(filterTypedText('Miedzna')).toEqual({ text: 'Miedzna', handled: false });
	});

	it('usuwa samo emoji i przechwytuje wstawkę', () => {
		expect(filterTypedText('📅')).toEqual({ text: '', handled: true });
		expect(filterTypedText('📅 9 sierpnia')).toEqual({ text: '9 sierpnia', handled: true });
		expect(filterTypedText('💰')).toEqual({ text: '', handled: true });
	});
});

describe('preparePlainTitle', () => {
	it('zdejmuje emoji i obcina spacje', () => {
		expect(preparePlainTitle('  📅 Festyn  ')).toBe('Festyn');
		expect(preparePlainTitle('Spotkanie')).toBe('Spotkanie');
	});
});
