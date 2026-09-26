import { COULOMB_CONSTANT, electrostaticCalculationDefaults } from './constants';
import type { CartesianCoordinates, ElectrostaticCharge, ElectricFieldReading } from './types';
import { add, magnitude, normalize, scale, subtract, type Vector3 } from '../../math/vectorMath';

function contributionAt(point: CartesianCoordinates, charge: ElectrostaticCharge): Vector3 {
    if (charge.value === 0) return [0, 0, 0];
    const offset = subtract(point, charge.position);
    const distance = magnitude(offset);
    return scale(normalize(offset), COULOMB_CONSTANT * charge.value / distance ** 2);
}

/** Allocation-light sampling for integration. null denotes an excluded/invalid point. */
export function electricFieldVectorAtPoint(
    point: CartesianCoordinates,
    charges: readonly ElectrostaticCharge[],
    cutoff = electrostaticCalculationDefaults.minimumDistance,
): Vector3 | null {
    if (!point.every(Number.isFinite)) return null;
    let field: Vector3 = [0, 0, 0];
    let absoluteSum = 0;
    for (const charge of charges) {
        if (!Number.isFinite(charge.value) || !charge.position.every(Number.isFinite)
            || magnitude(subtract(point, charge.position)) < cutoff) return null;
        const contribution = contributionAt(point, charge);
        absoluteSum += magnitude(contribution);
        field = add(field, contribution);
    }
    if (!field.every(Number.isFinite) || !Number.isFinite(absoluteSum)) return null;
    // Relative cancellation tolerance is independent of the choice of SI units.
    return magnitude(field) <= absoluteSum * 1e-12 ? [0, 0, 0] : field;
}

export function sampleElectricField(
    point: CartesianCoordinates,
    charges: readonly ElectrostaticCharge[],
    cutoff = electrostaticCalculationDefaults.minimumDistance,
): ElectricFieldReading {
    const excludedChargeIds = charges.filter(charge =>
        magnitude(subtract(point, charge.position)) < cutoff,
    ).map(charge => charge.id);
    const vector = electricFieldVectorAtPoint(point, charges, cutoff);
    const status = excludedChargeIds.length ? 'excluded' : vector ? 'valid' : 'invalid';
    return {
        origin: [...point], vector: vector ?? [0, 0, 0],
        direction: normalize(vector ?? [0, 0, 0]), magnitude: vector ? magnitude(vector) : 0,
        status, excludedChargeIds,
        contributions: status === 'valid' ? charges.map(charge => {
            const contribution = contributionAt(point, charge);
            return { chargeId: charge.id, vector: contribution, magnitude: magnitude(contribution) };
        }) : [],
    };
}
