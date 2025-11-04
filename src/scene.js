// import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// export class Scene {
//     constructor() {
//         this.scene = new THREE.Scene();
//         this.scene.background = new THREE.Color(0x87CEEB);
        
//         this.camera = new THREE.PerspectiveCamera(
//             60,
//             window.innerWidth / window.innerHeight,
//             0.1,
//             1000000000
//         );
//         this.camera.position.set(0, 10000000, 15000000);
//         this.camera.lookAt(0, 0, 0);

//         this.renderer = new THREE.WebGLRenderer({ antialias: true });
//         this.renderer.setSize(window.innerWidth, window.innerHeight);
//         this.renderer.setPixelRatio(window.devicePixelRatio);
//         document.body.appendChild(this.renderer.domElement);

//         this.controls = new OrbitControls(this.camera, this.renderer.domElement);
//         this.controls.enableDamping = true;
//         this.controls.dampingFactor = 0.05;
//         this.controls.minDistance = 100000;
//         this.controls.maxDistance = 50000000;
//         this.controls.maxPolarAngle = Math.PI / 2.1;

//         // Lighting
//         const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
//         this.scene.add(ambientLight);

//         const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
//         directionalLight.position.set(10000000, 20000000, 10000000);
//         this.scene.add(directionalLight);

//         // Grid helper
//         const gridHelper = new THREE.GridHelper(20000000, 20);
//         this.scene.add(gridHelper);

//         // Event listeners
//         window.addEventListener('resize', this.onWindowResize.bind(this));
//         this.controls.addEventListener('change', () => {
//             if (this.onCameraChange) {
//                 this.onCameraChange();
//             }
//         });
//     }

//     onWindowResize() {
//         this.camera.aspect = window.innerWidth / window.innerHeight;
//         this.camera.updateProjectionMatrix();
//         this.renderer.setSize(window.innerWidth, window.innerHeight);
//     }

//     animate() {
//         requestAnimationFrame(this.animate.bind(this));
//         this.controls.update();
//         this.renderer.render(this.scene, this.camera);
//     }

//     add(object) {
//         this.scene.add(object);
//     }

//     remove(object) {
//         this.scene.remove(object);
//     }
// }

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TileLoader } from './tileLoader.js';
import { TerrainManager } from './terrainManager.js';
import { TreeManager } from './threeManager.js';

export class Scene {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000000000
        );
        this.camera.position.set(0, 10000000, 15000000);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 100000;
        this.controls.maxDistance = 50000000;
        this.controls.maxPolarAngle = Math.PI / 2.1;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10000000, 20000000, 10000000);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Grid helper
        const gridHelper = new THREE.GridHelper(20000000, 20);
        this.scene.add(gridHelper);

        // Event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.controls.addEventListener('change', () => {
            if (this.onCameraChange) {
                this.onCameraChange();
            }
        });

        // Inisialisasi managers
        this.tileLoader = new TileLoader(this.scene, this.camera);
        this.terrainManager = new TerrainManager(this.scene, this.tileLoader);
        this.treeManager = new TreeManager(this.scene, this.terrainManager);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }
}