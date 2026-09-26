import { COULOMB_CONSTANT, electrostaticVisualizationDefaults } from './constants';
import { sampleElectricField } from './ElectricField';
import type {
    CartesianCoordinates,
    ElectrostaticCharge,
    ElectrostaticDistanceGuide,
    ElectrostaticForceVector,
    ElectrostaticVisualization,
    ElectricFieldSample,
} from './types';

interface ElectrostaticVisualizationCalculatorOptions {
    fieldGridSize?: number;
    fieldGridDivisions?: number;
    minimumDistance?: number;
    minimumFieldMagnitude?: number;
}

type Vector = [number, number, number];

function subtract(first: CartesianCoordinates, second: CartesianCoordinates): Vector {
    return [first[0] - second[0], first[1] - second[1], first[2] - second[2]];
}

function length(vector: CartesianCoordinates): number {
    return Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);
}

function normalize(vector: CartesianCoordinates): Vector {
    const magnitude = length(vector);

    if (magnitude === 0) {
        return [0, 0, 0];
    }

    return [vector[0] / magnitude, vector[1] / magnitude, vector[2] / magnitude];
}

function negate(vector: CartesianCoordinates): Vector {
    return [-vector[0], -vector[1], -vector[2]];
}

function coordinatesOf(position: CartesianCoordinates): Vector {
    return [position[0], position[1], position[2]];
}

export class ElectrostaticVisualizationCalculator {
    private readonly fieldGridSize: number;
    private readonly fieldGridDivisions: number;
    private readonly minimumDistance: number;
    private readonly minimumFieldMagnitude: number;

    public constructor(options: ElectrostaticVisualizationCalculatorOptions = {}) {
        this.fieldGridSize = options.fieldGridSize
            ?? electrostaticVisualizationDefaults.fieldGridSize;
        this.fieldGridDivisions = options.fieldGridDivisions
            ?? electrostaticVisualizationDefaults.fieldGridDivisions;
        this.minimumDistance = options.minimumDistance
            ?? electrostaticVisualizationDefaults.minimumDistance;
        this.minimumFieldMagnitude = options.minimumFieldMagnitude
            ?? electrostaticVisualizationDefaults.minimumFieldMagnitude;
    }

    public calculate(charges: readonly ElectrostaticCharge[], includeField = true): ElectrostaticVisualization {
        return {
            electricField: includeField ? this.calculateElectricField(charges) : [],
            forceVectors: this.calculateForceVectors(charges),
            distanceGuides: this.calculateDistanceGuides(charges),
        };
    }

    private calculateElectricField(
        charges: readonly ElectrostaticCharge[],
    ): ElectricFieldSample[] {
        const samples: ElectricFieldSample[] = [];
        const spacing = (this.fieldGridSize * 2) / this.fieldGridDivisions;

            for (let row = 0; row <= this.fieldGridDivisions; row += 1) {
                for (let column = 0; column <= this.fieldGridDivisions; column += 1) {
                    const point: Vector = [
                        -this.fieldGridSize + column * spacing,
                        0,
                        -this.fieldGridSize + row * spacing,
                    ];
                    const sample = sampleElectricField(point, charges, this.minimumDistance);

                    if (sample.status !== 'valid' || sample.magnitude < this.minimumFieldMagnitude) {
                        continue;
                    }

                    samples.push({
                        origin: point,
                        direction: sample.direction,
                        vector: sample.vector,
                        magnitude: sample.magnitude,
                    });
                }
            }
        return samples;
    }

    private calculateForceVectors(
        charges: readonly ElectrostaticCharge[],
    ): ElectrostaticForceVector[] {
        const vectors: ElectrostaticForceVector[] = [];

        for (let firstIndex = 0; firstIndex < charges.length; firstIndex += 1) {
            for (let secondIndex = firstIndex + 1; secondIndex < charges.length; secondIndex += 1) {
                const firstCharge = charges[firstIndex];
                const secondCharge = charges[secondIndex];
                const offset = subtract(secondCharge.position, firstCharge.position);
                const distance = length(offset);
                const chargeProduct = firstCharge.value * secondCharge.value;

                if (distance < this.minimumDistance || chargeProduct === 0) {
                    continue;
                }

                const directionToSecond = normalize(offset);
                const firstDirection = chargeProduct > 0
                    ? negate(directionToSecond)
                    : directionToSecond;
                const secondDirection = negate(firstDirection);
                const magnitude = COULOMB_CONSTANT * Math.abs(chargeProduct) / distance ** 2;

                vectors.push(
                    {
                        chargeId: firstCharge.id,
                        origin: coordinatesOf(firstCharge.position),
                        direction: firstDirection,
                        magnitude,
                    },
                    {
                        chargeId: secondCharge.id,
                        origin: coordinatesOf(secondCharge.position),
                        direction: secondDirection,
                        magnitude,
                    },
                );
            }
        }

        return vectors;
    }

    private calculateDistanceGuides(
        charges: readonly ElectrostaticCharge[],
    ): ElectrostaticDistanceGuide[] {
        const guides: ElectrostaticDistanceGuide[] = [];

        for (let firstIndex = 0; firstIndex < charges.length; firstIndex += 1) {
            for (let secondIndex = firstIndex + 1; secondIndex < charges.length; secondIndex += 1) {
                const firstCharge = charges[firstIndex];
                const secondCharge = charges[secondIndex];
                const distance = length(subtract(secondCharge.position, firstCharge.position));

                if (distance < this.minimumDistance) {
                    continue;
                }

                guides.push({
                    firstChargeId: firstCharge.id,
                    secondChargeId: secondCharge.id,
                    start: coordinatesOf(firstCharge.position),
                    end: coordinatesOf(secondCharge.position),
                    distance,
                });
            }
        }

        return guides;
    }
}
