export type CartesianCoordinates = readonly [number, number, number];

export interface ElectrostaticCharge {
    id: string;
    value: number;
    position: CartesianCoordinates;
}

export interface ElectricFieldSample {
    chargeId: string;
    origin: CartesianCoordinates;
    direction: CartesianCoordinates;
    magnitude: number;
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
