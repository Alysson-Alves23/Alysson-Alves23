import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { SimulationScene } from './SimulationScene';

function disposeSceneResources(scene: THREE.Scene): void {
    scene.traverse((object) => {
        if (
            object instanceof THREE.Mesh ||
            object instanceof THREE.Line ||
            object instanceof THREE.Points
        ) {
            object.geometry.dispose();

            if (Array.isArray(object.material)) {
                object.material.forEach((material) => material.dispose());
            } else {
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

    private readonly resizeObserver: ResizeObserver;

    public constructor(container: HTMLElement) {
        this.scene = new SimulationScene();
        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        this.camera.position.set(7, 5, 9);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setClearColor(0x0b1020, 1);
        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement,
        );
        this.controls.enableDamping = true;
        this.controls.target.set(0, 0, 0);

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
            this.renderer.render(this.scene, this.camera);
        });
    }

    public dispose(): void {
        this.resizeObserver.disconnect();
        this.renderer.setAnimationLoop(null);
        this.controls.dispose();
        disposeSceneResources(this.scene);
        this.renderer.dispose();
        this.renderer.domElement.remove();
        this.scene.clear();
    }
}
