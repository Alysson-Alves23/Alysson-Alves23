import type { CartesianCoordinates, ElectrostaticCharge } from './types';
import type { ElectricFieldLine, FieldDomain, FieldSamplingOptions } from './fieldVisualizationTypes';
import { planeAxes } from './FieldSampling';
import { electricFieldVectorAtPoint } from './ElectricField';
import { add, magnitude, normalize, scale, subtract, type Vector3 } from './vectorMath';

interface Seed { point: Vector3; source: ElectrostaticCharge; }

function seedsForCharges(
    charges: readonly ElectrostaticCharge[], options: FieldSamplingOptions, cutoff: number,
): Seed[] {
    const sources = charges.filter(charge => charge.value !== 0);
    const maximum = Math.max(...sources.map(charge => Math.abs(charge.value)), 0);
    const density = { low: 0.5, medium: 1, high: 2 }[options.density];
    const base = (options.space === 'plane' ? 28 : 48) * density;
    const weight = sources.reduce((sum, charge) => sum + Math.abs(charge.value) / maximum, 0);
    const budgetScale = Math.min(1, 256 / (base * weight));
    const seeds: Seed[] = [];
    const [u, v] = planeAxes(options.plane);
    for (const charge of sources) {
        const count = Math.max(1, Math.round(base * Math.abs(charge.value) / maximum * budgetScale));
        for (let index = 0; index < count && seeds.length < 256; index++) {
            let direction: Vector3;
            if (options.space === 'plane') {
                const angle = 2 * Math.PI * (index + 0.5) / count;
                direction = [0, 0, 0];
                direction[u] = Math.cos(angle);
                direction[v] = Math.sin(angle);
            } else {
                const y = 1 - 2 * (index + 0.5) / count;
                const radius = Math.sqrt(1 - y * y);
                const angle = index * Math.PI * (3 - Math.sqrt(5));
                direction = [radius * Math.cos(angle), y, radius * Math.sin(angle)];
            }
            const point = add(charge.position, scale(direction, cutoff * 1.08));
            seeds.push({ point, source: charge });
        }
    }
    return seeds;
}

function insideDomain(point: CartesianCoordinates, domain: FieldDomain): boolean {
    return point.every((value, axis) => Number.isFinite(value)
        && Math.abs(value - domain.center[axis]) <= domain.halfSize);
}

function traceLine(
    seed: Seed, charges: readonly ElectrostaticCharge[],
    domain: FieldDomain, cutoff: number,
): ElectricFieldLine | null {
    const sign = Math.sign(seed.source.value);
    const points: CartesianCoordinates[] = [];
    const magnitudes: number[] = [];
    let point = seed.point;
    let endpoint: ElectrostaticCharge | undefined;
    const directionAt = (p: CartesianCoordinates): Vector3 | null => {
        const field = electricFieldVectorAtPoint(p, charges, cutoff);
        return field && magnitude(field) > 0 ? scale(normalize(field), sign) : null;
    };
    // Integrate the physical 3D field. Orthographic projection belongs to the camera,
    // not the ODE: projecting here creates false sinks when a charge is off-plane.
    for (let index = 0; index < 1100 && insideDomain(point, domain); index++) {
        const field = electricFieldVectorAtPoint(point, charges, cutoff);
        if (!field || magnitude(field) === 0) break;
        points.push(point);
        magnitudes.push(magnitude(field));
        const nearest = charges.reduce((distance, charge) =>
            Math.min(distance, magnitude(subtract(point, charge.position))), Infinity);
        const step = Math.min(domain.halfSize / 48, Math.max(cutoff * 0.025, nearest * 0.16));
        const k1 = scale(normalize(field), sign);
        const k2 = directionAt(add(point, scale(k1, step / 2)));
        const k3 = k2 && directionAt(add(point, scale(k2, step / 2)));
        const k4 = k3 && directionAt(add(point, scale(k3, step)));
        const next = k2 && k3 && k4
            ? add(point, scale(add(add(k1, scale(k2, 2)), add(scale(k3, 2), k4)), step / 6))
            : add(point, scale(k1, step));
        const hit = charges.find(charge => charge.id !== seed.source.id
            && magnitude(subtract(next, charge.position)) <= cutoff * 1.08);
        if (hit) { endpoint = hit; break; }
        if (magnitude(subtract(next, point)) < step * 0.05) break;
        if (index > 30 && index % 10 === 0 && points.slice(0, -20).some(old => magnitude(subtract(next, old)) < step * 0.4)) break;
        point = next;
    }
    if (points.length < 3) return null;
    // A reverse trace arriving at a positive source duplicates forward flux lines.
    if (sign < 0 && endpoint && endpoint.value > 0) return null;
    if (sign < 0) {
        points.reverse(); magnitudes.reverse();
        return { points, magnitudes, startChargeId: endpoint?.id, endChargeId: seed.source.id,
            startAnchor: endpoint?.position, endAnchor: seed.source.position };
    }
    return { points, magnitudes, startChargeId: seed.source.id, endChargeId: endpoint?.id,
        startAnchor: seed.source.position, endAnchor: endpoint?.position };
}

/** Yields per seed so a worker can accept newer requests between bounded batches. */
export function* traceFieldLines(
    charges: readonly ElectrostaticCharge[], options: FieldSamplingOptions,
    domain: FieldDomain, cutoff: number,
): Generator<ElectricFieldLine | null> {
    if (!options.lines) return;
    for (const seed of seedsForCharges(charges, options, cutoff)) {
        yield traceLine(seed, charges, domain, cutoff);
    }
}
