import * as THREE from 'three';
import { CSS2DObject } from 'three-stdlib';
import type { CartesianCoordinates } from '../../core/physics/electrostatics/types';

export type MeasurementLabelKind = 'charge' | 'force' | 'field' | 'field-sample';

export interface MeasurementLabelData {
    id: string;
    text: string;
    position: CartesianCoordinates;
    kind: MeasurementLabelKind;
    ownerChargeIds?: readonly string[];
}

const measurementNumberFormatter = new Intl.NumberFormat('pt-BR', {
    maximumSignificantDigits: 4,
});

interface MeasurementLabelObject {
    object: CSS2DObject;
    element: HTMLDivElement;
    text: string;
    ownerChargeIds: readonly string[];
}

export function formatMeasurement(value: number, unit: string): string {
    return `${measurementNumberFormatter.format(value)} ${unit}`;
}

export class MeasurementLabelLayer extends THREE.Group {
    private static readonly maximumVisibleFieldSamples = 36;
    private readonly labels = new Map<string, MeasurementLabelObject>();
    private readonly annotationData = new Map<string, MeasurementLabelData>();
    private selectedChargeIds = new Set<string>();
    private hoveredLabelId: string | null = null;
    private showAllLabels = false;
    private camera: THREE.Camera | null = null;
    private viewportWidth = 1;
    private viewportHeight = 1;

    public constructor() {
        super();
        this.name = 'MeasurementLabels';
        this.renderOrder = 100;
    }

    public setAnnotations(annotations: readonly MeasurementLabelData[]): void {
        this.annotationData.clear();
        annotations.forEach(annotation => this.annotationData.set(annotation.id, annotation));
        this.synchronizeLabels();
        this.updateLabelVisibility();
    }

    public setShowAll(showAll: boolean): void {
        this.showAllLabels = showAll;
        this.synchronizeLabels();
        this.updateLabelVisibility();
    }

    public setSelectedChargeIds(chargeIds: readonly string[]): void {
        this.selectedChargeIds = new Set(chargeIds);
        this.updateLabelVisibility();
    }

    public setHoveredLabelId(labelId: string | null): void {
        if (this.hoveredLabelId === labelId) return;
        this.hoveredLabelId = labelId;
        this.synchronizeLabels();
        this.updateLabelVisibility();
    }

    public updateLayout(camera: THREE.Camera, width: number, height: number): void {
        this.camera = camera;
        this.viewportWidth = width;
        this.viewportHeight = height;
        camera.updateMatrixWorld();
        this.updateMatrixWorld(true);
        this.updateLabelVisibility();
    }

    public dispose(): void {
        this.labels.forEach((label) => this.remove(label.object));
        this.labels.clear();
        this.annotationData.clear();
        this.clear();
    }

    private synchronizeLabels(): void {
        const requestedLabelIds = new Set<string>();
        const fieldSamples: MeasurementLabelData[] = [];

        this.annotationData.forEach((annotation) => {
            if (annotation.kind === 'field-sample') {
                fieldSamples.push(annotation);
            } else {
                requestedLabelIds.add(annotation.id);
            }
        });

        if (this.showAllLabels && fieldSamples.length > 0) {
            const labelCount = Math.min(
                fieldSamples.length,
                MeasurementLabelLayer.maximumVisibleFieldSamples,
            );
            for (let index = 0; index < labelCount; index += 1) {
                const distributedIndex = Math.floor(
                    ((index + 0.5) * fieldSamples.length) / labelCount,
                );
                requestedLabelIds.add(fieldSamples[distributedIndex].id);
            }
        }

        if (this.hoveredLabelId && this.annotationData.has(this.hoveredLabelId)) {
            requestedLabelIds.add(this.hoveredLabelId);
        } else {
            this.hoveredLabelId = null;
        }

        requestedLabelIds.forEach((id) => {
            const annotation = this.annotationData.get(id);
            if (!annotation) return;

            let label = this.labels.get(id);
            if (!label) {
                label = this.createLabel(annotation);
                this.labels.set(id, label);
                this.add(label.object);
            }

            label.object.position.set(...annotation.position);
            label.ownerChargeIds = annotation.ownerChargeIds ?? [];

            if (label.text !== annotation.text) {
                label.text = annotation.text;
                label.element.textContent = annotation.text;
                label.element.title = annotation.text;
            }
        });

        this.labels.forEach((label, id) => {
            if (requestedLabelIds.has(id)) return;
            this.remove(label.object);
            this.labels.delete(id);
        });
    }

