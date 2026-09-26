import * as THREE from 'three';
import { OrbitControls, TransformControls } from 'three-stdlib';
import { SimulationScene } from './scene/SimulationScene';
import { Charge, type ChargeOptions } from './objects/Charge';
import type { SimulationThemeConfig } from './types/SimulationTheme';
import type { VisualizationVisibility } from './types/VisualizationVisibility';

interface TransformControlsEvents {
    addEventListener(
        type: 'dragging-changed',
        listener: (event: { value: boolean }) => void,
    ): void;
    addEventListener(type: 'objectChange', listener: () => void): void;
}

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
    public readonly camera: THREE.PerspectiveCamera;
    public readonly renderer: THREE.WebGLRenderer;
    public readonly controls: OrbitControls;
    public readonly transformControls: TransformControls;

    private readonly resizeObserver: ResizeObserver;
    private readonly chargeMovedListeners = new Set<(charge: Charge) => void>();
    private readonly chargeSelectedListeners = new Set<(charge: Charge | null) => void>();
    private readonly raycaster = new THREE.Raycaster();
    private readonly pointer = new THREE.Vector2();
    private moveToolActive = true;
    private selectedCharge: Charge | null = null;

    public constructor(container: HTMLElement, initialTheme: SimulationThemeConfig) {
        this.scene = new SimulationScene(initialTheme);
        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
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

        this.renderer.domElement.addEventListener('click', (event) => {
            const bounds = this.renderer.domElement.getBoundingClientRect();
            this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
            this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
            this.raycaster.setFromCamera(this.pointer, this.camera);

            const intersection = this.raycaster.intersectObjects(
                this.scene.chargesGroup.children,
                true,
            )[0];
            const charge = intersection ? this.findCharge(intersection.object) : null;

            this.selectCharge(charge);
            this.chargeSelectedListeners.forEach((listener) => listener(charge));
        });

        this.transformControls = new TransformControls(
            this.camera,
            this.renderer.domElement,
        );
        this.transformControls.setMode('translate');
        this.scene.add(this.transformControls);

        const transformControlsEvents = this.transformControls as unknown as TransformControlsEvents;
        transformControlsEvents.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
        });
        transformControlsEvents.addEventListener('objectChange', () => {
            const selectedCharge = this.selectedCharge;

            if (selectedCharge) {
                this.chargeMovedListeners.forEach((listener) => {
                    listener(selectedCharge);
                });
            }
        });

        const resize = (): void => {
            const width = Math.max(container.clientWidth, 1);
            const height = Math.max(container.clientHeight, 1);

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height, false);
        };

        this.resizeObserver = new ResizeObserver(resize);
        this.resizeObserver.observe(container);
        resize();

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
        if (this.selectedCharge === charge) {
            this.selectCharge(null);
        }

        this.scene.removeCharge(charge);
    }

    public selectCharge(charge: Charge | null): void {
        this.selectedCharge = charge;

        if (charge && this.moveToolActive) {
            this.transformControls.attach(charge);
        } else {
            this.transformControls.detach();
        }
    }

    public setMoveToolActive(active: boolean): void {
        this.moveToolActive = active;

        if (active && this.selectedCharge) {
            this.transformControls.attach(this.selectedCharge);
        } else {
            this.transformControls.detach();
        }
    }

    public setGlobalVisualizationVisibility(
        visibility: VisualizationVisibility,
    ): void {
        this.scene.setGlobalVisualizationVisibility(visibility);
    }

    public onChargeMoved(listener: (charge: Charge) => void): () => void {
        this.chargeMovedListeners.add(listener);

        return () => {
            this.chargeMovedListeners.delete(listener);
        };
    }

    public onChargeSelected(listener: (charge: Charge | null) => void): () => void {
        this.chargeSelectedListeners.add(listener);

        return () => {
            this.chargeSelectedListeners.delete(listener);
        };
    }

    public dispose(): void {
        this.resizeObserver.disconnect();
        this.renderer.setAnimationLoop(null);
        this.transformControls.dispose();
        this.controls.dispose();
        disposeSceneResources(this.scene);
        this.renderer.dispose();
        this.renderer.domElement.remove();
        this.scene.clear();
        this.chargeMovedListeners.clear();
        this.chargeSelectedListeners.clear();
        this.selectedCharge = null;
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
