export type CartesianCoordinates = readonly [number, number, number];

export interface ElectrostaticCharge {
    id: string;
    /** Coulombs. Convert presentation units before entering the core. */
    value: number;
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

export interface ElectrostaticForceContribution {
    chargeId: string;
    vector: CartesianCoordinates;
    magnitude: number;
}

export interface ElectrostaticPairDistance {
    firstChargeId: string;
    secondChargeId: string;
    distance: number;
}

export interface ElectrostaticInteractionResults {
    forceContributions: ElectrostaticForceContribution[];
    pairDistances: ElectrostaticPairDistance[];
}
