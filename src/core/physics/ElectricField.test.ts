import { describe, expect, it } from 'vitest';
import { sampleElectricField } from './ElectricField';
import { COULOMB_CONSTANT } from './constants';
import type { ElectrostaticCharge } from './types';

const charge = (id: string, x: number, value = 1e-6): ElectrostaticCharge =>
    ({ id, value, position: [x, 0, 0] });

describe('electric field in SI units', () => {
    it('obeys Coulomb and inverse square laws for both signs', () => {
        const positive = sampleElectricField([1, 0, 0], [charge('q', 0)]);
        expect(positive.vector[0]).toBeCloseTo(8987.5517923, 6);
        expect(sampleElectricField([2, 0, 0], [charge('q', 0)]).magnitude).toBeCloseTo(positive.magnitude / 4);
        expect(sampleElectricField([1, 0, 0], [charge('q', 0, -1e-6)]).direction).toEqual([-1, 0, 0]);
    });
    it('cancels between equal charges and reinforces between opposite charges', () => {
        expect(sampleElectricField([0, 0, 0], [charge('a', -2), charge('b', 2)]).magnitude).toBe(0);
        const dipole = sampleElectricField([0, 0, 0], [charge('a', -2), charge('b', 2, -1e-6)]);
        expect(dipole.vector[0]).toBeCloseTo(COULOMB_CONSTANT * 1e-6 / 2);
        expect(dipole.vector[1]).toBe(0);
    });
    it('sums every contribution, including non-coplanar sources', () => {
        const reading = sampleElectricField([0, 1, 2], [charge('a', -2), charge('b', 2, -3e-6), charge('c', 3)]);
        for (let axis = 0; axis < 3; axis++) {
            expect(reading.vector[axis]).toBeCloseTo(reading.contributions.reduce((sum, item) => sum + item.vector[axis], 0));
        }
    });
    it('excludes charge interiors instead of inventing capped readings', () => {
        const reading = sampleElectricField([0, 0, 0], [charge('a', 0)]);
        expect(reading.status).toBe('excluded');
        expect(reading.excludedChargeIds).toEqual(['a']);
        expect(reading.contributions).toEqual([]);
        expect(sampleElectricField([Infinity, 0, 0], []).status).toBe('invalid');
        expect(sampleElectricField([1, 0, 0], []).magnitude).toBe(0);
    });
});
