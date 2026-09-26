import { electricFieldVectorAtPoint } from '../../core/physics/ElectricField';
import type { CartesianCoordinates, ElectrostaticCharge, ElectricFieldSample } from '../../core/physics/types';
import type { FieldDomain, FieldPlane, FieldSamplingOptions } from './fieldCalculationTypes';
import { magnitude, normalize, type Vector3 } from '../../math/vectorMath';

export function planeAxes(plane: FieldPlane): [number, number, number] {
    return plane === 'xy' ? [0, 1, 2] : plane === 'yz' ? [1, 2, 0] : [0, 2, 1];
}

export function fieldDomain(charges: readonly ElectrostaticCharge[]): FieldDomain {
    if (charges.length === 0) return { center: [0, 0, 0], halfSize: 4 };
    const center: Vector3 = [0, 0, 0];
    let halfSize = 4;
    for (let axis = 0; axis < 3; axis++) {
        const values = charges.map(charge => charge.position[axis]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        center[axis] = min / 2 + max / 2;
        halfSize = Math.max(halfSize, (max - min) * 0.75 + 1);
    }
    return { center, halfSize };
}

export function projectVector(vector: CartesianCoordinates, options: FieldSamplingOptions): Vector3 {
    const result: Vector3 = [...vector];
    if (options.space === 'plane') result[planeAxes(options.plane)[2]] = 0;
    return result;
}

export function fieldVectorForDisplay(
    point: CartesianCoordinates, charges: readonly ElectrostaticCharge[],
    options: FieldSamplingOptions, cutoff: number,
): Vector3 | null {
    const vector = electricFieldVectorAtPoint(point, charges, cutoff);
    return vector ? projectVector(vector, options) : null;
}

export function sampleFieldGrid(
    charges: readonly ElectrostaticCharge[], options: FieldSamplingOptions,
    domain: FieldDomain, cutoff: number,
): { samples: ElectricFieldSample[]; spacing: number } {
    const divisions = options.space === 'plane'
        ? { low: 12, medium: 20, high: 28 }[options.density]
        : { low: 4, medium: 8, high: 12 }[options.density];
    const spacing = domain.halfSize * 2 / divisions;
    const samples: ElectricFieldSample[] = [];
    if (!options.vectors || charges.length === 0) return { samples, spacing };
    const [u, v, normal] = planeAxes(options.plane);
    for (let row = 0; row <= divisions; row++) {
        for (let column = 0; column <= divisions; column++) {
            for (let depth = 0; depth <= (options.space === 'volume' ? divisions : 0); depth++) {
                const point: Vector3 = [...domain.center];
                point[u] += column * spacing - domain.halfSize;
                point[v] += row * spacing - domain.halfSize;
                point[normal] = options.space === 'plane' ? options.offset
                    : point[normal] + depth * spacing - domain.halfSize;
                const vector = fieldVectorForDisplay(point, charges, options, cutoff);
                if (!vector || magnitude(vector) === 0) continue;
                samples.push({ origin: point, vector, magnitude: magnitude(vector), direction: normalize(vector) });
            }
        }
    }
    return { samples, spacing };
}
