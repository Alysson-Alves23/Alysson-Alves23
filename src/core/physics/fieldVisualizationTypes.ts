import type { CartesianCoordinates, ElectrostaticCharge, ElectricFieldSample } from './types';

export type FieldPlane = 'xz' | 'xy' | 'yz';
export interface FieldSamplingOptions {
    space: 'plane' | 'volume';
    plane: FieldPlane;
    offset: number;
    density: 'low' | 'medium' | 'high';
    lines: boolean;
    vectors: boolean;
}
export interface FieldDomain {
    center: CartesianCoordinates;
    halfSize: number;
}
export interface ElectricFieldLine {
    points: CartesianCoordinates[];
    magnitudes: number[];
    startChargeId?: string;
    endChargeId?: string;
    /** Visual connectors only: no field is sampled at the charge singularities. */
    startAnchor?: CartesianCoordinates;
    endAnchor?: CartesianCoordinates;
}
export interface FieldGeometry {
    samples: ElectricFieldSample[];
    lines: ElectricFieldLine[];
    domain: FieldDomain;
    spacing: number;
    colorMaximum: number;
    projected: boolean;
}
export interface FieldCalculationRequest {
    revision: number;
    charges: ElectrostaticCharge[];
    options: FieldSamplingOptions;
    cutoff: number;
}
export type FieldCalculationResponse =
    | { revision: number; geometry: FieldGeometry }
    | { revision: number; error: string };
