import * as THREE from 'three';
import { SimulationSceneObject } from '../scene/SimulationSceneObject';
import type { ChargeAppearance } from '../types/SimulationTheme';
import {
    defaultVisualizationVisibility,
    type VisualizationVisibility,
} from '../types/VisualizationVisibility';

export interface ChargeOptions {
    id: string;
    value: number;
    color?: string;
    position?: THREE.Vector3;
    visibility?: VisualizationVisibility;
}

export class Charge extends SimulationSceneObject {
    public readonly chargeId: string;
    private value: number;
    private color: string;
    private visualizationVisibility: VisualizationVisibility;
    private readonly body: THREE.Mesh<
        THREE.SphereGeometry,
        THREE.MeshStandardMaterial
    >;
    private readonly selectionIndicator: THREE.Sprite;
    private readonly selectionTexture: THREE.CanvasTexture;

    public constructor(
        { id, value, color, position, visibility }: ChargeOptions,
        appearance: ChargeAppearance,
    ) {
        super(`Charge:${id}`);

        this.chargeId = id;
        this.value = value;
        this.visualizationVisibility = {
            ...defaultVisualizationVisibility,
            ...visibility,
        };
        this.color = color ?? String(
            value >= 0 ? appearance.positiveColor : appearance.negativeColor,
        );
        this.body = new THREE.Mesh(
            new THREE.SphereGeometry(
                appearance.bodyRadius,
                appearance.bodyWidthSegments,
                appearance.bodyHeightSegments,
            ),
            new THREE.MeshStandardMaterial({
                roughness: appearance.bodyRoughness,
                metalness: appearance.bodyMetalness,
            }),
        );

        const selectionCanvas = document.createElement('canvas');
        selectionCanvas.width = 64;
        selectionCanvas.height = 64;
        const selectionContext = selectionCanvas.getContext('2d');

        if (!selectionContext) {
            throw new Error('Não foi possível criar o indicador de seleção da carga.');
        }

        selectionContext.strokeStyle = '#1d65ad';
        selectionContext.lineWidth = 5;
        selectionContext.beginPath();
        selectionContext.arc(32, 32, 25, 0, Math.PI * 2);
        selectionContext.stroke();

        this.selectionTexture = new THREE.CanvasTexture(selectionCanvas);
        this.selectionTexture.colorSpace = THREE.SRGBColorSpace;
        this.selectionIndicator = new THREE.Sprite(new THREE.SpriteMaterial({
            map: this.selectionTexture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        }));
        this.selectionIndicator.scale.setScalar(appearance.bodyRadius * 2.8);
        this.selectionIndicator.renderOrder = 20;
        this.selectionIndicator.visible = false;

        this.add(this.body);
        this.add(this.selectionIndicator);
        this.updateColor();

        if (position) {
            this.position.copy(position);
        }
    }

    public setValue(value: number): void {
        this.value = value;
        this.updateColor();
    }

    public getValue(): number {
        return this.value;
    }

    public setColor(color: string): void {
        this.color = color;
        this.updateColor();
    }

    public getColor(): string {
        return this.color;
    }

    public setVisibility(visibility: VisualizationVisibility): void {
        this.visualizationVisibility = { ...visibility };
    }

    public getVisibility(): VisualizationVisibility {
        return { ...this.visualizationVisibility };
    }

    public setSelected(selected: boolean): void {
        this.selectionIndicator.visible = selected;
    }

    public isSelected(): boolean {
        return this.selectionIndicator.visible;
    }

    public dispose(): void {
        this.body.geometry.dispose();
        this.body.material.dispose();
        this.selectionTexture.dispose();
        this.selectionIndicator.material.dispose();
    }

    private updateColor(): void {
        this.body.material.color.set(this.color);
    }
}
