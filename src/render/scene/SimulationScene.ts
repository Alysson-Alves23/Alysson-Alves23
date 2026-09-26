import * as THREE from 'three';
import type { FieldArrowInstances } from '../field/FieldArrowInstances';
import { MICROCOULOMB } from '../../core/physics/electrostatics/constants';
import { ElectricFieldView } from '../field/ElectricFieldView';
import { planeAxes } from '../field/FieldSampling';
import { fieldVisualizationDefaults } from '../field/fieldVisualizationDefaults';
import type { FieldDisplayOptions } from '../types/FieldDisplayOptions';
import { calculateInteractionsBetweenAllChargePairs } from '../../core/physics/electrostatics/ElectrostaticInteractions';
import type {
    CartesianCoordinates,
    ElectrostaticInteractionResults,
} from '../../core/physics/electrostatics/types';
import {
    Charge,
    type ChargeOptions,
} from '../objects/Charge';
import { ElectrostaticInteractionOverlay } from '../interaction/ElectrostaticInteractionOverlay';
import type { SimulationThemeConfig } from '../types/SimulationTheme';
import type { VisualizationVisibility } from '../types/VisualizationVisibility';
import {
    MeasurementLabelLayer,
    formatMeasurement,
} from '../annotations/MeasurementLabelLayer';

export class SimulationScene extends THREE.Scene {
    public readonly environmentGroup = new THREE.Group();
    public readonly chargesGroup = new THREE.Group();
    public readonly electrostaticInteractionOverlay: ElectrostaticInteractionOverlay;
    public readonly electricFieldGroup: THREE.Group;
    public readonly forceVectorsGroup: FieldArrowInstances;
    public readonly interactionGuidesGroup: THREE.Group;
    public readonly fieldView: ElectricFieldView;
    public readonly measurementLabels = new MeasurementLabelLayer();

    private readonly theme: SimulationThemeConfig;
    private readonly chargeDisplayClearanceMeters: number;
    private electrostaticInteractions: ElectrostaticInteractionResults = {
        forceContributions: [],
        pairDistances: [],
    };
    private lastPhysicsSignature = '';
    private coordinateGrid: THREE.GridHelper | null = null;

    public constructor(theme: SimulationThemeConfig) {
        super();

        this.theme = theme;
        this.chargeDisplayClearanceMeters = Math.max(
            theme.charge.bodyRadius,
            fieldVisualizationDefaults.chargeDisplayClearanceMeters,
        );
        this.name = 'SimulationScene';
        this.environmentGroup.name = 'Environment';
        this.chargesGroup.name = 'Charges';
        this.electrostaticInteractionOverlay = new ElectrostaticInteractionOverlay(
            theme.force,
            this.chargeDisplayClearanceMeters,
        );
        this.fieldView = new ElectricFieldView(theme.field, this.chargeDisplayClearanceMeters);
        this.electricFieldGroup = this.fieldView;
        this.forceVectorsGroup = this.electrostaticInteractionOverlay.forceVectorsGroup;
        this.interactionGuidesGroup = this.electrostaticInteractionOverlay.interactionGuidesGroup;

        this.add(
            this.environmentGroup,
            this.chargesGroup,
            this.electrostaticInteractionOverlay,
            this.fieldView,
            this.measurementLabels,
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

    public setMeasurementLabelsVisible(visible: boolean): void {
        this.measurementLabels.setShowAll(visible);
    }

    public setSelectedChargeIds(chargeIds: readonly string[]): void {
        this.measurementLabels.setSelectedChargeIds(chargeIds);
    }

    public setHoveredMeasurementLabel(labelId: string | null): void {
        this.measurementLabels.setHoveredLabelId(labelId);
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

    public updateVisualizations(cameraUp: CartesianCoordinates = [0, 1, 0]): void {
        this.updateMatrixWorld(true);
        const charges = this.chargesGroup.children
            .filter((object): object is Charge => object instanceof Charge)
            .map((charge) => {
                const worldPosition = charge.getWorldPosition(new THREE.Vector3());

                return {
                    id: charge.chargeId,
                    chargeInCoulombs: charge.getValue() * MICROCOULOMB,
                    positionInMeters: [worldPosition.x, worldPosition.y, worldPosition.z] as const,
                };
            });
        const physicsSignature = JSON.stringify(charges);

        if (physicsSignature !== this.lastPhysicsSignature) {
            this.lastPhysicsSignature = physicsSignature;
            this.electrostaticInteractions = calculateInteractionsBetweenAllChargePairs(charges);
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
        this.updateMeasurementLabels(cameraUp);
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

    private updateMeasurementLabels(cameraUp: CartesianCoordinates): void {
        const chargeLabels = this.chargesGroup.children
            .filter((object): object is Charge => object instanceof Charge)
            .map((charge) => {
                const position = charge.getWorldPosition(new THREE.Vector3());
                position.addScaledVector(
                    new THREE.Vector3(...cameraUp).normalize(),
                    this.theme.charge.bodyRadius * 2.2,
                );

                return {
                    id: `charge:${charge.chargeId}`,
                    text: `q = ${charge.getValue() > 0 ? '+' : ''}${formatMeasurement(charge.getValue(), 'μC')}`,
                    position: position.toArray() as [number, number, number],
                    kind: 'charge' as const,
                    ownerChargeIds: [charge.chargeId],
                };
            });

        this.measurementLabels.setAnnotations([
            ...chargeLabels,
            ...this.electrostaticInteractionOverlay.forceVectorsGroup.getMeasurementAnnotations(),
            ...this.fieldView.getMeasurementAnnotations(),
        ]);
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
