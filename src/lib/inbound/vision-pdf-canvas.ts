import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';

export type VisionPdfCanvasPair = {
	canvas: Canvas;
	context: SKRSContext2D;
};

/** Fabryka canvasu dla pdf.js w Node (Gateway nie przyjmuje native PDF). */
export class VisionPdfCanvasFactory {
	create(width: number, height: number): VisionPdfCanvasPair {
		const canvas = createCanvas(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)));
		return { canvas, context: canvas.getContext('2d') };
	}

	reset(pair: VisionPdfCanvasPair, width: number, height: number): void {
		pair.canvas.width = Math.max(1, Math.ceil(width));
		pair.canvas.height = Math.max(1, Math.ceil(height));
	}

	destroy(pair: VisionPdfCanvasPair): void {
		pair.canvas.width = 0;
		pair.canvas.height = 0;
	}
}
