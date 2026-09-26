import { describe, expect, it } from 'vitest';
import { calculateInteractionsBetweenAllChargePairs } from './ElectrostaticInteractions';
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

describe('electrostatic interactions', () => {
    it('repels like-signed charges with equal and opposite forces', () => {
        const result = calculateInteractionsBetweenAllChargePairs([pointCharge('a', 0), pointCharge('b', 1)]);

        expect(result.forceContributions[0].forceMagnitudeNewtons).toBeCloseTo(0.0089875517923, 10);
        expect(result.forceContributions[0].forceVectorNewtons[0]).toBeLessThan(0);
        expect(result.forceContributions[1].forceVectorNewtons[0]).toBeGreaterThan(0);
        expect(result.forceContributions[0].forceVectorNewtons[0]
            + result.forceContributions[1].forceVectorNewtons[0]).toBeCloseTo(0);
    });

    it('attracts opposite charges and repels charges with the same sign', () => {
        const result = calculateInteractionsBetweenAllChargePairs([
            pointCharge('positive', 0, 1e-6),
            pointCharge('negative', 1, -1e-6),
        ]);

        expect(result.forceContributions[0].forceVectorNewtons[0]).toBeGreaterThan(0);
        expect(result.forceContributions[1].forceVectorNewtons[0]).toBeLessThan(0);
    });

    it('returns physical pair distances without view geometry', () => {
        const result = calculateInteractionsBetweenAllChargePairs([pointCharge('a', -2), pointCharge('b', 1)]);

        expect(result.pairDistances).toEqual([
            { firstChargeId: 'a', secondChargeId: 'b', distanceMeters: 3 },
        ]);
    });

    it('calculates the Coulomb force for close but distinct point charges', () => {
        const result = calculateInteractionsBetweenAllChargePairs([
            pointCharge('a', 0),
            pointCharge('b', 0.1),
        ]);

        expect(result.forceContributions[0].forceMagnitudeNewtons)
            .toBeCloseTo(8.9875517923e9 * 1e-12 / 0.1 ** 2);
    });
});
