import { COULOMB_CONSTANT } from './constants';
import type {
    ElectrostaticCharge,
    ElectrostaticForceContribution,
    ElectrostaticPairDistance,
} from './types';
import {
    distanceBetween,
    normalize as unitVectorInDirectionOf,
    scale as multiplyVectorByScalar,
    subtract,
} from '../../../math/vectorMath';

export interface InteractionBetweenTwoCharges {
    pairDistance: ElectrostaticPairDistance;
    forceContributions: ElectrostaticForceContribution[];
}

/** |F| = k|q₁q₂|/r²; equal signs repel, opposite signs attract, and F₂ = −F₁. */
export function calculateCoulombInteraction(
    firstCharge: ElectrostaticCharge,
    secondCharge: ElectrostaticCharge,
): InteractionBetweenTwoCharges {
    const vectorFromFirstChargeToSecond = subtract(
        secondCharge.positionInMeters,
        firstCharge.positionInMeters,
    );
    const distanceBetweenChargesInMeters = distanceBetween(
        firstCharge.positionInMeters,
        secondCharge.positionInMeters,
    );
    const chargesHaveSameSign = firstCharge.chargeInCoulombs * secondCharge.chargeInCoulombs > 0;
    const pairDistance = {
        firstChargeId: firstCharge.id,
        secondChargeId: secondCharge.id,
        distanceMeters: distanceBetweenChargesInMeters,
    };

    if (distanceBetweenChargesInMeters === 0
        || firstCharge.chargeInCoulombs === 0
        || secondCharge.chargeInCoulombs === 0) {
        return { pairDistance, forceContributions: [] };
    }

    const forceMagnitudeInNewtons = COULOMB_CONSTANT
        * Math.abs(firstCharge.chargeInCoulombs)
        * Math.abs(secondCharge.chargeInCoulombs)
        / distanceBetweenChargesInMeters ** 2;
    const directionFromFirstChargeToSecond = unitVectorInDirectionOf(vectorFromFirstChargeToSecond);
    const directionOfForceOnFirstCharge = chargesHaveSameSign
        ? multiplyVectorByScalar(directionFromFirstChargeToSecond, -1)
        : directionFromFirstChargeToSecond;
    const forceOnFirstChargeInNewtons = multiplyVectorByScalar(directionOfForceOnFirstCharge, forceMagnitudeInNewtons);
    const forceOnSecondChargeInNewtons = multiplyVectorByScalar(forceOnFirstChargeInNewtons, -1);

    return {
        pairDistance,
        forceContributions: [
            {
                chargeId: firstCharge.id,
                causedByChargeId: secondCharge.id,
                forceVectorNewtons: forceOnFirstChargeInNewtons,
                forceMagnitudeNewtons: forceMagnitudeInNewtons,
            },
            {
                chargeId: secondCharge.id,
                causedByChargeId: firstCharge.id,
                forceVectorNewtons: forceOnSecondChargeInNewtons,
                forceMagnitudeNewtons: forceMagnitudeInNewtons,
            },
        ],
    };
}
