export interface ChargeSummary {
    id: string;
    value: number;
    color: string;
    position: [number, number, number];
}

export interface ChargeDraft {
    value: string;
    x: string;
    y: string;
    z: string;
    color: string;
}

export type ChargeDraftField = keyof ChargeDraft;
