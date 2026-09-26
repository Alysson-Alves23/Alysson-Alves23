import * as THREE from 'three';
import type { ElectricFieldReading } from '../../core/physics/types';
import type { SimulationThemeConfig } from '../types/SimulationTheme';
import { FieldArrowInstances, type FieldArrow } from './FieldArrowInstances';

export interface ProbeChargeStyle { color: string; visible: boolean; }

export class FieldProbeView extends THREE.Group {
    public readonly marker: THREE.Mesh;
    private readonly arrows: FieldArrowInstances;
    private readonly guides: THREE.LineSegments;
    private readonly guideGeometry = new THREE.BufferGeometry();

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

    public setReading(reading: ElectricFieldReading, styles: ReadonlyMap<string, ProbeChargeStyle>): void {
        this.position.set(...reading.origin);
        const shown = reading.contributions.filter(item => styles.get(item.chargeId)?.visible !== false && item.magnitude > 0);
        // One linear scale for all vectors keeps the parallelogram mathematically exact.
        const maximum = Math.max(reading.magnitude, ...reading.contributions.map(item => item.magnitude), 0);
        const factor = maximum > 0 ? 1.5 / maximum : 0;
        const arrows: FieldArrow[] = shown.map(item => ({
            origin: [0, 0, 0], direction: item.vector, length: item.magnitude * factor,
            color: new THREE.Color(styles.get(item.chargeId)?.color ?? this.appearance.guideColor),
        }));
        if (reading.magnitude > 0) arrows.push({ origin: [0, 0, 0], direction: reading.vector,
            length: reading.magnitude * factor, color: new THREE.Color(this.appearance.resultColor), width: this.appearance.arrowWidth * 2.4 });
        this.arrows.setArrows(arrows);
        const nonzero = reading.contributions.filter(item => item.magnitude > 0);
        this.guides.visible = shown.length === 2 && nonzero.length === 2;
        if (this.guides.visible) {
            const result = new THREE.Vector3(...reading.vector).multiplyScalar(factor);
            this.guideGeometry.setFromPoints(shown.flatMap(item => [new THREE.Vector3(...item.vector).multiplyScalar(factor), result]));
            this.guides.computeLineDistances();
        }
    }

    public dispose(): void {
        this.marker.geometry.dispose(); (this.marker.material as THREE.Material).dispose();
        this.arrows.dispose(); this.guideGeometry.dispose(); (this.guides.material as THREE.Material).dispose();
    }
}
