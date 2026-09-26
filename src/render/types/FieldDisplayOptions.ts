import type { CartesianCoordinates, ElectricFieldReading } from '../../core/physics/types';
import type { FieldSamplingOptions } from '../../core/physics/fieldVisualizationTypes';

export interface FieldDisplayOptions extends FieldSamplingOptions {
    arrowLength: 'uniform' | 'logarithmic';
    colorMode: 'classic' | 'magnitude';
    probe: boolean;
}
export const defaultFieldDisplayOptions: FieldDisplayOptions = {
    space: 'plane', plane: 'xz', offset: 0, density: 'medium',
    lines: true, vectors: false, probe: false,
    arrowLength: 'logarithmic', colorMode: 'classic',
};
export interface FieldViewState {
    busy: boolean;
    error: string | null;
    colorMaximum: number;
    projected: boolean;
    lineCount: number;
    vectorCount: number;
    probePosition: CartesianCoordinates;
    reading: ElectricFieldReading | null;
}
