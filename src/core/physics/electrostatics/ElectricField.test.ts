import { describe, expect, it } from 'vitest';
import { readElectricFieldAtPoint } from './ElectricField';
import { COULOMB_CONSTANT } from './constants';
import type { ElectrostaticCharge } from './types';

const pointCharge = (
    id: string,
    positionXMeters: number,
    chargeInCoulombs = 1e-6,
): ElectrostaticCharge => ({
    id,
    chargeInCoulombs,
    positionInMeters: [positionXMeters, 0, 0],
});

describe('electric field in SI units', () => {
    it('obeys Coulomb and inverse square laws for both signs', () => {
        const positive = readElectricFieldAtPoint([1, 0, 0], [pointCharge('q', 0)]);
        expect(positive?.electricFieldVector[0]).toBeCloseTo(8987.5517923, 6);
        expect(readElectricFieldAtPoint([2, 0, 0], [pointCharge('q', 0)])?.fieldStrengthNewtonsPerCoulomb)
            .toBeCloseTo((positive?.fieldStrengthNewtonsPerCoulomb ?? 0) / 4);
        expect(readElectricFieldAtPoint([1, 0, 0], [pointCharge('q', 0, -1e-6)])?.unitDirection).toEqual([-1, 0, 0]);
    });
    it('uses the point-charge law at every non-singular distance, without a display-radius cutoff', () => {
        const reading = readElectricFieldAtPoint([0.1, 0, 0], [pointCharge('q', 0)]);

        expect(reading?.fieldStrengthNewtonsPerCoulomb).toBeCloseTo(COULOMB_CONSTANT * 1e-6 / 0.1 ** 2);
    });
    it('cancels between equal charges and reinforces between opposite charges', () => {
        expect(readElectricFieldAtPoint([0, 0, 0], [pointCharge('a', -2), pointCharge('b', 2)])?.fieldStrengthNewtonsPerCoulomb).toBe(0);
        const dipole = readElectricFieldAtPoint([0, 0, 0], [pointCharge('a', -2), pointCharge('b', 2, -1e-6)]);
        expect(dipole?.electricFieldVector[0]).toBeCloseTo(COULOMB_CONSTANT * 1e-6 / 2);
        expect(dipole?.electricFieldVector[1]).toBe(0);
    });
    it('sums every contribution, including non-coplanar sources', () => {
        const reading = readElectricFieldAtPoint([0, 1, 2], [pointCharge('a', -2), pointCharge('b', 2, -3e-6), pointCharge('c', 3)]);
        expect(reading).not.toBeNull();
        if (!reading) return;
        for (let coordinateIndex = 0; coordinateIndex < 3; coordinateIndex += 1) {
            expect(reading.electricFieldVector[coordinateIndex]).toBeCloseTo(reading.contributions.reduce(
                (sum, contribution) => sum + contribution.electricFieldVector[coordinateIndex], 0,
            ));
        }
    });
    it('is undefined at a point charge and zero when no source charges exist', () => {
        expect(readElectricFieldAtPoint([0, 0, 0], [pointCharge('a', 0)])).toBeNull();
        expect(readElectricFieldAtPoint([Infinity, 0, 0], [])).toBeNull();
        expect(readElectricFieldAtPoint([1, 0, 0], [])?.fieldStrengthNewtonsPerCoulomb).toBe(0);
        expect(readElectricFieldAtPoint([0, 0, 0], [pointCharge('zero', 0, 0)])?.fieldStrengthNewtonsPerCoulomb).toBe(0);
    });
});
