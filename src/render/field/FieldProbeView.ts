import * as THREE from 'three';
import type { SimulationThemeConfig } from '../types/SimulationTheme';
import type { FieldProbeReading } from '../types/FieldDisplayOptions';
import { FieldArrowInstances, type FieldArrow } from './FieldArrowInstances';
import type { MeasurementLabelData } from '../annotations/MeasurementLabelLayer';
import { formatMeasurement } from '../annotations/MeasurementLabelLayer';

export interface ProbeChargeStyle { color: string; visible: boolean; }

export class FieldProbeView extends THREE.Group {
    public readonly marker: THREE.Mesh;
    private readonly arrows: FieldArrowInstances;
    private readonly guides: THREE.LineSegments;
    private readonly guideGeometry = new THREE.BufferGeometry();
    private currentReading: FieldProbeReading | null = null;

    public constructor(private readonly appearance: SimulationThemeConfig['field']) {
        super(); this.name = 'ElectricFieldProbe';
        this.marker = new THREE.Mesh(new THREE.SphereGeometry(appearance.probeRadius, 16, 12),
            new THREE.MeshBasicMaterial({ color: appearance.probeColor, depthTest: false }));
        this.marker.renderOrder = 30;
        this.arrows = new FieldArrowInstances(appearance.arrowWidth * 1.4);
        this.guides = new THREE.LineSegments(this.guideGeometry,
            new THREE.LineDashedMaterial({ color: appearance.guideColor, dashSize: 0.07, gapSize: 0.045 }));
        this.guides.frustumCulled = false;
        this.add(this.marker, this.arrows, this.guides);
    }

    public setReading(reading: FieldProbeReading, styles: ReadonlyMap<string, ProbeChargeStyle>): void {
        this.currentReading = reading;
        this.position.set(...reading.positionInMeters);
        const shown = reading.contributions.filter(item =>
            styles.get(item.chargeId)?.visible !== false && item.fieldStrengthNewtonsPerCoulomb > 0,
        );
        // One linear scale for all vectors keeps the parallelogram mathematically exact.
        const maximum = Math.max(
            reading.fieldStrengthNewtonsPerCoulomb,
            ...reading.contributions.map(item => item.fieldStrengthNewtonsPerCoulomb),
            0,
        );
        const factor = maximum > 0 ? 1.5 / maximum : 0;
        const arrows: FieldArrow[] = shown.map(item => ({
            origin: [0, 0, 0],
            direction: item.electricFieldVector,
            length: item.fieldStrengthNewtonsPerCoulomb * factor,
            color: new THREE.Color(styles.get(item.chargeId)?.color ?? this.appearance.guideColor),
            measurement: {
                id: `probe-field:${item.chargeId}`,
                text: `|E(${item.chargeId})| = ${formatMeasurement(item.fieldStrengthNewtonsPerCoulomb, 'N/C')}`,
                kind: 'field',
                ownerChargeIds: [item.chargeId],
            },
        }));
        if (reading.fieldStrengthNewtonsPerCoulomb > 0) arrows.push({
            origin: [0, 0, 0],
            direction: reading.electricFieldVector,
            length: reading.fieldStrengthNewtonsPerCoulomb * factor,
            color: new THREE.Color(this.appearance.resultColor),
            width: this.appearance.arrowWidth * 2.4,
            measurement: {
                id: 'probe-field-result',
                text: `|E| = ${formatMeasurement(reading.fieldStrengthNewtonsPerCoulomb, 'N/C')}`,
                kind: 'field',
            },
        });
        this.arrows.setArrows(arrows);
        const nonzero = reading.contributions.filter(item => item.fieldStrengthNewtonsPerCoulomb > 0);
        this.guides.visible = shown.length === 2 && nonzero.length === 2;
        if (this.guides.visible) {
            const result = new THREE.Vector3(...reading.electricFieldVector).multiplyScalar(factor);
            this.guideGeometry.setFromPoints(shown.flatMap(item => [
                new THREE.Vector3(...item.electricFieldVector).multiplyScalar(factor),
                result,
            ]));
            this.guides.computeLineDistances();
        }
    }

    public getArrowInstances(): FieldArrowInstances {
        return this.arrows;
    }

    public getMeasurementAnnotations(): MeasurementLabelData[] {
        const annotations = [...this.arrows.getMeasurementAnnotations()];
        if (this.currentReading?.status === 'valid'
            && this.currentReading.fieldStrengthNewtonsPerCoulomb === 0) {
            const position = this.getWorldPosition(new THREE.Vector3());
            annotations.push({
                id: 'probe-field-result',
                text: `|E| = ${formatMeasurement(0, 'N/C')}`,
                position: position.toArray() as [number, number, number],
                kind: 'field',
            });
        }
        return annotations;
    }

    public dispose(): void {
        this.marker.geometry.dispose(); (this.marker.material as THREE.Material).dispose();
        this.arrows.dispose(); this.guideGeometry.dispose(); (this.guides.material as THREE.Material).dispose();
    }
}
