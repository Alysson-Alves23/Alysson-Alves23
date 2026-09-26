import type { CartesianCoordinates, ElectrostaticCharge } from '../../core/physics/electrostatics/types';
import type { ElectricFieldLine, FieldDomain, FieldSamplingOptions } from './fieldCalculationTypes';
import { planeAxes } from './FieldSampling';
import { resultantElectricFieldAtPoint } from '../../core/physics/electrostatics/ElectricField';
import { add, distanceBetween, magnitude, normalize, scale, type Vector3 } from '../../math/vectorMath';

interface FieldLineSeed {
    positionInMeters: Vector3;
    sourceCharge: ElectrostaticCharge;
}

function placeFieldLineSeeds(
    charges: readonly ElectrostaticCharge[],
    options: FieldSamplingOptions,
    chargeDisplayClearanceMeters: number,
): FieldLineSeed[] {
    const sourceCharges = charges.filter(charge => charge.chargeInCoulombs !== 0);
    if (sourceCharges.length === 0) return [];

    const largestChargeMagnitudeInCoulombs = Math.max(
        ...sourceCharges.map(charge => Math.abs(charge.chargeInCoulombs)),
        0,
    );
    const densityMultiplier = { low: 0.5, medium: 1, high: 2 }[options.density];
    const baseSeedCount = (options.space === 'plane' ? 28 : 48) * densityMultiplier;
    const relativeChargeMagnitudeSum = sourceCharges.reduce(
        (sum, charge) => sum + Math.abs(charge.chargeInCoulombs) / largestChargeMagnitudeInCoulombs,
        0,
    );
    const seedBudgetScale = Math.min(1, 256 / (baseSeedCount * relativeChargeMagnitudeSum));
    const lineSeeds: FieldLineSeed[] = [];
    const [firstPlaneAxis, secondPlaneAxis] = planeAxes(options.plane);

    for (const sourceCharge of sourceCharges) {
        const sourceChargeWeight = Math.abs(sourceCharge.chargeInCoulombs) / largestChargeMagnitudeInCoulombs;
        const seedCountForCharge = Math.max(1, Math.round(baseSeedCount * sourceChargeWeight * seedBudgetScale));

        for (let seedIndex = 0; seedIndex < seedCountForCharge && lineSeeds.length < 256; seedIndex += 1) {
            let seedDirection: Vector3;

            if (options.space === 'plane') {
                const angleAroundCharge = 2 * Math.PI * (seedIndex + 0.5) / seedCountForCharge;
                seedDirection = [0, 0, 0];
                seedDirection[firstPlaneAxis] = Math.cos(angleAroundCharge);
                seedDirection[secondPlaneAxis] = Math.sin(angleAroundCharge);
            } else {
                const verticalPosition = 1 - 2 * (seedIndex + 0.5) / seedCountForCharge;
                const horizontalRadius = Math.sqrt(1 - verticalPosition ** 2);
                const angleAroundCharge = seedIndex * Math.PI * (3 - Math.sqrt(5));
                seedDirection = [
                    horizontalRadius * Math.cos(angleAroundCharge),
                    verticalPosition,
                    horizontalRadius * Math.sin(angleAroundCharge),
                ];
            }

            lineSeeds.push({
                positionInMeters: add(
                    sourceCharge.positionInMeters,
                    scale(seedDirection, chargeDisplayClearanceMeters * 1.08),
                ),
                sourceCharge,
            });
        }
    }

    return lineSeeds;
}

function isInsideFieldDisplayDomain(positionInMeters: CartesianCoordinates, domain: FieldDomain): boolean {
    return positionInMeters.every((coordinate, axis) => Number.isFinite(coordinate)
        && Math.abs(coordinate - domain.center[axis]) <= domain.halfSize);
}

function electricFieldForVisiblePoint(
    positionInMeters: CartesianCoordinates,
    charges: readonly ElectrostaticCharge[],
    chargeDisplayClearanceMeters: number,
): Vector3 | null {
    const pointIsInsideChargeClearance = charges.some(charge =>
        distanceBetween(positionInMeters, charge.positionInMeters) < chargeDisplayClearanceMeters,
    );
    if (pointIsInsideChargeClearance) return null;

    return resultantElectricFieldAtPoint(positionInMeters, charges);
}

