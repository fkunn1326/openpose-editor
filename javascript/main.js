class OpenposeEditor {
    constructor() {
        const scene = new THREE.Scene();

        const loader = new THREE.GLTFLoader();
        loader.load(
            // '/vrm/openpose.vrm',
            ( gltf ) => {
                THREE.VRM.from( gltf ).then( ( vrm ) => {
                    scene.add( vrm.scene );
                    console.log( vrm );
                });
            },
            ( progress ) => console.log( 'Loading model...', 100.0 * ( progress.loaded / progress.total ), '%' ),
            ( error ) => console.error( error )
        );
    }
}

window.onload() = () => {
    window.openpose_editor = new OpenposeEditor()
}