import * as THREE from './three.mjs';
import { GLTFLoader } from './GLTFLoader.mjs'
import { VRMLoaderPlugin, VRMUtils } from './three-vrm.mjs';
import { OrbitControls } from './OrbitControls.mjs'
import { TransformControls } from './TransformControls.mjs'
import { DragControls } from './DragControls.mjs'
import { VrmIK } from './vrm-ik.mjs';

/*
Openpose Editorの仕様

# カメラ制御（OrbitControls）

PC
- ジョイント以外がカメラ制御になる
- 右ドラッグ操作で回転
- Shift + ドラッグ操作で移動
- スクロール操作でズーム

スマホ
- 1touchは回転
- 2touchはズーム

# 人間の操作

全般
- IKはON/OFF可能

2Dモード
- 3Dモデルを2Dで操作する、IKは2D-IKになる
- Z軸は基本的に0
- 今までのように伸びたりはしない（3Dモデルだから）
- ジョイントをドラッグ操作する

3Dモード
- カメラ制御を用いながら3Dで編集する
- ジョイントをドラッグ操作する

あとgithubに異型、奇形に関するissueがいくつかあるんだけどどう対応しようか :scream:
*/

class OpenposeEditor {
    _canvas = undefined;
    _renderer = undefined;
    _scene = undefined;
    _camera = undefined;
    _control = undefined;
    _vrm = undefined;
    _vrmIK = undefined;

    constructor() {
        // Setup viewer

        // canvas
        this._canvas = gradioApp().querySelector("canvas#openpose_editor_canvas");

        // scene
        this._scene = new THREE.Scene();

        // loader
        const loader = new GLTFLoader();

        // camera
        this._camera = new THREE.PerspectiveCamera(45, 512 / 512, 0.1, 1000)
        this._camera.position.set(0, 0.8, -2.0)
        this._camera.rotation.set(0, Math.PI, 0)

        // camera controls
        this._control = new OrbitControls( this._camera, this._canvas);
        this._control.screenSpacePanning = true;
        this._control.target.set( 0.0, 0.8, 0.0 );
        this._control.update();

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

                const normalPose = (vrm) => {
                    const leftUpperArm = vrm.humanoid.getBoneNode('leftUpperArm')
                    leftUpperArm.rotateZ(1.2)
                    const rightUpperArm = vrm.humanoid.getBoneNode('rightUpperArm')
                    rightUpperArm.rotateZ(-1.2)
                }
                
                normalPose(vrm)

                // IK
                this._vrmIK = new VrmIK(vrm);

                // controler
                console.log(this._vrmIK.ikChains)

                this._vrmIK.ikChains.forEach(chain => {
                    const transCtrl = new TransformControls(this._camera, this._canvas);
                    transCtrl.size = 0.5;
                    transCtrl.attach(chain.goal);
                    transCtrl.addEventListener('dragging-changed', event => {
                        this._control.enabled = !event.value;
                    });
                    this._vrm.scene.add(transCtrl);
                });
                
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
        return this._control
    }

    get vrm(){
        return this._vrm
    }

    update(){
        if (!!this._vrmIK) this._vrmIK.solve();
        this._renderer.render(this._scene, this._camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    let exexuted = false;

    const setup = () => {
        // setup editor
        window.openpose_editor = new OpenposeEditor()

        // update loop
        const update = () => {
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