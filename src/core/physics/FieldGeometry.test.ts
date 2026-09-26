import { describe, expect, it } from 'vitest';
import { generateFieldGeometry } from './FieldGeometry';
import type { FieldSamplingOptions } from './fieldVisualizationTypes';
import type { ElectrostaticCharge } from './types';

const options: FieldSamplingOptions = { space: 'plane', plane: 'xz', offset: 0, density: 'low', lines: true, vectors: true };
const calculate = (charges: ElectrostaticCharge[], overrides: Partial<FieldSamplingOptions> = {}) => {
    const iterator = generateFieldGeometry({ revision: 1, charges, options: { ...options, ...overrides }, cutoff: 0.2 });
    let result = iterator.next();
    while (!result.done) result = iterator.next();
    return result.value;
};
const positive: ElectrostaticCharge = { id: 'positive', value: 1e-6, position: [-1, 0, 0] };
const negative: ElectrostaticCharge = { id: 'negative', value: -1e-6, position: [1, 0, 0] };

describe('field geometry', () => {
    it('connects dipole lines in the physical direction without duplicate reverse connections', () => {
        const result = calculate([positive, negative]);
        const connections = result.lines.filter(line => line.endChargeId === negative.id && line.startChargeId === positive.id);
        expect(connections.length).toBeGreaterThan(5);
        expect(result.lines.every(line => line.points.every(point => point.every(Number.isFinite)))).toBe(true);
        expect(result.lines.every(line => line.points.every(point => point[1] === 0))).toBe(true);
    });
    it('draws incoming lines for negative-only scenes and samples in volume', () => {
        const result = calculate([negative], { space: 'volume' });
        expect(result.lines.length).toBeGreaterThan(0);
        expect(result.lines.every(line => line.endChargeId === negative.id)).toBe(true);
        expect(new Set(result.samples.map(sample => sample.origin[1])).size).toBeGreaterThan(2);
    });
    it('connects to the actual negative charge when it is outside the displayed plane', () => {
        const elevatedNegative: ElectrostaticCharge = { ...negative, position: [1, 0.6, 1] };
        const result = calculate([positive, elevatedNegative]);
        const connections = result.lines.filter(line => line.startChargeId === positive.id && line.endChargeId === negative.id);
        expect(connections.length).toBeGreaterThan(3);
        for (const line of connections) {
            const last = line.points[line.points.length - 1];
            expect(Math.hypot(...last.map((value, axis) => value - elevatedNegative.position[axis]))).toBeLessThan(0.26);
            expect(line.startAnchor).toEqual(positive.position);
            expect(line.endAnchor).toEqual(elevatedNegative.position);
        }
    });
    it('marks projected cuts and follows charges beyond the old fixed grid', () => {
        const result = calculate([{ ...positive, position: [25, 3, 0] }], { lines: false });
        expect(result.projected).toBe(true);
        expect(result.domain.center[0]).toBe(25);
        expect(result.samples.every(sample => sample.vector[1] === 0)).toBe(true);
        expect(calculate([]).lines).toHaveLength(0);
    });
});
