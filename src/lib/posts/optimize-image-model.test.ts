import { describe, expect, it } from 'vitest';
import {
	fitInside,
	replaceStorageExtension,
	shouldOptimizeImage,
} from './optimize-image-model';

describe('shouldOptimizeImage', () => {
	it('bierze JPEG/PNG/WebP, pomija GIF i PDF', () => {
		expect(shouldOptimizeImage('image/jpeg')).toBe(true);
		expect(shouldOptimizeImage('image/png')).toBe(true);
		expect(shouldOptimizeImage('image/webp')).toBe(true);
		expect(shouldOptimizeImage('image/gif')).toBe(false);
		expect(shouldOptimizeImage('application/pdf')).toBe(false);
	});
});

describe('fitInside', () => {
	it('nie powiększa małych kadrów', () => {
		expect(fitInside(800, 600, 1920)).toEqual({ width: 800, height: 600 });
	});

	it('skaluje dłuższy bok do limitu', () => {
		expect(fitInside(4000, 3000, 1920)).toEqual({ width: 1920, height: 1440 });
		expect(fitInside(3000, 4000, 1920)).toEqual({ width: 1440, height: 1920 });
	});
});

describe('replaceStorageExtension', () => {
	it('zamienia rozszerzenie w ścieżce UUID', () => {
		expect(replaceStorageExtension('post-1/abc.jpg', 'webp')).toBe('post-1/abc.webp');
		expect(replaceStorageExtension('post-1/abc.webp', 'webp')).toBe('post-1/abc.webp');
	});
});
