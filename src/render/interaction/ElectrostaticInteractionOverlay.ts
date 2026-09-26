import * as THREE from 'three';
import type {
    ElectrostaticDistanceGuide,
    ElectrostaticForceVector,
    ElectrostaticVisualization,
} from '../../core/physics/types';
import type { VisualizationVisibility } from '../types/VisualizationVisibility';
import type { SimulationThemeConfig } from '../types/SimulationTheme';
import { FieldArrowInstances } from '../field/FieldArrowInstances';

const GUIDE_COLOR = 0xc4ceda;
const VISUAL_OFFSET = 0.06;

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
    public readonly forceVectorsGroup: FieldArrowInstances;
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

    public constructor(private readonly appearance: SimulationThemeConfig['force']) {
        super();

        this.name = 'ElectrostaticInteractionOverlay';
        this.forceVectorsGroup = new FieldArrowInstances(appearance.arrowWidth);
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
        this.forceVectorsGroup.setArrows([]);
        this.interactionGuidesGroup.children.forEach(child => disposeVisualResources(child));
        this.interactionGuidesGroup.clear();
    }

    public dispose(): void {
        this.clearVisualGroups();
        this.forceVectorsGroup.dispose();
        this.clear();
    }

    private isLayerVisible(chargeId: string, layer: keyof VisualizationVisibility): boolean {
        return this.chargeVisibility.get(chargeId)?.[layer] ?? true;
    }

    private renderForceVectors(vectors: readonly ElectrostaticForceVector[]): void {
        const finiteVectors = vectors.filter(vector => Number.isFinite(vector.magnitude) && vector.magnitude > 0);
        // Like the probe, all arrows share a linear scale. Include hidden vectors in
        // the reference so toggling visibility never resizes the remaining arrows.
        const maximum = finiteVectors.reduce((value, vector) => Math.max(value, vector.magnitude), 0);
        const color = new THREE.Color(this.appearance.color);
        this.forceVectorsGroup.setArrows(finiteVectors
            .filter(vector => this.isLayerVisible(vector.chargeId, 'forceVectors'))
            .map(vector => ({
                origin: vector.origin,
                direction: vector.direction,
                length: (vector.magnitude / maximum) * this.appearance.maximumLength,
                color,
            })));
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
