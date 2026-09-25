import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { SimulationScene } from './SimulationScene';

export interface Canva3DViewport {
    scene: SimulationScene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    dispose: () => void;
}

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

export function createCanva3D(container: HTMLElement): Canva3DViewport {
    const scene = new SimulationScene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(7, 5, 9);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x0b1020, 1);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    const resize = (): void => {
        const width = Math.max(container.clientWidth, 1);
        const height = Math.max(container.clientHeight, 1);

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
    });

    return {
        scene,
        camera,
        renderer,
        controls,
        dispose: () => {
            resizeObserver.disconnect();
            renderer.setAnimationLoop(null);
            controls.dispose();
            disposeSceneResources(scene);
            renderer.dispose();
            renderer.domElement.remove();
            scene.clear();
        },
    };
}
