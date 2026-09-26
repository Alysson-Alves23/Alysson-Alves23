export type CartesianCoordinates = readonly [number, number, number];

export interface ElectrostaticCharge {
    id: string;
    chargeInCoulombs: number;
    positionInMeters: CartesianCoordinates;
}

export interface ElectricFieldValue {
    positionInMeters: CartesianCoordinates;
    unitDirection: CartesianCoordinates;
    electricFieldVector: CartesianCoordinates;
    fieldStrengthNewtonsPerCoulomb: number;
}

export interface ElectricFieldContribution {
    chargeId: string;
    electricFieldVector: CartesianCoordinates;
    fieldStrengthNewtonsPerCoulomb: number;
}

export interface ElectricFieldReading extends ElectricFieldValue {
    contributions: ElectricFieldContribution[];
}

export interface ElectrostaticForceContribution {
    chargeId: string;
    causedByChargeId: string;
    forceVectorNewtons: CartesianCoordinates;
    forceMagnitudeNewtons: number;
}

export interface ElectrostaticPairDistance {
    firstChargeId: string;
    secondChargeId: string;
    distanceMeters: number;
}

export interface ElectrostaticInteractionResults {
    forceContributions: ElectrostaticForceContribution[];
    pairDistances: ElectrostaticPairDistance[];
}
