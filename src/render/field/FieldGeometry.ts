import { traceFieldLines } from './FieldLines';
import { fieldDomain, planeAxes, sampleFieldGrid } from './FieldSampling';
import type { FieldCalculationRequest, FieldGeometry } from './fieldCalculationTypes';

export function* generateFieldGeometry(request: FieldCalculationRequest): Generator<void, FieldGeometry> {
    const { charges, options, chargeDisplayClearanceMeters } = request;
    const domain = fieldDomain(charges.map(charge => charge.positionInMeters));
    const { samples, spacing } = sampleFieldGrid(charges, options, domain, chargeDisplayClearanceMeters);
    const lines: FieldGeometry['lines'] = [];
    const intensities = samples.map(sample => sample.fieldStrengthNewtonsPerCoulomb);
    yield;
    for (const line of traceFieldLines(charges, options, domain, chargeDisplayClearanceMeters)) {
        if (line) {
            lines.push(line);
            for (let index = 0; index < line.magnitudes.length; index += 8) {
                intensities.push(line.magnitudes[index]);
            }
        }
        yield;
    }
    intensities.sort((a, b) => a - b);
    const normal = planeAxes(options.plane)[2];
    return {
        samples, lines, domain, spacing,
        colorMaximum: intensities[Math.floor((intensities.length - 1) * 0.95)] || 1,
        projected: options.space === 'plane' && charges.some(charge =>
            charge.chargeInCoulombs !== 0
            && Math.abs(charge.positionInMeters[normal] - options.offset) > 1e-8),
    };
}
