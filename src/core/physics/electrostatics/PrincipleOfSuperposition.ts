import type { CartesianCoordinates } from './types';
import { add as addVectors, type Vector3 } from '../../../math/vectorMath';

export function calculateVectorSumOfElectricFields(
    fieldContributions: readonly CartesianCoordinates[],
): Vector3 {
    let resultantElectricField: Vector3 = [0, 0, 0];

    for (const electricFieldContribution of fieldContributions) {
        resultantElectricField = addVectors(resultantElectricField, electricFieldContribution);
    }

    return resultantElectricField;
}
