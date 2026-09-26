export type CartesianCoordinates = readonly [number, number, number];

export interface ElectrostaticCharge {
    id: string;
    /** Coulombs. Convert presentation units before entering the core. */
    value: number;
    /** Metres. */
    position: CartesianCoordinates;
}

export interface ElectricFieldSample {
    origin: CartesianCoordinates;
    direction: CartesianCoordinates;
    vector: CartesianCoordinates;
    /** N/C. */
    magnitude: number;
}

export interface ElectricFieldContribution {
    chargeId: string;
    vector: CartesianCoordinates;
    magnitude: number;
}

export interface ElectricFieldReading extends ElectricFieldSample {
    status: 'valid' | 'excluded' | 'invalid';
    contributions: ElectricFieldContribution[];
    excludedChargeIds: string[];
}

export interface ElectrostaticForceVector {
    chargeId: string;
    origin: CartesianCoordinates;
    direction: CartesianCoordinates;
    magnitude: number;
}

export interface ElectrostaticDistanceGuide {
    firstChargeId: string;
    secondChargeId: string;
    start: CartesianCoordinates;
    end: CartesianCoordinates;
    distance: number;
}

export interface ElectrostaticVisualization {
    electricField: ElectricFieldSample[];
    forceVectors: ElectrostaticForceVector[];
    distanceGuides: ElectrostaticDistanceGuide[];
}