function traceFieldLineFromSeed(
    seed: FieldLineSeed,
    charges: readonly ElectrostaticCharge[],
    domain: FieldDomain,
    chargeDisplayClearanceMeters: number,
): ElectricFieldLine | null {
    const tracingSign = Math.sign(seed.sourceCharge.chargeInCoulombs);
    const tracedPositions: CartesianCoordinates[] = [];
    const fieldStrengthsAlongLine: number[] = [];
    let currentPositionInMeters = seed.positionInMeters;
    let endpointCharge: ElectrostaticCharge | undefined;

    const fieldDirectionAt = (positionInMeters: CartesianCoordinates): Vector3 | null => {
        const electricField = electricFieldForVisiblePoint(positionInMeters, charges, chargeDisplayClearanceMeters);
        return electricField && magnitude(electricField) > 0
            ? scale(normalize(electricField), tracingSign)
            : null;
    };

    for (let stepIndex = 0; stepIndex < 1100
        && isInsideFieldDisplayDomain(currentPositionInMeters, domain); stepIndex += 1) {
        const electricField = electricFieldForVisiblePoint(
            currentPositionInMeters,
            charges,
            chargeDisplayClearanceMeters,
        );
        if (!electricField || magnitude(electricField) === 0) break;

        tracedPositions.push(currentPositionInMeters);
        fieldStrengthsAlongLine.push(magnitude(electricField));

        const distanceToNearestCharge = charges.reduce(
            (nearestDistance, charge) => Math.min(
                nearestDistance,
                distanceBetween(currentPositionInMeters, charge.positionInMeters),
            ),
            Infinity,
        );
        const integrationStepMeters = Math.min(
            domain.halfSize / 48,
            Math.max(chargeDisplayClearanceMeters * 0.025, distanceToNearestCharge * 0.16),
        );

        const firstRungeKuttaDirection = scale(normalize(electricField), tracingSign);
        const secondRungeKuttaDirection = fieldDirectionAt(add(
            currentPositionInMeters,
            scale(firstRungeKuttaDirection, integrationStepMeters / 2),
        ));
        const thirdRungeKuttaDirection = secondRungeKuttaDirection && fieldDirectionAt(add(
            currentPositionInMeters,
            scale(secondRungeKuttaDirection, integrationStepMeters / 2),
        ));
        const fourthRungeKuttaDirection = thirdRungeKuttaDirection && fieldDirectionAt(add(
            currentPositionInMeters,
            scale(thirdRungeKuttaDirection, integrationStepMeters),
        ));
        const nextPositionInMeters = secondRungeKuttaDirection
            && thirdRungeKuttaDirection
            && fourthRungeKuttaDirection
            ? add(currentPositionInMeters, scale(add(
                add(firstRungeKuttaDirection, scale(secondRungeKuttaDirection, 2)),
                add(scale(thirdRungeKuttaDirection, 2), fourthRungeKuttaDirection),
            ), integrationStepMeters / 6))
            : add(currentPositionInMeters, scale(firstRungeKuttaDirection, integrationStepMeters));

        endpointCharge = charges.find(charge => charge.id !== seed.sourceCharge.id
            && distanceBetween(nextPositionInMeters, charge.positionInMeters)
                <= chargeDisplayClearanceMeters * 1.08);
        if (endpointCharge) break;

        if (distanceBetween(nextPositionInMeters, currentPositionInMeters) < integrationStepMeters * 0.05) break;
        if (stepIndex > 30 && stepIndex % 10 === 0 && tracedPositions
            .slice(0, -20)
            .some(previousPosition => distanceBetween(nextPositionInMeters, previousPosition) < integrationStepMeters * 0.4)) break;

        currentPositionInMeters = nextPositionInMeters;
    }

    if (tracedPositions.length < 3) return null;
    if (tracingSign < 0 && endpointCharge && endpointCharge.chargeInCoulombs > 0) return null;

    if (tracingSign < 0) {
        tracedPositions.reverse();
        fieldStrengthsAlongLine.reverse();
        return {
            points: tracedPositions,
            magnitudes: fieldStrengthsAlongLine,
            startChargeId: endpointCharge?.id,
            endChargeId: seed.sourceCharge.id,
            startAnchor: endpointCharge?.positionInMeters,
            endAnchor: seed.sourceCharge.positionInMeters,
        };
    }

    return {
        points: tracedPositions,
        magnitudes: fieldStrengthsAlongLine,
        startChargeId: seed.sourceCharge.id,
        endChargeId: endpointCharge?.id,
        startAnchor: seed.sourceCharge.positionInMeters,
        endAnchor: endpointCharge?.positionInMeters,
    };
}

export function* traceFieldLines(
    charges: readonly ElectrostaticCharge[],
    options: FieldSamplingOptions,
    domain: FieldDomain,
    chargeDisplayClearanceMeters: number,
): Generator<ElectricFieldLine | null> {
    if (!options.lines) return;

    const lineSeeds = placeFieldLineSeeds(charges, options, chargeDisplayClearanceMeters);
    for (const seed of lineSeeds) {
        yield traceFieldLineFromSeed(seed, charges, domain, chargeDisplayClearanceMeters);
    }
}
