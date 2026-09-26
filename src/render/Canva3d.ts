import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { SimulationScene } from './scene/SimulationScene';
import { Charge, type ChargeOptions } from './objects/Charge';
import type { SimulationThemeConfig } from './types/SimulationTheme';
import type { VisualizationVisibility } from './types/VisualizationVisibility';
import { defaultFieldDisplayOptions, type FieldDisplayOptions, type FieldViewState } from './types/FieldDisplayOptions';
import { fieldDomain, planeAxes } from './field/FieldSampling';
import type { CartesianCoordinates } from '../core/physics/types';

type ChargeSelectionListener = (charges: Charge[]) => void;

function disposeSceneResources(scene: THREE.Scene): void {
    scene.traverse((object) => {
        if (
            object instanceof THREE.Mesh ||
            object instanceof THREE.Line ||
            object instanceof THREE.Points
        ) {
            object.geometry.dispose();
        }

        if (
            object instanceof THREE.Mesh ||
            object instanceof THREE.Line ||
            object instanceof THREE.Points ||
            object instanceof THREE.Sprite
        ) {
            if (Array.isArray(object.material)) {
                object.material.forEach((material) => material.dispose());
            } else {
                object.material.map?.dispose();
                object.material.dispose();
            }
        }
    });
}

export class Canva3D {
    public readonly scene: SimulationScene;
    public camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    public readonly renderer: THREE.WebGLRenderer;
    public readonly controls: OrbitControls;

