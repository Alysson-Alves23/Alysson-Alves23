import * as THREE from 'three';
import type {
    ElectrostaticDistanceGuide,
    ElectrostaticForceVector,
    ElectrostaticVisualization,
} from '../../core/physics/types';
import type { VisualizationVisibility } from '../types/VisualizationVisibility';

const FORCE_COLOR = 0xffb347;
const GUIDE_COLOR = 0xc4ceda;
const VISUAL_OFFSET = 0.06;

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
}

function disposeVisualResources(root: THREE.Object3D): void {
    root.traverse((object) => {
        if (
            object instanceof THREE.Mesh
            || object instanceof THREE.Line
            || object instanceof THREE.Points
        ) {
            object.geometry.dispose();
        }

        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
            if (Array.isArray(object.material)) {
                object.material.forEach((material) => material.dispose());
            } else {
                object.material.map?.dispose();
                object.material.dispose();
            }
        }
    });
}

export class ElectrostaticInteractionOverlay extends THREE.Group {
    public readonly forceVectorsGroup = new THREE.Group();
    public readonly interactionGuidesGroup = new THREE.Group();

    private globalVisibility: VisualizationVisibility = {
        electricField: false,
        forceVectors: false,
        distanceGuide: false,
    };
    private visualization: ElectrostaticVisualization = {
        electricField: [],
        forceVectors: [],
        distanceGuides: [],
    };
    private chargeVisibility = new Map<string, VisualizationVisibility>();
    private lastSignature = '';

    public constructor() {
        super();

        this.name = 'ElectrostaticInteractionOverlay';
        this.forceVectorsGroup.name = 'ForceVectors';
        this.interactionGuidesGroup.name = 'InteractionGuides';
        this.add(
            this.forceVectorsGroup,
            this.interactionGuidesGroup,
        );
    }

    public setGlobalVisibility(visibility: VisualizationVisibility): void {
        this.globalVisibility = { ...visibility };
    }

    public setVisualization(
        visualization: ElectrostaticVisualization,
        chargeVisibility: ReadonlyMap<string, VisualizationVisibility>,
    ): void {
        this.visualization = visualization;
        this.chargeVisibility = new Map(chargeVisibility);
    }

    public update(): void {
        const signature = JSON.stringify({
            globalVisibility: this.globalVisibility,
            visualization: this.visualization,
            chargeVisibility: Array.from(this.chargeVisibility.entries()),
        });

        if (signature === this.lastSignature) {
            return;
        }

        this.lastSignature = signature;
        this.clearVisualGroups();

        if (this.globalVisibility.forceVectors) {
            this.renderForceVectors(this.visualization.forceVectors);
        }

        if (this.globalVisibility.distanceGuide) {
            this.renderDistanceGuides(this.visualization.distanceGuides);
        }
    }

    private clearVisualGroups(): void {
        [
            this.forceVectorsGroup,
            this.interactionGuidesGroup,
        ].forEach((group) => {
            group.children.forEach((child) => disposeVisualResources(child));
            group.clear();
        });
    }

    private isLayerVisible(chargeId: string, layer: keyof VisualizationVisibility): boolean {
        return this.chargeVisibility.get(chargeId)?.[layer] ?? true;
    }

    private renderForceVectors(vectors: readonly ElectrostaticForceVector[]): void {
        vectors.forEach((vector) => {
            if (!this.isLayerVisible(vector.chargeId, 'forceVectors')) {
                return;
            }

            const length = clamp(0.12 + Math.log1p(vector.magnitude / 0.001) * 0.12, 0.12, 0.5);
            const origin = new THREE.Vector3(
                vector.origin[0],
                vector.origin[1],
                vector.origin[2],
            );
            const arrow = new THREE.ArrowHelper(
                new THREE.Vector3(...vector.direction),
                origin,
                length,
                FORCE_COLOR,
                length * 0.32,
                length * 0.2,
            );
            arrow.name = `ElectrostaticForceVector:${vector.chargeId}`;
            this.configureArrow(arrow);
            this.forceVectorsGroup.add(arrow);
        });
    }

    private configureArrow(arrow: THREE.ArrowHelper): void {
        arrow.renderOrder = 10;
        [arrow.line, arrow.cone].forEach((object) => {
            const materials = Array.isArray(object.material)
                ? object.material
                : [object.material];
            materials.forEach((material) => {
                material.depthTest = false;
                material.depthWrite = false;
            });
        });
    }

    private renderDistanceGuides(guides: readonly ElectrostaticDistanceGuide[]): void {
        guides.forEach((guide) => {
            if (
                !this.isLayerVisible(guide.firstChargeId, 'distanceGuide')
                && !this.isLayerVisible(guide.secondChargeId, 'distanceGuide')
            ) {
                return;
            }

            const line = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(guide.start[0], guide.start[1], guide.start[2]),
                    new THREE.Vector3(guide.end[0], guide.end[1], guide.end[2]),
                ]),
                new THREE.LineDashedMaterial({
                    color: GUIDE_COLOR,
                    dashSize: 0.1,
                    gapSize: 0.07,
                    transparent: true,
                    opacity: 0.7,
                    depthTest: false,
                    depthWrite: false,
                }),
            );
            line.computeLineDistances();
            line.name = 'RadialInteractionLine';
            line.renderOrder = 10;
            this.interactionGuidesGroup.add(line);

            const midpoint = new THREE.Vector3(
                (guide.start[0] + guide.end[0]) / 2,
                (guide.start[1] + guide.end[1]) / 2 + VISUAL_OFFSET + 0.12,
                (guide.start[2] + guide.end[2]) / 2,
            );
            const label = this.createDistanceLabel(`r = ${guide.distance.toFixed(2)} m`);
            label.position.copy(midpoint);
            this.interactionGuidesGroup.add(label);
        });
    }

    private createDistanceLabel(text: string): THREE.Sprite {
        const canvas = document.createElement('canvas');
        canvas.width = 384;
        canvas.height = 72;
        const context = canvas.getContext('2d');

        if (context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.font = '600 28px Inter, Arial, sans-serif';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillStyle = '#f2f6fb';
            context.shadowColor = 'rgba(7, 11, 17, 0.85)';
            context.shadowBlur = 7;
            context.fillText(text, canvas.width / 2, canvas.height / 2);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.25, 0.235, 1);
        sprite.name = 'DistanceLabel';
        return sprite;
    }
}
