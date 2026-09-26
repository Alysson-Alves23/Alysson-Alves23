import { COULOMB_CONSTANT, electrostaticCalculationDefaults } from './constants';
import type {
    ElectrostaticCharge,
    ElectrostaticForceContribution,
    ElectrostaticInteractionResults,
    ElectrostaticPairDistance,
} from './types';
import { magnitude, normalize, scale, subtract } from '../../math/vectorMath';

interface ElectrostaticInteractionCalculatorOptions {
    minimumDistance?: number;
}

export class ElectrostaticInteractionCalculator {
    private readonly minimumDistance: number;

    public constructor(options: ElectrostaticInteractionCalculatorOptions = {}) {
        this.minimumDistance = options.minimumDistance
            ?? electrostaticCalculationDefaults.minimumDistance;
    }

    public calculate(charges: readonly ElectrostaticCharge[]): ElectrostaticInteractionResults {
        return {
            forceContributions: this.calculateForceContributions(charges),
            pairDistances: this.calculatePairDistances(charges),
        };
    }

    private calculateForceContributions(
        charges: readonly ElectrostaticCharge[],
    ): ElectrostaticForceContribution[] {
        const contributions: ElectrostaticForceContribution[] = [];

        for (let firstIndex = 0; firstIndex < charges.length; firstIndex += 1) {
            for (let secondIndex = firstIndex + 1; secondIndex < charges.length; secondIndex += 1) {
                const firstCharge = charges[firstIndex];
                const secondCharge = charges[secondIndex];
                const offset = subtract(secondCharge.position, firstCharge.position);
                const distance = magnitude(offset);
                const chargeProduct = firstCharge.value * secondCharge.value;

                if (distance < this.minimumDistance || chargeProduct === 0) {
                    continue;
                }

                const directionToSecond = normalize(offset);
                const firstDirection = scale(directionToSecond, chargeProduct > 0 ? -1 : 1);
                const forceMagnitude = COULOMB_CONSTANT * Math.abs(chargeProduct) / distance ** 2;
                const firstForce = scale(firstDirection, forceMagnitude);

                contributions.push(
                    {
                        chargeId: firstCharge.id,
                        vector: firstForce,
                        magnitude: forceMagnitude,
                    },
                    {
                        chargeId: secondCharge.id,
                        vector: scale(firstForce, -1),
                        magnitude: forceMagnitude,
                    },
                );
            }
        }

        return contributions;
    }

    private calculatePairDistances(
        charges: readonly ElectrostaticCharge[],
    ): ElectrostaticPairDistance[] {
        const distances: ElectrostaticPairDistance[] = [];

        for (let firstIndex = 0; firstIndex < charges.length; firstIndex += 1) {
            for (let secondIndex = firstIndex + 1; secondIndex < charges.length; secondIndex += 1) {
                const firstCharge = charges[firstIndex];
                const secondCharge = charges[secondIndex];
                const distance = magnitude(subtract(secondCharge.position, firstCharge.position));
                distances.push({
                    firstChargeId: firstCharge.id,
                    secondChargeId: secondCharge.id,
                    distance,
                });
            }
        }

        return distances;
    }
}
