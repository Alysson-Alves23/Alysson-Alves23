import type { VisualizationVisibility } from '../render/types/VisualizationVisibility';

export { defaultVisualizationVisibility as defaultChargeVisibility } from '../render/types/VisualizationVisibility';
export type {
    VisualizationLayer,
    VisualizationVisibility,
} from '../render/types/VisualizationVisibility';

export type ChargeVisibility = VisualizationVisibility;

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
