import { describe, expect, it } from 'vitest';
import {
	classifyDocxMedia,
	galleryFilenameFromDocx,
	mimeForDocxMediaName,
	shouldDropDocxAfterUnpack,
} from './docx-media-model';

describe('mimeForDocxMediaName', () => {
	it('mapuje raster i wektor', () => {
		expect(mimeForDocxMediaName('image1.jpeg')).toBe('image/jpeg');
		expect(mimeForDocxMediaName('a.PNG')).toBe('image/png');
		expect(mimeForDocxMediaName('pieczec.emf')).toBe('image/x-emf');
		expect(mimeForDocxMediaName('x.bin')).toBeNull();
	});
});

describe('classifyDocxMedia', () => {
	it('duże JPEG to grafika treści — także szerokie logo, nie podpis', () => {
		expect(
			classifyDocxMedia({
				name: 'image1.jpeg',
				mime: 'image/jpeg',
				byteLength: 73_000,
				width: 1200,
				height: 400,
			}),
		).toBe('content');
		expect(
			classifyDocxMedia({
				name: 'logo.jpeg',
				mime: 'image/jpeg',
				byteLength: 73_000,
				width: 1400,
				height: 160,
			}),
		).toBe('content');
	});

	it('EMF, mały kwadrat i szeroki pasek to pieczęć / podpis', () => {
		expect(
			classifyDocxMedia({
				name: 'image2.emf',
				mime: 'image/x-emf',
				byteLength: 4000,
				width: 0,
				height: 0,
			}),
		).toBe('vector');
		expect(
			classifyDocxMedia({
				name: 'stamp.png',
				mime: 'image/png',
				byteLength: 20_000,
				width: 220,
				height: 220,
			}),
		).toBe('stamp');
		expect(
			classifyDocxMedia({
				name: 'sig.png',
				mime: 'image/png',
				byteLength: 15_000,
				width: 400,
				height: 80,
			}),
		).toBe('signature');
	});
});

describe('shouldDropDocxAfterUnpack', () => {
	it('zostawia DOCX przy pieczęci, zdejmuje gdy sama grafika', () => {
		expect(shouldDropDocxAfterUnpack(['content'])).toBe(true);
		expect(shouldDropDocxAfterUnpack(['content', 'stamp'])).toBe(false);
		expect(shouldDropDocxAfterUnpack(['tiny'])).toBe(false);
	});
});

describe('galleryFilenameFromDocx', () => {
	it('pierwsza grafika bierze nazwę DOCX', () => {
		expect(galleryFilenameFromDocx('inf. WFOŚ.docx', 0, 'image/webp')).toBe('inf. WFOŚ.webp');
		expect(galleryFilenameFromDocx('pismo.docx', 1, 'image/jpeg')).toBe('pismo-2.jpg');
	});
});