    private readonly resizeObserver: ResizeObserver;
    private readonly chargeMovedListeners = new Set<(charge: Charge) => void>();
    private readonly chargeSelectedListeners = new Set<ChargeSelectionListener>();
    private readonly selectedCharges = new Set<Charge>();
    private readonly raycaster = new THREE.Raycaster();
    private readonly pointer = new THREE.Vector2();
    private readonly pointerDownPosition = new THREE.Vector2();
    private readonly dragPlane = new THREE.Plane();
    private readonly dragStartPoint = new THREE.Vector3();
    private readonly dragStartPositions = new Map<Charge, THREE.Vector3>();
    private pointerDownCharge: Charge | null = null;
    private isDraggingSelection = false;
    private hasDraggedSelection = false;
    private suppressNextClick = false;
    private readonly perspectiveCamera: THREE.PerspectiveCamera;
    private readonly planarCamera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.01, 2000);
    private fieldOptions = { ...defaultFieldDisplayOptions };
    private isDraggingProbe = false;
    private readonly probeDragOffset = new THREE.Vector3();
    private viewportAspect = 1;

    public constructor(container: HTMLElement, initialTheme: SimulationThemeConfig) {
        this.scene = new SimulationScene(initialTheme);
        this.perspectiveCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
        this.camera = this.perspectiveCamera;
        this.camera.position.set(7, 5, 9);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.renderer.setClearColor(new THREE.Color(initialTheme.background), 1);
        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 0, 0);

        this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown, true);
        this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove, true);
        this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp, true);
        this.renderer.domElement.addEventListener('pointercancel', this.handlePointerUp, true);
        this.renderer.domElement.addEventListener('click', this.handleClick);

        const resize = (): void => {
            const width = Math.max(container.clientWidth, 1);
            const height = Math.max(container.clientHeight, 1);

            this.viewportAspect = width / height;
            this.perspectiveCamera.aspect = this.viewportAspect;
            this.perspectiveCamera.updateProjectionMatrix();
            this.planarCamera.left = -6 * this.viewportAspect;
            this.planarCamera.right = 6 * this.viewportAspect;
            this.planarCamera.updateProjectionMatrix();
            this.renderer.setSize(width, height, false);
        };

        this.resizeObserver = new ResizeObserver(resize);
        this.resizeObserver.observe(container);
        resize();
        this.setFieldOptions(this.fieldOptions);

        this.renderer.setAnimationLoop(() => {
            this.controls.update();
            this.scene.updateVisualizations();
            this.renderer.render(this.scene, this.camera);
        });
    }

    public createCharge(options: ChargeOptions): Charge {
        return this.scene.createCharge(options);
    }

    public removeCharge(charge: Charge): void {
        if (this.selectedCharges.has(charge)) {
            this.selectedCharges.delete(charge);
            charge.setSelected(false);
            this.notifySelectionChanged();
        }

        this.scene.removeCharge(charge);
    }

    public selectCharge(charge: Charge | null): void {
        this.setSelectedCharges(charge ? [charge] : []);
    }

    public selectCharges(charges: Charge[]): void {
        this.setSelectedCharges(charges);
    }

    public getSelectedCharges(): Charge[] {
        return Array.from(this.selectedCharges);
    }

    public setGlobalVisualizationVisibility(
        visibility: VisualizationVisibility,
    ): void {
        this.scene.setGlobalVisualizationVisibility(visibility);
    }

    public setFieldOptions(options: FieldDisplayOptions): void {
        const changedView = options.space !== this.fieldOptions.space || options.plane !== this.fieldOptions.plane
            || options.offset !== this.fieldOptions.offset || this.camera === this.perspectiveCamera && options.space === 'plane';
        this.fieldOptions = { ...options };
        this.scene.setFieldOptions(options);
        if (changedView) this.frameField();
    }

    public frameField(): void {
        const charges = this.scene.chargesGroup.children.filter((object): object is Charge => object instanceof Charge);
        const domain = fieldDomain(charges.map(charge => ({ id: charge.chargeId, value: charge.getValue(), position: charge.position.toArray() })));
        const center = new THREE.Vector3(...domain.center);
        const options = this.fieldOptions;
        if (options.space === 'plane') {
            const [u, v, normal] = planeAxes(options.plane);
            center.setComponent(normal, options.offset);
            this.camera = this.planarCamera;
            this.planarCamera.up.set(0, 0, 0).setComponent(v, 1);
            this.planarCamera.position.copy(center).setComponent(normal, options.offset + (u === 0 && v === 2 ? -100 : 100));
            this.planarCamera.zoom = Math.min(6, 6 * this.viewportAspect) / (domain.halfSize * 1.25);
            this.planarCamera.updateProjectionMatrix();
        } else {
            this.camera = this.perspectiveCamera;
            this.camera.position.copy(center).add(new THREE.Vector3(1, 0.8, 1.4).normalize().multiplyScalar(domain.halfSize * 3.8));
        }
        this.camera.lookAt(center);
        this.controls.object = this.camera;
        this.controls.target.copy(center);
        this.controls.enableRotate = options.space === 'volume';
        this.controls.update();
    }

    public setProbePosition(position: CartesianCoordinates): void { this.scene.fieldView.setProbePosition(position); }

    public onFieldStateChanged(listener: (state: FieldViewState) => void): () => void {
        return this.scene.fieldView.subscribe(listener);
    }

    public onChargeMoved(listener: (charge: Charge) => void): () => void {
        this.chargeMovedListeners.add(listener);

        return () => {
            this.chargeMovedListeners.delete(listener);
        };
    }

    public onChargesSelected(listener: ChargeSelectionListener): () => void {
        this.chargeSelectedListeners.add(listener);

        return () => {
            this.chargeSelectedListeners.delete(listener);
        };
    }

    public dispose(): void {
        this.resizeObserver.disconnect();
        this.renderer.setAnimationLoop(null);
        this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown, true);
        this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove, true);
        this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp, true);
        this.renderer.domElement.removeEventListener('pointercancel', this.handlePointerUp, true);
        this.renderer.domElement.removeEventListener('click', this.handleClick);
        this.controls.dispose();
        this.scene.fieldView.dispose();
        this.scene.remove(this.scene.fieldView);
        this.scene.electrostaticInteractionOverlay.dispose();
        this.scene.remove(this.scene.electrostaticInteractionOverlay);
        disposeSceneResources(this.scene);
        this.renderer.dispose();
        this.renderer.domElement.remove();
        this.scene.clear();
        this.chargeMovedListeners.clear();
        this.chargeSelectedListeners.clear();
        this.selectedCharges.clear();
    }

    private readonly handlePointerDown = (event: PointerEvent): void => {
        this.pointerDownPosition.set(event.clientX, event.clientY);
        this.pointerDownCharge = this.chargeAt(event);
        this.hasDraggedSelection = false;

        if (this.scene.fieldView.visible && this.scene.fieldView.probe.visible
            && this.raycaster.intersectObject(this.scene.fieldView.probe.marker).length > 0) {
            const position = this.scene.fieldView.probe.position;
            const normal = this.fieldOptions.space === 'plane'
                ? new THREE.Vector3().setComponent(planeAxes(this.fieldOptions.plane)[2], 1)
                : this.camera.getWorldDirection(new THREE.Vector3());
            this.dragPlane.setFromNormalAndCoplanarPoint(normal, position);
            if (this.rayIntersectsDragPlane(event, this.dragStartPoint)) {
                this.probeDragOffset.copy(position).sub(this.dragStartPoint);
                this.isDraggingProbe = true;
                this.controls.enabled = false;
                this.renderer.domElement.setPointerCapture(event.pointerId);
                event.preventDefault(); event.stopImmediatePropagation();
                return;
            }
        }

        if (!event.ctrlKey || !this.pointerDownCharge) {
            return;
        }

        const chargesToMove = this.selectedCharges.has(this.pointerDownCharge)
            ? this.selectedCharges
            : new Set([this.pointerDownCharge]);
        const center = this.selectionCenter(chargesToMove);
        const cameraDirection = this.fieldOptions.space === 'plane'
            ? new THREE.Vector3().setComponent(planeAxes(this.fieldOptions.plane)[2], 1)
            : this.camera.getWorldDirection(new THREE.Vector3());
        this.dragPlane.setFromNormalAndCoplanarPoint(cameraDirection, center);

        if (!this.rayIntersectsDragPlane(event, this.dragStartPoint)) {
            return;
        }

        this.dragStartPositions.clear();
        chargesToMove.forEach((charge) => {
            this.dragStartPositions.set(charge, charge.position.clone());
        });
        this.isDraggingSelection = true;
        this.controls.enabled = false;
        this.renderer.domElement.setPointerCapture(event.pointerId);
        event.preventDefault();
    };

    private readonly handlePointerMove = (event: PointerEvent): void => {
        if (this.isDraggingProbe) {
            const current = new THREE.Vector3();
            if (this.rayIntersectsDragPlane(event, current)) this.setProbePosition(current.add(this.probeDragOffset).toArray());
            event.preventDefault(); event.stopImmediatePropagation();
            return;
        }
        if (!this.isDraggingSelection) {
            return;
        }

        const currentPoint = new THREE.Vector3();

        if (!this.rayIntersectsDragPlane(event, currentPoint)) {
            return;
        }

        const distance = Math.hypot(
            event.clientX - this.pointerDownPosition.x,
            event.clientY - this.pointerDownPosition.y,
        );

        if (distance <= 2) {
            return;
        }

        this.hasDraggedSelection = true;
        const delta = currentPoint.sub(this.dragStartPoint);
        this.dragStartPositions.forEach((position, charge) => {
            charge.position.copy(position).add(delta);
            this.chargeMovedListeners.forEach((listener) => listener(charge));
        });
        event.preventDefault();
    };

    private readonly handlePointerUp = (event: PointerEvent): void => {
        if (this.isDraggingProbe) {
            this.isDraggingProbe = false;
            this.controls.enabled = true;
            this.suppressNextClick = true;
            if (this.renderer.domElement.hasPointerCapture(event.pointerId)) this.renderer.domElement.releasePointerCapture(event.pointerId);
            return;
        }
        if (!this.isDraggingSelection) {
            return;
        }

        this.isDraggingSelection = false;
        this.controls.enabled = true;
        this.dragStartPositions.clear();
        this.suppressNextClick = this.hasDraggedSelection;
        this.hasDraggedSelection = false;

        if (this.renderer.domElement.hasPointerCapture(event.pointerId)) {
            this.renderer.domElement.releasePointerCapture(event.pointerId);
        }
    };

    private readonly handleClick = (event: MouseEvent): void => {
        if (this.suppressNextClick) {
            this.suppressNextClick = false;
            return;
        }

        const pointerDistance = Math.hypot(
            event.clientX - this.pointerDownPosition.x,
            event.clientY - this.pointerDownPosition.y,
        );

        if (pointerDistance > 5) {
            return;
        }

        const charge = this.chargeAt(event);

        if (!charge) {
            if (!event.shiftKey) {
                this.setSelectedCharges([]);
            }
            return;
        }

        if (event.shiftKey) {
            this.toggleChargeSelection(charge);
            return;
        }

        this.setSelectedCharges([charge]);
    };

    private chargeAt(event: MouseEvent | PointerEvent): Charge | null {
        const bounds = this.renderer.domElement.getBoundingClientRect();
        this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);

        const intersection = this.raycaster.intersectObjects(
            this.scene.chargesGroup.children,
            true,
        )[0];

        return intersection ? this.findCharge(intersection.object) : null;
    }

    private rayIntersectsDragPlane(
        event: MouseEvent | PointerEvent,
        target: THREE.Vector3,
    ): boolean {
        const bounds = this.renderer.domElement.getBoundingClientRect();
        this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);

        return Boolean(this.raycaster.ray.intersectPlane(this.dragPlane, target));
    }

    private setSelectedCharges(charges: Charge[]): void {
        const nextSelection = new Set(charges);

        this.selectedCharges.forEach((charge) => {
            if (!nextSelection.has(charge)) {
                charge.setSelected(false);
            }
        });
        nextSelection.forEach((charge) => charge.setSelected(true));

        this.selectedCharges.clear();
        nextSelection.forEach((charge) => this.selectedCharges.add(charge));
        this.notifySelectionChanged();
    }

    private toggleChargeSelection(charge: Charge): void {
        if (this.selectedCharges.has(charge)) {
            this.selectedCharges.delete(charge);
            charge.setSelected(false);
        } else {
            this.selectedCharges.add(charge);
            charge.setSelected(true);
        }

        this.notifySelectionChanged();
    }

    private notifySelectionChanged(): void {
        const selection = this.getSelectedCharges();
        this.chargeSelectedListeners.forEach((listener) => listener(selection));
    }

    private selectionCenter(charges: ReadonlySet<Charge>): THREE.Vector3 {
        const center = new THREE.Vector3();
        charges.forEach((charge) => center.add(charge.position));
        return center.divideScalar(charges.size);
    }

    private findCharge(object: THREE.Object3D): Charge | null {
        let current: THREE.Object3D | null = object;

        while (current) {
            if (current instanceof Charge) {
                return current;
            }

            current = current.parent;
        }

        return null;
    }
}
