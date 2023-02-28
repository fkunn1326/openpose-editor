import * as THREE from './three.mjs';
import { GLTFLoader } from './GLTFLoader.mjs'
import { VRMLoaderPlugin, VRMUtils } from './three-vrm.mjs';
import { OrbitControls } from './OrbitControls.mjs'
import { IK, IKChain, IKJoint } from './three-ik.mjs'
import { DragControls } from './DragControls.mjs'

class OpenposeEditor {
    _canvas = undefined;
    _renderer = undefined;
    _scene = undefined;
    _camera = undefined;
    _controls = undefined;
    _vrm = undefined;

    constructor() {
        // Setup viewer

        // canvas
        this._canvas = gradioApp().querySelector("canvas#openpose_editor_canvas")

        // scene
        this._scene = new THREE.Scene();

        // loader
        const loader = new GLTFLoader();

        // camera
        this._camera = new THREE.PerspectiveCamera(45, 512 / 512, 0.1, 1000)
        this._camera.position.set(0, 0.8, -2.0)
        this._camera.rotation.set(0, Math.PI, 0)

        // camera controls
        this._controls = new OrbitControls( this._camera, this._canvas);
        this._controls.screenSpacePanning = true;
        this._controls.target.set( 0.0, 0.8, 0.0 );
        this._controls.update();

        // renderer
        this._renderer = new THREE.WebGLRenderer({
            canvas: this._canvas,
            antialias: true
        })
        this._renderer.setSize(512, 512);
        this._renderer.setClearColor(0x000000, 1);
        this._renderer.physicallyCorrectLights = true;
        this._renderer.outputEncoding = THREE.sRGBEncoding;
        this._renderer.toneMapping = THREE.ACESFilmicToneMapping;

        // light
        const light = new THREE.AmbientLight(0xFFFFFF, 1.0);
        this._scene.add(light); 

        const normalPose = (vrm) => {
            console.log(vrm.humanoid.getBoneNode('leftUpperArm'))
            const leftUpperArm = vrm.humanoid.getBoneNode('leftUpperArm')
            leftUpperArm.rotateZ(1.2)
            // leftUpperArm.position.set(1, 1, 1)
            const rightUpperArm = vrm.humanoid.getBoneNode('rightUpperArm')
            rightUpperArm.rotateZ(-1.2)
        }

        loader.crossOrigin = 'anonymous';
        loader.register((parser) => {
            return new VRMLoaderPlugin(parser);
        });
        
        loader.load(
            'https://raw.githubusercontent.com/fkunn1326/openpose-editor/dev/vrm/openpose.vrm',

            (gltf) => {
                const vrm = gltf.userData.vrm;
                VRMUtils.removeUnnecessaryJoints(gltf.scene);
                this._vrm = vrm
                
                normalPose(vrm)
                this._scene.add(vrm.scene);
            },
            
            (progress) => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),
            
            (error) => console.error(error),
        );

        // helpers
        const gridHelper = new THREE.GridHelper( 10, 10 );
        this._scene.add( gridHelper );

        const axesHelper = new THREE.AxesHelper( 5 );
        this._scene.add( axesHelper );

        // animate
        const clock = new THREE.Clock();
    }

    get canvas(){
        return this._canvas
    }

    get scene(){
        return this._scene
    }

    get camera(){
        return this._camera
    }

    get orbitControl(){
        return this._controls
    }

    get vrm(){
        return this._vrm
    }

    update(){
        this._renderer.render(this._scene, this._camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    let exexuted = false;

    function setup(){
        // setup editor
        window.openpose_editor = new OpenposeEditor()

        // update loop
        function update(){
            requestAnimationFrame(update);
            window.openpose_editor.update()
        }
        update();
    }

    window.onload = () => {
        const observer = new MutationObserver((m) => {
            if(!exexuted && gradioApp().querySelector('canvas#openpose_editor_canvas')){
                exexuted = true;
                setup()
                observer.disconnect();
            }
        })
        observer.observe(gradioApp(), { childList: true, subtree: true })
    }
})