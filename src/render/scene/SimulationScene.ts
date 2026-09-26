import * as THREE from 'three';
import {
    ElectrostaticVisualizationCalculator,
} from '../../core/physics/Electrostatics';
import type {
    ElectrostaticVisualization,
} from '../../core/physics/types';
import {
    Charge,
    type ChargeOptions,
} from '../objects/Charge';
import { ElectrostaticInteractionOverlay } from '../interaction/ElectrostaticInteractionOverlay';
import type { SimulationThemeConfig } from '../types/SimulationTheme';
import type { VisualizationVisibility } from '../types/VisualizationVisibility';

export class SimulationScene extends THREE.Scene {
    public readonly environmentGroup = new THREE.Group();
    public readonly chargesGroup = new THREE.Group();
    public readonly electrostaticInteractionOverlay: ElectrostaticInteractionOverlay;
    public readonly electricFieldGroup: THREE.Group;
    public readonly forceVectorsGroup: THREE.Group;
    public readonly interactionGuidesGroup: THREE.Group;

    private readonly theme: SimulationThemeConfig;
    private readonly electrostaticCalculator = new ElectrostaticVisualizationCalculator();
    private electrostaticVisualization: ElectrostaticVisualization = {
        electricField: [],
        forceVectors: [],
        distanceGuides: [],
    };
    private lastPhysicsSignature = '';

    public constructor(theme: SimulationThemeConfig) {
        super();

        this.theme = theme;
        this.name = 'SimulationScene';
        this.environmentGroup.name = 'Environment';
        this.chargesGroup.name = 'Charges';
        this.electrostaticInteractionOverlay = new ElectrostaticInteractionOverlay();
        this.electricFieldGroup = this.electrostaticInteractionOverlay.electricFieldGroup;
        this.forceVectorsGroup = this.electrostaticInteractionOverlay.forceVectorsGroup;
        this.interactionGuidesGroup = this.electrostaticInteractionOverlay.interactionGuidesGroup;

        this.add(
            this.environmentGroup,
            this.chargesGroup,
            this.electrostaticInteractionOverlay,
        );

        this.buildEnvironment(theme);
    }

    public addCharge(charge: Charge): void {
        this.chargesGroup.add(charge);
    }

    public createCharge(options: ChargeOptions): Charge {
        const charge = new Charge(options, this.theme.charge);
        this.addCharge(charge);
        return charge;
    }

    public removeCharge(charge: Charge): void {
        this.chargesGroup.remove(charge);
        charge.dispose();
    }

    public setGlobalVisualizationVisibility(
        visibility: VisualizationVisibility,
    ): void {
        this.electrostaticInteractionOverlay.setGlobalVisibility(visibility);
    }

    public updateVisualizations(): void {
        this.updateMatrixWorld(true);
        const charges = this.chargesGroup.children
            .filter((object): object is Charge => object instanceof Charge)
            .map((charge) => {
                const worldPosition = charge.getWorldPosition(new THREE.Vector3());

                return {
                    id: charge.chargeId,
                    value: charge.getValue(),
                    position: [worldPosition.x, worldPosition.y, worldPosition.z] as const,
                };
            });
        const physicsSignature = JSON.stringify(charges);

        if (physicsSignature !== this.lastPhysicsSignature) {
            this.lastPhysicsSignature = physicsSignature;
            this.electrostaticVisualization = this.electrostaticCalculator.calculate(charges);
        }

        const chargeVisibility = new Map(
            this.chargesGroup.children
                .filter((object): object is Charge => object instanceof Charge)
                .map((charge) => [charge.chargeId, charge.getVisibility()] as const),
        );
        this.electrostaticInteractionOverlay.setVisualization(
            this.electrostaticVisualization,
            chargeVisibility,
        );
        this.electrostaticInteractionOverlay.update();
    }

    private buildEnvironment(theme: SimulationThemeConfig): void {
        this.background = new THREE.Color(theme.background);

        this.createGrid(theme);

        const axes = new THREE.AxesHelper(theme.axes.size);
        axes.name = 'CoordinateAxes';
        this.environmentGroup.add(axes);

        const ambientLight = new THREE.AmbientLight(
            theme.lighting.ambientColor,
            theme.lighting.ambientIntensity,
        );
        ambientLight.name = 'AmbientLight';
        this.environmentGroup.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(
            theme.lighting.keyLightColor,
            theme.lighting.keyLightIntensity,
        );
        keyLight.name = 'KeyLight';
        keyLight.position.set(
            theme.lighting.keyLightPosition.x,
            theme.lighting.keyLightPosition.y,
            theme.lighting.keyLightPosition.z,
        );
        this.environmentGroup.add(keyLight);
    }

    private createGrid(theme: SimulationThemeConfig): void {
        const grid = new THREE.GridHelper(
            theme.grid.size,
            theme.grid.divisions,
            new THREE.Color(theme.grid.centerLine),
            new THREE.Color(theme.grid.gridLines)
        );
        grid.name = 'CoordinateGrid';
        this.environmentGroup.add(grid);
    }
}
