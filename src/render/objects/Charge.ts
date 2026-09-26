import * as THREE from 'three';
import { SimulationSceneObject } from '../scene/SimulationSceneObject';
import type { ChargeAppearance } from '../types/SimulationTheme';

export interface ChargeOptions {
    id: string;
    value: number;
    position?: THREE.Vector3;
}

export class Charge extends SimulationSceneObject {
    private value: number;
    private readonly appearance: ChargeAppearance;
    private readonly body: THREE.Mesh<
        THREE.SphereGeometry,
        THREE.MeshStandardMaterial
    >;
    private readonly halo: THREE.Mesh<
        THREE.SphereGeometry,
        THREE.MeshBasicMaterial
    >;

    public constructor(
        { id, value, position }: ChargeOptions,
        appearance: ChargeAppearance,
    ) {
        super(`Charge:${id}`);

        this.value = value;
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
        this.halo = new THREE.Mesh(
            new THREE.SphereGeometry(
                appearance.bodyRadius,
                appearance.haloWidthSegments,
                appearance.haloHeightSegments,
            ),
            new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: appearance.haloOpacity,
                wireframe: appearance.haloWireframe,
            }),
        );
        this.halo.scale.setScalar(appearance.haloScale);

        this.add(this.halo, this.body);
        this.updateColor();

        if (position) {
            this.position.copy(position);
        }
    }

    public setValue(value: number): void {
        this.value = value;
        this.updateColor();
    }

    private updateColor(): void {
        const color = this.value >= 0
            ? this.appearance.positiveColor
            : this.appearance.negativeColor;

        this.body.material.color.set(color);
        this.halo.material.color.set(color);
    }
}
