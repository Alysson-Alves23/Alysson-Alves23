import * as THREE from 'three';
import { SimulationSceneObject } from '../scene/SimulationSceneObject';
import type { ChargeAppearance } from '../types/SimulationTheme';

export interface ChargeOptions {
    id: string;
    value: number;
    color?: string;
    position?: THREE.Vector3;
}

export class Charge extends SimulationSceneObject {
    public readonly chargeId: string;
    private value: number;
    private color: string;
    private readonly appearance: ChargeAppearance;
    private readonly body: THREE.Mesh<
        THREE.SphereGeometry,
        THREE.MeshStandardMaterial
    >;

    public constructor(
        { id, value, color, position }: ChargeOptions,
        appearance: ChargeAppearance,
    ) {
        super(`Charge:${id}`);

        this.chargeId = id;
        this.value = value;
        this.color = color ?? String(
            value >= 0 ? appearance.positiveColor : appearance.negativeColor,
        );
        this.appearance = appearance;
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

        this.add(this.body);
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

    public dispose(): void {
        this.body.geometry.dispose();
        this.body.material.dispose();
    }

    private updateColor(): void {
        this.body.material.color.set(this.color);
    }
}
