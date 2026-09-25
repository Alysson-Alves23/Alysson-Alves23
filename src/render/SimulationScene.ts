import * as THREE from 'three';

export class SimulationScene extends THREE.Scene {
    public readonly environmentGroup = new THREE.Group();
    public readonly chargesGroup = new THREE.Group();

    public constructor() {
        super();

        this.name = 'SimulationScene';
        this.environmentGroup.name = 'Environment';
        this.chargesGroup.name = 'Charges';


        this.add(
            this.environmentGroup,
            this.chargesGroup,
        );
        this.addEnvironment();
    }

    private addEnvironment(): void {
        this.background = new THREE.Color(0x0bffff55);

        const grid = new THREE.GridHelper(20, 20, 0x405070, 0x1e2a42);
        grid.name = 'CoordinateGrid';
        this.environmentGroup.add(grid);

        const axes = new THREE.AxesHelper(3);
        axes.name = 'CoordinateAxes';
        this.environmentGroup.add(axes);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
        ambientLight.name = 'AmbientLight';
        this.environmentGroup.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
        keyLight.name = 'KeyLight';
        keyLight.position.set(4, 8, 6);
        this.environmentGroup.add(keyLight);
    }
}
