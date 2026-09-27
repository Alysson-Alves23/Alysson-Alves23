const MAXIMUM_ARROW_TO_CHARGE_DISTANCE_RATIO = 0.4;

export function limitForceVectorDisplayLength(
    scaledLengthMeters: number,
    chargeSeparationMeters: number,
): number {
    return Math.min(scaledLengthMeters, chargeSeparationMeters * MAXIMUM_ARROW_TO_CHARGE_DISTANCE_RATIO);
}
