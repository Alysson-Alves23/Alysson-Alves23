import * as THREE from 'three';
import { Charge } from '../objects/Charge';
import type { VisualizationVisibility } from '../types/VisualizationVisibility';

const FIELD_COLOR = 0x66d9ef;
const FORCE_COLOR = 0xffb347;
const GUIDE_COLOR = 0xc4ceda;
const FIELD_GRID_SIZE = 4;
const FIELD_GRID_DIVISIONS = 8;
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
    public readonly electricFieldGroup = new THREE.Group();
    public readonly forceVectorsGroup = new THREE.Group();
    public readonly interactionGuidesGroup = new THREE.Group();

    private readonly chargesGroup: THREE.Group;
    private globalVisibility: VisualizationVisibility = {
        electricField: false,
        forceVectors: false,
        distanceGuide: false,
    };
    private lastSignature = '';

    public constructor(chargesGroup: THREE.Group) {
        super();

        this.chargesGroup = chargesGroup;
        this.name = 'ElectrostaticInteractionOverlay';
        this.electricFieldGroup.name = 'ElectricField';
        this.forceVectorsGroup.name = 'ForceVectors';
        this.interactionGuidesGroup.name = 'InteractionGuides';
        this.add(
            this.electricFieldGroup,
            this.forceVectorsGroup,
            this.interactionGuidesGroup,
        );
    }

    public setGlobalVisibility(visibility: VisualizationVisibility): void {
        this.globalVisibility = { ...visibility };
    }

    public update(): void {
        const charges = this.getCharges();
        const signature = this.createSignature(charges);

        if (signature === this.lastSignature) {
            return;
        }

        this.lastSignature = signature;
        this.clearVisualGroups();

        if (charges.length === 0) {
            return;
        }

        if (this.globalVisibility.electricField) {
            this.renderElectricField(charges);
        }

        if (this.globalVisibility.forceVectors) {
            this.renderForceVectors(charges);
        }

        if (this.globalVisibility.distanceGuide) {
            this.renderDistanceGuides(charges);
        }
    }

    private getCharges(): Charge[] {
        return this.chargesGroup.children.filter(
            (object): object is Charge => object instanceof Charge,
        );
    }

    private createSignature(charges: Charge[]): string {
        return JSON.stringify({
            globalVisibility: this.globalVisibility,
            charges: charges.map((charge) => ({
                id: charge.chargeId,
                value: charge.getValue(),
                position: [charge.position.x, charge.position.y, charge.position.z],
                visibility: charge.getVisibility(),
            })),
        });
    }

    private clearVisualGroups(): void {
        [
            this.electricFieldGroup,
            this.forceVectorsGroup,
            this.interactionGuidesGroup,
        ].forEach((group) => {
            group.children.forEach((child) => disposeVisualResources(child));
            group.clear();
        });
    }

    private renderElectricField(charges: Charge[]): void {
        const spacing = (FIELD_GRID_SIZE * 2) / FIELD_GRID_DIVISIONS;

        for (let row = 0; row <= FIELD_GRID_DIVISIONS; row += 1) {
            for (let column = 0; column <= FIELD_GRID_DIVISIONS; column += 1) {
                const point = new THREE.Vector3(
                    -FIELD_GRID_SIZE + column * spacing,
                    VISUAL_OFFSET,
                    -FIELD_GRID_SIZE + row * spacing,
                );
                const field = this.calculateElectricField(point, charges);

                if (field.lengthSq() < 0.0001) {
                    continue;
                }

                const magnitude = field.length();
                const direction = field.normalize();
                const length = clamp(0.08 + Math.log1p(magnitude) * 0.12, 0.08, 0.55);
                const arrow = new THREE.ArrowHelper(
                    direction,
                    point,
                    length,
                    FIELD_COLOR,
                    length * 0.28,
                    length * 0.16,
                );
                arrow.name = 'ElectricFieldVector';
                this.configureArrow(arrow);
                this.electricFieldGroup.add(arrow);
            }
        }
    }

    private calculateElectricField(point: THREE.Vector3, charges: Charge[]): THREE.Vector3 {
        const field = new THREE.Vector3();

        charges.forEach((charge) => {
            if (!charge.getVisibility().electricField || charge.getValue() === 0) {
                return;
            }

            const offset = point.clone().sub(charge.position);
            const distanceSquared = Math.max(offset.lengthSq(), 0.04);
            const distance = Math.sqrt(distanceSquared);
            field.addScaledVector(
                offset,
                charge.getValue() / (distanceSquared * distance),
            );
        });

        return field;
    }

    private renderForceVectors(charges: Charge[]): void {
        for (let firstIndex = 0; firstIndex < charges.length; firstIndex += 1) {
            for (let secondIndex = firstIndex + 1; secondIndex < charges.length; secondIndex += 1) {
                const firstCharge = charges[firstIndex];
                const secondCharge = charges[secondIndex];
                const product = firstCharge.getValue() * secondCharge.getValue();
                const offset = secondCharge.position.clone().sub(firstCharge.position);
                const distance = offset.length();

                if (distance < 0.001 || product === 0) {
                    continue;
                }

                const directionToSecond = offset.normalize();
                const firstDirection = directionToSecond.multiplyScalar(product > 0 ? -1 : 1);
                const secondDirection = firstDirection.clone().negate();
                const forceMagnitude = Math.abs(product) / (distance * distance);
                const arrowLength = clamp(
                    0.14 + Math.log1p(forceMagnitude) * 0.22,
                    0.14,
                    1.25,
                );

                if (firstCharge.getVisibility().forceVectors) {
                    this.addForceArrow(firstCharge.position, firstDirection, arrowLength);
                }

                if (secondCharge.getVisibility().forceVectors) {
                    this.addForceArrow(secondCharge.position, secondDirection, arrowLength);
                }
            }
        }
    }

    private addForceArrow(
        origin: THREE.Vector3,
        direction: THREE.Vector3,
        length: number,
    ): void {
        const arrow = new THREE.ArrowHelper(
            direction,
            origin.clone().setY(origin.y + VISUAL_OFFSET),
            length,
            FORCE_COLOR,
            length * 0.32,
            length * 0.2,
        );
        arrow.name = 'ElectrostaticForceVector';
        this.configureArrow(arrow);
        this.forceVectorsGroup.add(arrow);
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

    private renderDistanceGuides(charges: Charge[]): void {
        for (let firstIndex = 0; firstIndex < charges.length; firstIndex += 1) {
            for (let secondIndex = firstIndex + 1; secondIndex < charges.length; secondIndex += 1) {
                const firstCharge = charges[firstIndex];
                const secondCharge = charges[secondIndex];

                if (
                    !firstCharge.getVisibility().distanceGuide
                    && !secondCharge.getVisibility().distanceGuide
                ) {
                    continue;
                }

                const distance = firstCharge.position.distanceTo(secondCharge.position);

                if (distance < 0.001) {
                    continue;
                }

                const line = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([
                        firstCharge.position.clone().setY(firstCharge.position.y + VISUAL_OFFSET),
                        secondCharge.position.clone().setY(secondCharge.position.y + VISUAL_OFFSET),
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

                const midpoint = firstCharge.position.clone()
                    .add(secondCharge.position)
                    .multiplyScalar(0.5);
                const label = this.createDistanceLabel(`r = ${distance.toFixed(2)} u`);
                label.position.copy(midpoint);
                label.position.y += VISUAL_OFFSET + 0.12;
                this.interactionGuidesGroup.add(label);
            }
        }
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
