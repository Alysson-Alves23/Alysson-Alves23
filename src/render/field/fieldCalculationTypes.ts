import type { CartesianCoordinates, ElectrostaticCharge, ElectricFieldValue } from '../../core/physics/electrostatics/types';

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
    startAnchor?: CartesianCoordinates;
    endAnchor?: CartesianCoordinates;
}

export interface FieldGeometry {
    samples: ElectricFieldValue[];
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
    chargeDisplayClearanceMeters: number;
}

export type FieldCalculationResponse =
    | { revision: number; geometry: FieldGeometry }
    | { revision: number; error: string };
