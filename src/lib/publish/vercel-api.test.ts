import { describe, expect, it } from 'vitest';
import {
	extractBuildFailureFromEvents,
	isDeploymentTerminal,
	parseVercelConfig,
} from './vercel-api';

describe('parseVercelConfig', () => {
	it('zwraca null bez project id', () => {
		expect(parseVercelConfig({})).toBeNull();
	});

	it('parsuje project i team', () => {
		expect(
			parseVercelConfig({ vercel_project_id: 'prj_abc', vercel_team_id: 'team_xyz' }),
		).toEqual({ projectId: 'prj_abc', teamId: 'team_xyz' });
	});
});

describe('extractBuildFailureFromEvents', () => {
	it('wyciąga linie błędu ze stderr', () => {
		const msg = extractBuildFailureFromEvents([
			{ type: 'stdout', payload: { text: 'Running build' } },
			{
				type: 'stderr',
				payload: { text: 'Expected ";" but found "ParsedAstroPost"' },
			},
		]);
		expect(msg).toContain('Expected ";"');
	});

	it('bierze końcówkę logu gdy brak stderr', () => {
		const msg = extractBuildFailureFromEvents([
			{ payload: { text: 'line one' } },
			{ payload: { text: 'line two' } },
		]);
		expect(msg.length).toBeGreaterThan(0);
	});
});

describe('isDeploymentTerminal', () => {
	it('rozpoznaje stany końcowe', () => {
		expect(isDeploymentTerminal('READY')).toBe(true);
		expect(isDeploymentTerminal('ERROR')).toBe(true);
		expect(isDeploymentTerminal('BUILDING')).toBe(false);
	});
});
