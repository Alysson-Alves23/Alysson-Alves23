import * as THREE from 'three';
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

    public constructor(theme: SimulationThemeConfig) {
        super();

        this.theme = theme;
        this.name = 'SimulationScene';
        this.environmentGroup.name = 'Environment';
        this.chargesGroup.name = 'Charges';
        this.electrostaticInteractionOverlay = new ElectrostaticInteractionOverlay(
            this.chargesGroup,
        );
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
