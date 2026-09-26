export type VisualizationLayer = 'electricField' | 'forceVectors' | 'distanceGuide';

export interface ChargeVisibility {
    electricField: boolean;
    forceVectors: boolean;
    distanceGuide: boolean;
}

export const defaultChargeVisibility: ChargeVisibility = {
    electricField: false,
    forceVectors: false,
    distanceGuide: false,
};

export interface ChargeSummary {
    id: string;
    value: number;
    color: string;
    position: [number, number, number];
    visibility: ChargeVisibility;
}

export interface ChargeDraft {
    value: string;
    x: string;
    y: string;
    z: string;
    color: string;
}

export type ChargeDraftField = keyof ChargeDraft;
