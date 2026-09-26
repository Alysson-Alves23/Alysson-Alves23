import type { CartesianCoordinates, ElectricFieldReading } from '../../core/physics/electrostatics/types';
import type { FieldSamplingOptions } from '../field/fieldCalculationTypes';

export interface FieldDisplayOptions extends FieldSamplingOptions {
    arrowLength: 'uniform' | 'logarithmic';
    colorMode: 'classic' | 'magnitude';
    probe: boolean;
}

export interface FieldProbeReading extends ElectricFieldReading {
    status: 'valid' | 'excluded' | 'invalid';
    excludedChargeIds: string[];
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
    reading: FieldProbeReading | null;
}
