import { calculateCoulombInteraction } from './CoulombLaw';
import type { ElectrostaticCharge, ElectrostaticInteractionResults } from './types';

export function calculateInteractionsBetweenAllChargePairs(
    charges: readonly ElectrostaticCharge[],
): ElectrostaticInteractionResults {
    const interactions: ElectrostaticInteractionResults = {
        forceContributions: [],
        pairDistances: [],
    };

    for (let firstChargeIndex = 0; firstChargeIndex < charges.length; firstChargeIndex += 1) {
        const firstCharge = charges[firstChargeIndex];

        for (let secondChargeIndex = firstChargeIndex + 1; secondChargeIndex < charges.length; secondChargeIndex += 1) {
            const secondCharge = charges[secondChargeIndex];
            const interactionBetweenThisPair = calculateCoulombInteraction(firstCharge, secondCharge);

            interactions.pairDistances.push(interactionBetweenThisPair.pairDistance);
            interactions.forceContributions.push(...interactionBetweenThisPair.forceContributions);
        }
    }

    return interactions;
}
