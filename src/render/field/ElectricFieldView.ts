import * as THREE from 'three';
import { sampleElectricField } from '../../core/physics/ElectricField';
import type { CartesianCoordinates, ElectrostaticCharge } from '../../core/physics/types';
import type { FieldCalculationResponse, FieldGeometry } from '../../core/physics/fieldVisualizationTypes';
import { planeAxes } from '../../core/physics/FieldSampling';
import { defaultFieldDisplayOptions, type FieldDisplayOptions, type FieldViewState } from '../types/FieldDisplayOptions';
import type { SimulationThemeConfig } from '../types/SimulationTheme';
import { FieldArrowInstances } from './FieldArrowInstances';
import { FieldLinesView } from './FieldLinesView';
import { FieldProbeView, type ProbeChargeStyle } from './FieldProbeView';

export class ElectricFieldView extends THREE.Group {
    public readonly probe: FieldProbeView;
    private readonly lines: FieldLinesView;
    private readonly vectors: FieldArrowInstances;
    private readonly worker: Worker;
    private readonly listeners = new Set<(state: FieldViewState) => void>();
    private options = { ...defaultFieldDisplayOptions };
    private charges: ElectrostaticCharge[] = [];
    private styles = new Map<string, ProbeChargeStyle>();
    private geometry: FieldGeometry | null = null;
    private revision = 0;
    private inputSignature = '';
    private sampleSignature = '';
    private state: FieldViewState = { busy: false, error: null, colorMaximum: 1, projected: false,
        lineCount: 0, vectorCount: 0, probePosition: [0, 0, 1], reading: null };

    public constructor(private readonly appearance: SimulationThemeConfig['field'], private readonly cutoff: number) {
        super(); this.name = 'ResultantElectricField';
        this.lines = new FieldLinesView(appearance.arrowWidth);
        this.vectors = new FieldArrowInstances(appearance.arrowWidth);
        this.vectors.name = 'ResultantElectricFieldVectors';
        this.probe = new FieldProbeView(appearance);
        this.probe.visible = false;
        this.add(this.lines, this.vectors, this.probe);
        this.worker = new Worker(new URL('./electricField.worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = ({ data }: MessageEvent<FieldCalculationResponse>) => {
            if (data.revision !== this.revision) return;
            if ('error' in data) { this.state = { ...this.state, busy: false, error: data.error }; }
            else {
                this.geometry = data.geometry;
                this.state = { ...this.state, busy: false, error: null, colorMaximum: data.geometry.colorMaximum,
                    projected: data.geometry.projected, lineCount: data.geometry.lines.length, vectorCount: data.geometry.samples.length };
                this.renderGeometry();
            }
            this.notify();
        };
        this.worker.onerror = () => {
            this.state = { ...this.state, busy: false, error: 'O cálculo do campo foi interrompido. Recarregue a página.' };
            this.notify();
        };
    }

    public subscribe(listener: (state: FieldViewState) => void): () => void {
        this.listeners.add(listener); listener(this.state);
        return () => this.listeners.delete(listener);
    }

    public setOptions(options: FieldDisplayOptions): void {
        this.options = { ...options };
        this.probe.visible = options.probe;
        this.setProbePosition(this.state.probePosition);
        this.requestGeometry();
        this.renderGeometry();
    }

    public update(charges: ElectrostaticCharge[], styles: Map<string, ProbeChargeStyle>): void {
        const signature = JSON.stringify([charges, Array.from(styles)]);
        if (signature === this.inputSignature) return;
        this.inputSignature = signature;
        this.charges = charges; this.styles = styles;
        this.requestGeometry();
        this.updateProbe();
    }

    public setProbePosition(position: CartesianCoordinates): void {
        const next: [number, number, number] = [...position];
        if (!next.every(Number.isFinite)) return;
        if (this.options.space === 'plane') next[planeAxes(this.options.plane)[2]] = this.options.offset;
        this.state = { ...this.state, probePosition: next };
        this.updateProbe();
    }

    private updateProbe(): void {
        const reading = sampleElectricField(this.state.probePosition, this.charges, this.cutoff);
        this.state = { ...this.state, reading };
        this.probe.setReading(reading, this.styles);
        this.notify();
    }

    private requestGeometry(): void {
        const { space, plane, offset, density, lines, vectors } = this.options;
        const options = { space, plane, offset, density, lines, vectors };
        const signature = JSON.stringify([this.charges, options]);
        if (signature === this.sampleSignature) return;
        this.sampleSignature = signature;
        this.state = { ...this.state, busy: true, error: null };
        this.worker.postMessage({ revision: ++this.revision, charges: this.charges, options, cutoff: this.cutoff });
        this.notify();
    }

    private renderGeometry(): void {
        this.lines.visible = this.options.lines;
        this.vectors.visible = this.options.vectors;
        const data = this.geometry;
        if (!data) return;
        const colorAt = (magnitude: number): THREE.Color => {
            if (this.options.colorMode === 'classic') return new THREE.Color(this.appearance.lineColor);
            const value = this.intensity(magnitude, data.colorMaximum) * 3;
            const index = Math.min(2, Math.floor(value));
            return new THREE.Color(this.appearance.magnitudeColors[index])
                .lerp(new THREE.Color(this.appearance.magnitudeColors[index + 1]), value - index);
        };
        this.lines.setField(data, colorAt);
        this.vectors.setArrows(data.samples.map(sample => ({
            origin: sample.origin, direction: sample.direction, color: colorAt(sample.magnitude),
            length: data.spacing * (this.options.arrowLength === 'uniform' ? 0.55
                : 0.12 + this.intensity(sample.magnitude, data.colorMaximum) * 0.58),
            width: Math.min(0.025, data.spacing * 0.024),
        })));
    }

    private intensity(magnitude: number, maximum: number): number {
        return Math.min(1, Math.log1p(magnitude) / Math.log1p(maximum));
    }

    private notify(): void { this.listeners.forEach(listener => listener(this.state)); }

    public dispose(): void {
        this.worker.terminate(); this.listeners.clear();
        this.lines.dispose(); this.vectors.dispose(); this.probe.dispose(); this.clear();
    }
}
