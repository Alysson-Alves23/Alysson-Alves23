import { COULOMB_CONSTANT } from './constants';
import type {
    CartesianCoordinates,
    ElectricFieldContribution,
    ElectricFieldReading,
    ElectrostaticCharge,
} from './types';
import { calculateVectorSumOfElectricFields } from './PrincipleOfSuperposition';
import {
    distanceBetween,
    magnitude,
    normalize as unitVectorInDirectionOf,
    scale as multiplyVectorByScalar,
    subtract,
    type Vector3,
} from '../../../math/vectorMath';

const RELATIVE_FIELD_CANCELLATION_TOLERANCE = 1e-12;

/** Eᵢ(r) = kqᵢ(r − rᵢ)/|r − rᵢ|³. */
function electricFieldProducedByPointCharge(
    positionInMeters: CartesianCoordinates,
    pointCharge: ElectrostaticCharge,
): Vector3 {
    if (pointCharge.chargeInCoulombs === 0) return [0, 0, 0];

    const vectorFromPointChargeToPosition = subtract(
        positionInMeters,
        pointCharge.positionInMeters,
    );
    const distanceFromPointChargeInMeters = distanceBetween(positionInMeters, pointCharge.positionInMeters);
    const directionFromPointChargeToPosition = unitVectorInDirectionOf(vectorFromPointChargeToPosition);
    const signedFieldStrengthNewtonsPerCoulomb = COULOMB_CONSTANT
        * pointCharge.chargeInCoulombs
        / distanceFromPointChargeInMeters ** 2;

    return multiplyVectorByScalar(directionFromPointChargeToPosition, signedFieldStrengthNewtonsPerCoulomb);
}

/** E(r) = Σᵢ Eᵢ(r): sum the field produced by every point charge. */
export function resultantElectricFieldAtPoint(
    positionInMeters: CartesianCoordinates,
    pointCharges: readonly ElectrostaticCharge[],
): Vector3 | null {
    if (!positionInMeters.every(Number.isFinite)) return null;

    const electricFieldContributions: Vector3[] = [];
    let sumOfFieldMagnitudes = 0;

    for (const pointCharge of pointCharges) {
        if (pointCharge.chargeInCoulombs === 0) continue;

        if (!Number.isFinite(pointCharge.chargeInCoulombs)
            || !pointCharge.positionInMeters.every(Number.isFinite)) return null;

        const distanceFromPointChargeInMeters = distanceBetween(
            positionInMeters,
            pointCharge.positionInMeters,
        );
        if (distanceFromPointChargeInMeters === 0) return null;

        const electricFieldContribution = electricFieldProducedByPointCharge(positionInMeters, pointCharge);
        electricFieldContributions.push(electricFieldContribution);
        sumOfFieldMagnitudes += magnitude(electricFieldContribution);
    }

    const resultantElectricField = calculateVectorSumOfElectricFields(electricFieldContributions);
    if (!resultantElectricField.every(Number.isFinite) || !Number.isFinite(sumOfFieldMagnitudes)) return null;
    const resultantFieldIsNumericalCancellation = magnitude(resultantElectricField)
        <= sumOfFieldMagnitudes * RELATIVE_FIELD_CANCELLATION_TOLERANCE;
    if (resultantFieldIsNumericalCancellation) return [0, 0, 0];
    return resultantElectricField;
}

export function readElectricFieldAtPoint(
    positionInMeters: CartesianCoordinates,
    pointCharges: readonly ElectrostaticCharge[],
): ElectricFieldReading | null {
    const resultantElectricField = resultantElectricFieldAtPoint(positionInMeters, pointCharges);
    if (!resultantElectricField) return null;

    const contributions: ElectricFieldContribution[] = pointCharges.map(pointCharge => {
        const electricField = electricFieldProducedByPointCharge(positionInMeters, pointCharge);
        return {
            chargeId: pointCharge.id,
            electricFieldVector: electricField,
            fieldStrengthNewtonsPerCoulomb: magnitude(electricField),
        };
    });

    return {
        positionInMeters: [...positionInMeters],
        electricFieldVector: resultantElectricField,
        unitDirection: unitVectorInDirectionOf(resultantElectricField),
        fieldStrengthNewtonsPerCoulomb: magnitude(resultantElectricField),
        contributions,
    };
}