    private createLabel(annotation: MeasurementLabelData): MeasurementLabelObject {
        const element = document.createElement('div');
        element.className = 'simulation-measurement-label';
        element.dataset.kind = annotation.kind;
        element.setAttribute('aria-hidden', 'true');
        element.textContent = annotation.text;
        element.title = annotation.text;
        const accentColor = annotation.kind === 'force'
            ? '#bd7d16'
            : annotation.kind === 'field'
                ? '#168b99'
                : '#3478c8';
        Object.assign(element.style, {
            padding: '4px 8px',
            color: '#17212e',
            background: 'rgba(255, 255, 255, 0.97)',
            border: '1px solid #c5ced8',
            borderLeft: `3px solid ${accentColor}`,
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)',
            font: '700 13px/1.3 Inter, ui-sans-serif, system-ui, sans-serif',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
        });

        const object = new CSS2DObject(element);
        object.center.set(0.5, 1);
        object.visible = false;

        return {
            object,
            element,
            text: annotation.text,
            ownerChargeIds: annotation.ownerChargeIds ?? [],
        };
    }

    private updateLabelVisibility(): void {
        const selectedLabels: string[] = [];

        this.labels.forEach((label, id) => {
            const belongsToSelection = label.ownerChargeIds.some(chargeId =>
                this.selectedChargeIds.has(chargeId),
            );
            const isHovered = id === this.hoveredLabelId;
            label.object.visible = false;

            if (isHovered || belongsToSelection) {
                selectedLabels.push(id);
            } else if (this.showAllLabels) {
                selectedLabels.push(id);
            }
        });

        if (!this.camera) {
            selectedLabels.forEach(id => {
                const label = this.labels.get(id);
                if (label) label.object.visible = true;
            });
            return;
        }

        const occupiedRegions: Array<{ left: number; right: number; top: number; bottom: number }> = [];
        const orderedLabels = selectedLabels
            .map(id => ({ id, label: this.labels.get(id) }))
            .filter((entry): entry is { id: string; label: MeasurementLabelObject } => Boolean(entry.label))
            .sort((first, second) => this.priority(first.id, first.label) - this.priority(second.id, second.label));

        orderedLabels.forEach(({ label }) => {
            const region = this.screenRegion(label);
            if (!region || occupiedRegions.some(occupied => this.regionsOverlap(region, occupied))) return;
            occupiedRegions.push(region);
            label.object.visible = true;
        });
    }

    private priority(id: string, label: MeasurementLabelObject): number {
        if (id === this.hoveredLabelId) return 0;
        if (label.ownerChargeIds.some(chargeId => this.selectedChargeIds.has(chargeId))) return 1;
        if (label.element.dataset.kind === 'charge') return 2;
        if (label.element.dataset.kind === 'force') return 3;
        if (label.element.dataset.kind === 'field') return 4;
        return 5;
    }

    private screenRegion(label: MeasurementLabelObject): { left: number; right: number; top: number; bottom: number } | null {
        if (!this.camera) return null;

        const projectedPosition = label.object.getWorldPosition(new THREE.Vector3()).project(this.camera);
        if (projectedPosition.z < -1 || projectedPosition.z > 1
            || Math.abs(projectedPosition.x) > 1 || Math.abs(projectedPosition.y) > 1) return null;

        const screenX = (projectedPosition.x + 1) * this.viewportWidth / 2;
        const screenY = (1 - projectedPosition.y) * this.viewportHeight / 2;
        const labelWidth = Math.max(56, (label.text.length * 7.2) + 22);
        const labelHeight = 27;

        return {
            left: screenX - labelWidth / 2 - 3,
            right: screenX + labelWidth / 2 + 3,
            top: screenY - labelHeight - 3,
            bottom: screenY + 3,
        };
    }

    private regionsOverlap(
        first: { left: number; right: number; top: number; bottom: number },
        second: { left: number; right: number; top: number; bottom: number },
    ): boolean {
        return first.left < second.right
            && first.right > second.left
            && first.top < second.bottom
            && first.bottom > second.top;
    }
}
