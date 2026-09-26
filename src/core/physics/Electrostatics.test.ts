import { describe, expect, it } from 'vitest';
import { ElectrostaticInteractionCalculator } from './Electrostatics';
import type { ElectrostaticCharge } from './types';

const charge = (id: string, x: number, value = 1e-6): ElectrostaticCharge =>
    ({ id, value, position: [x, 0, 0] });

describe('electrostatic interactions', () => {
    it('calculates equal and opposite Coulomb force contributions', () => {
        const result = new ElectrostaticInteractionCalculator().calculate([charge('a', 0), charge('b', 1)]);

        expect(result.forceContributions[0].magnitude).toBeCloseTo(0.0089875517923, 10);
        expect(result.forceContributions[0].vector[0]).toBeLessThan(0);
        expect(result.forceContributions[1].vector[0]).toBeGreaterThan(0);
        expect(result.forceContributions[0].vector[0] + result.forceContributions[1].vector[0]).toBeCloseTo(0);
    });

    it('returns physical pair distances without view geometry', () => {
        const result = new ElectrostaticInteractionCalculator().calculate([charge('a', -2), charge('b', 1)]);

        expect(result.pairDistances).toEqual([
            { firstChargeId: 'a', secondChargeId: 'b', distance: 3 },
        ]);
    });
});
