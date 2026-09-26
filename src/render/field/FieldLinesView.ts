import * as THREE from 'three';
import type { FieldGeometry } from '../../core/physics/fieldVisualizationTypes';
import { FieldArrowInstances, type FieldArrow } from './FieldArrowInstances';

export class FieldLinesView extends THREE.Group {
    private readonly geometry = new THREE.BufferGeometry();
    private readonly material = new THREE.LineBasicMaterial({ vertexColors: true });
    private readonly segments = new THREE.LineSegments(this.geometry, this.material);
    private readonly arrows: FieldArrowInstances;
    private capacity = 0;

    public constructor(width: number) {
        super(); this.name = 'ElectricFieldLines';
        this.arrows = new FieldArrowInstances(width);
        this.segments.frustumCulled = false;
        this.add(this.segments, this.arrows);
    }

    public setField(data: FieldGeometry, colorAt: (magnitude: number) => THREE.Color): void {
        const vertexCount = data.lines.reduce((sum, line) => sum
            + (Math.max(0, line.points.length - 1) + Number(Boolean(line.startAnchor)) + Number(Boolean(line.endAnchor))) * 2, 0);
        if (vertexCount > this.capacity) {
            this.capacity = 2 ** Math.ceil(Math.log2(vertexCount));
            this.geometry.dispose();
            this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.capacity * 3), 3).setUsage(THREE.DynamicDrawUsage));
            this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.capacity * 3), 3).setUsage(THREE.DynamicDrawUsage));
        }
        const positions = this.geometry.getAttribute('position');
        const colors = this.geometry.getAttribute('color');
        const arrows: FieldArrow[] = [];
        let vertex = 0;
        for (const line of data.lines) {
            // Complete the visible connection under the charge mesh without evaluating
            // the singular field there. Keep the colour of the nearest valid sample.
            if (line.startAnchor) {
                const color = colorAt(line.magnitudes[0]);
                for (const point of [line.startAnchor, line.points[0]]) {
                    positions.setXYZ(vertex, ...point);
                    colors.setXYZ(vertex++, color.r, color.g, color.b);
                }
            }
            for (let index = 1; index < line.points.length; index++) {
                for (const pointIndex of [index - 1, index]) {
                    positions.setXYZ(vertex, ...line.points[pointIndex]);
                    const color = colorAt(line.magnitudes[pointIndex]);
                    colors.setXYZ(vertex++, color.r, color.g, color.b);
                }
            }
            if (line.endAnchor) {
                const lastIndex = line.points.length - 1;
                const color = colorAt(line.magnitudes[lastIndex]);
                for (const point of [line.points[lastIndex], line.endAnchor]) {
                    positions.setXYZ(vertex, ...point);
                    colors.setXYZ(vertex++, color.r, color.g, color.b);
                }
            }
            for (const fraction of [0.3, 0.7]) {
                const index = Math.max(1, Math.floor((line.points.length - 1) * fraction));
                const direction = new THREE.Vector3(...line.points[index]).sub(new THREE.Vector3(...line.points[index - 1])).normalize();
                arrows.push({ origin: line.points[index], direction: direction.toArray(),
                    length: Math.min(0.18, data.domain.halfSize * 0.025), color: colorAt(line.magnitudes[index]) });
            }
        }
        this.geometry.setDrawRange(0, vertexCount);
        if (positions) positions.needsUpdate = true;
        if (colors) colors.needsUpdate = true;
        this.arrows.setArrows(arrows);
    }

    public dispose(): void { this.geometry.dispose(); this.material.dispose(); this.arrows.dispose(); }
}
