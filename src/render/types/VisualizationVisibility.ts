export type VisualizationLayer = 'electricField' | 'forceVectors' | 'distanceGuide';

export interface VisualizationVisibility {
    electricField: boolean;
    forceVectors: boolean;
    distanceGuide: boolean;
}

export const defaultVisualizationVisibility: VisualizationVisibility = {
    electricField: true,
    forceVectors: true,
    distanceGuide: true,
};
