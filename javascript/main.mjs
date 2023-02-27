import * as THREE from './three.mjs';
import { GLTFLoader } from './GLTFLoader.mjs'
import { VRMLoaderPlugin } from './three-vrm.mjs';

class OpenposeEditor {
    constructor() {
        const scene = new THREE.Scene();

        const loader = new GLTFLoader();

        const camera = new THREE.PerspectiveCamera(45, 512 / 512, 0.1, 1000)
        camera.position.set(0, 0.8, -2.0)
        camera.rotation.set(0, Math.PI, 0)
        

        const renderer = new THREE.WebGLRenderer({
            canvas: gradioApp().querySelector("canvas#openpose_editor_canvas"),
            antialias: true
        })
        renderer.setSize(512, 512);
        renderer.setClearColor(0x000000, 1);
        renderer.physicallyCorrectLights = true;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;

        const light = new THREE.AmbientLight(0xFFFFFF, 1.0);
        scene.add(light);        
        
        loader.register((parser) => {
            return new VRMLoaderPlugin(parser);
        });
        
        loader.load(
            'https://raw.githubusercontent.com/fkunn1326/openpose-editor/dev/vrm/openpose.vrm',
        
            (gltf) => {
                const vrm = gltf.userData.vrm;
            
                scene.add(vrm.scene);
            
                console.log(vrm);
            },
            
            (progress) => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),
            
            (error) => console.error(error),
        );

        function tick() {
            requestAnimationFrame(tick)
            renderer.render(scene, camera)
        }
        tick()
    }
}

window.addEventListener('DOMContentLoaded', () => {
    let exexuted = false;
    window.onload = () => {
        const observer = new MutationObserver((m) => {
            if(!exexuted && gradioApp().querySelector('canvas#openpose_editor_canvas')){
                exexuted = true;
                window.openpose_editor = new OpenposeEditor()
                observer.disconnect();
            }
        })
        observer.observe(gradioApp(), { childList: true, subtree: true })
    }
})