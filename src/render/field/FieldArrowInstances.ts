import * as THREE from 'three';
import type { CartesianCoordinates } from '../../core/physics/electrostatics/types';
import type { MeasurementLabelData } from '../annotations/MeasurementLabelLayer';

export interface FieldArrowMeasurement {
    id: string;
    text: string;
    kind: MeasurementLabelData['kind'];
    ownerChargeIds?: readonly string[];
}

export interface FieldArrow {
    origin: CartesianCoordinates;
    direction: CartesianCoordinates;
    length: number;
    color: THREE.Color;
    width?: number;
    measurement?: FieldArrowMeasurement;
}

/** Shared geometry and two draw calls for the complete vector grid. */
export class FieldArrowInstances extends THREE.Group {
    private readonly shaftGeometry = new THREE.CylinderGeometry(1, 1, 1, 6);
    private readonly headGeometry = new THREE.ConeGeometry(1, 1, 8);
    private readonly material = new THREE.MeshBasicMaterial();
    private shafts!: THREE.InstancedMesh;
    private heads!: THREE.InstancedMesh;
    private capacity = 0;
    private readonly transform = new THREE.Object3D();
    private readonly cylinderAxis = new THREE.Vector3(0, 1, 0);
    private arrows: readonly FieldArrow[] = [];
    private measurementAnnotations: MeasurementLabelData[] | null = null;

    public constructor(private readonly width: number) { super(); this.allocate(1); }

    public setArrows(arrows: readonly FieldArrow[]): void {
        this.arrows = arrows;
        this.measurementAnnotations = null;
        if (arrows.length > this.capacity) this.allocate(2 ** Math.ceil(Math.log2(arrows.length)));
        this.shafts.count = this.heads.count = arrows.length;
        arrows.forEach((arrow, index) => {
            const direction = new THREE.Vector3(...arrow.direction).normalize();
            const origin = new THREE.Vector3(...arrow.origin);
            const headLength = arrow.length * 0.28;
            const shaftLength = arrow.length - headLength;
            const width = Math.min(arrow.width ?? this.width, arrow.length * 0.075);
            this.transform.quaternion.setFromUnitVectors(this.cylinderAxis, direction);
            this.transform.position.copy(origin).addScaledVector(direction, shaftLength / 2);
            this.transform.scale.set(width, shaftLength, width);
            this.transform.updateMatrix();
            this.shafts.setMatrixAt(index, this.transform.matrix);
            this.shafts.setColorAt(index, arrow.color);
            this.transform.position.copy(origin).addScaledVector(direction, shaftLength + headLength / 2);
            this.transform.scale.set(width * 3.2, headLength, width * 3.2);
            this.transform.updateMatrix();
            this.heads.setMatrixAt(index, this.transform.matrix);
            this.heads.setColorAt(index, arrow.color);
        });
        for (const mesh of [this.shafts, this.heads]) {
            mesh.instanceMatrix.needsUpdate = true;
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
    }

    public getMeasurementAnnotations(): MeasurementLabelData[] {
        if (this.measurementAnnotations) return this.measurementAnnotations;

        this.updateWorldMatrix(true, false);
        this.measurementAnnotations = this.arrows.flatMap((arrow) => {
            if (!arrow.measurement) return [];

            const position = new THREE.Vector3(...arrow.origin).addScaledVector(
                new THREE.Vector3(...arrow.direction).normalize(),
                arrow.length * 0.7,
            );
            position.applyMatrix4(this.matrixWorld);

            return [{
                ...arrow.measurement,
                position: position.toArray() as CartesianCoordinates,
            }];
        });
        return this.measurementAnnotations;
    }

    public getMeasurementIdAt(instanceId: number): string | null {
        return this.arrows[instanceId]?.measurement?.id ?? null;
    }

    private allocate(capacity: number): void {
        this.shafts?.dispose(); this.heads?.dispose(); this.clear();
        this.capacity = capacity;
        this.shafts = new THREE.InstancedMesh(this.shaftGeometry, this.material, capacity);
        this.heads = new THREE.InstancedMesh(this.headGeometry, this.material, capacity);
        for (const mesh of [this.shafts, this.heads]) {
            mesh.frustumCulled = false;
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            mesh.count = 0;
            this.add(mesh);
        }
    }

    public dispose(): void {
        this.shafts.dispose(); this.heads.dispose();
        this.shaftGeometry.dispose(); this.headGeometry.dispose(); this.material.dispose();
    }
}
