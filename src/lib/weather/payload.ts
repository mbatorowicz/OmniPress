import type { WeatherWarningsFile } from './types';

export function buildWeatherWarningsPayload(file: WeatherWarningsFile): string {
	return `${JSON.stringify(file, null, '\t')}\n`;
}
