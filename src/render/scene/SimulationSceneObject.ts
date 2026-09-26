import * as THREE from 'three';

export abstract class SimulationSceneObject extends THREE.Group {
    public readonly objectId: string;

    protected constructor(objectId: string) {
        super();

        this.objectId = objectId;
        this.name = objectId;
    }
}
