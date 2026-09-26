import * as THREE from 'three';
import { MICROCOULOMB, electrostaticCalculationDefaults } from '../../core/physics/constants';
import { ElectricFieldView } from '../field/ElectricFieldView';
import { planeAxes } from '../field/FieldSampling';
import type { FieldDisplayOptions } from '../types/FieldDisplayOptions';
import { ElectrostaticInteractionCalculator } from '../../core/physics/Electrostatics';
import type { ElectrostaticInteractionResults } from '../../core/physics/types';
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
    public readonly fieldView: ElectricFieldView;

    private readonly theme: SimulationThemeConfig;
    private readonly electrostaticCalculator: ElectrostaticInteractionCalculator;
    private electrostaticInteractions: ElectrostaticInteractionResults = {
        forceContributions: [],
        pairDistances: [],
    };
    private lastPhysicsSignature = '';
    private coordinateGrid: THREE.GridHelper | null = null;

    public constructor(theme: SimulationThemeConfig) {
        super();

        this.theme = theme;
        const minimumDistance = Math.max(theme.charge.bodyRadius, electrostaticCalculationDefaults.minimumDistance);
        this.electrostaticCalculator = new ElectrostaticInteractionCalculator({ minimumDistance });
        this.name = 'SimulationScene';
        this.environmentGroup.name = 'Environment';
        this.chargesGroup.name = 'Charges';
        this.electrostaticInteractionOverlay = new ElectrostaticInteractionOverlay(theme.force, minimumDistance);
        this.fieldView = new ElectricFieldView(theme.field, minimumDistance);
        this.electricFieldGroup = this.fieldView;
        this.forceVectorsGroup = this.electrostaticInteractionOverlay.forceVectorsGroup;
        this.interactionGuidesGroup = this.electrostaticInteractionOverlay.interactionGuidesGroup;

        this.add(
            this.environmentGroup,
            this.chargesGroup,
            this.electrostaticInteractionOverlay,
            this.fieldView,
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
        this.fieldView.visible = visibility.electricField;
    }

    public setFieldOptions(options: FieldDisplayOptions): void {
        this.fieldView.setOptions(options);
        if (this.coordinateGrid) {
            const normal = planeAxes(options.plane)[2];
            this.coordinateGrid.rotation.set(options.plane === 'xy' ? Math.PI / 2 : 0, 0, options.plane === 'yz' ? Math.PI / 2 : 0);
            this.coordinateGrid.position.set(0, 0, 0).setComponent(normal, options.offset + (options.plane === 'xz' ? 0.025 : -0.025));
            this.coordinateGrid.visible = options.space === 'plane';
        }
    }

    public updateVisualizations(): void {
        this.updateMatrixWorld(true);
        const charges = this.chargesGroup.children
            .filter((object): object is Charge => object instanceof Charge)
            .map((charge) => {
                const worldPosition = charge.getWorldPosition(new THREE.Vector3());

                return {
                    id: charge.chargeId,
                    value: charge.getValue() * MICROCOULOMB,
                    position: [worldPosition.x, worldPosition.y, worldPosition.z] as const,
                };
            });
        const physicsSignature = JSON.stringify(charges);

        if (physicsSignature !== this.lastPhysicsSignature) {
            this.lastPhysicsSignature = physicsSignature;
            this.electrostaticInteractions = this.electrostaticCalculator.calculate(charges);
        }

        const chargeVisibility = new Map(
            this.chargesGroup.children
                .filter((object): object is Charge => object instanceof Charge)
                .map((charge) => [charge.chargeId, charge.getVisibility()] as const),
        );
        this.electrostaticInteractionOverlay.setInteractions(
            this.electrostaticInteractions,
            charges,
            chargeVisibility,
        );
        this.electrostaticInteractionOverlay.update();
        this.fieldView.update(charges, new Map(this.chargesGroup.children
            .filter((object): object is Charge => object instanceof Charge)
            .map(charge => [charge.chargeId, { color: charge.getColor(), visible: charge.getVisibility().electricField }])));
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
        grid.position.y = 0.025;
        this.coordinateGrid = grid;
        this.environmentGroup.add(grid);
    }
}
