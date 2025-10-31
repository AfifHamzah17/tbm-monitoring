import * as THREE from 'three';

export class ThreeManager {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.container = null;
        this.trees = [];
        this.is3DView = false;
        this.treeGroup = null;
    }

    init() {
        // Create container for Three.js
        this.container = document.getElementById('three-container');
        
        // Initialize Three.js
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent background
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000000000
        );
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            alpha: true, // Transparent background
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10000000, 20000000, 10000000);
        this.scene.add(directionalLight);
        
        // Tree group
        this.treeGroup = new THREE.Group();
        this.scene.add(this.treeGroup);
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Start with 2D view
        this.set2DView();
        
        // Start animation loop
        this.animate();
    }

    set2DView() {
        this.is3DView = false;
        this.container.style.pointerEvents = 'none';
        
        // Position camera for 2D view
        const bounds = this.mapManager.map.getBounds();
        const center = bounds.getCenter();
        const zoom = this.mapManager.map.getZoom();
        
        // Calculate camera position based on map bounds and zoom
        const worldSize = 256 * Math.pow(2, zoom);
        const scale = worldSize / 360;
        
        this.camera.position.set(
            0,
            10000000, // High up for 2D view
            0
        );
        this.camera.lookAt(0, 0, 0);
    }

    set3DView() {
        this.is3DView = true;
        this.container.style.pointerEvents = 'auto';
        
        // Position camera for 3D view
        const bounds = this.mapManager.map.getBounds();
        const center = bounds.getCenter();
        
        this.camera.position.set(
            0,
            5000000, // Lower for 3D view
            10000000
        );
        this.camera.lookAt(0, 0, 0);
    }

    toggle3DView() {
        if (this.is3DView) {
            this.set2DView();
        } else {
            this.set3DView();
        }
    }

    generateProceduralTree(height) {
        const trunkHeight = height * 0.6;
        const crownHeight = height * 0.8;
        const trunkRadius = height * 0.05;
        const crownRadius = height * 0.3;
        
        const treeGroup = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(
            trunkRadius * 0.7,
            trunkRadius,
            trunkHeight,
            8
        );
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        treeGroup.add(trunk);
        
        // Crown with different shapes
        const crownShapes = [
            () => {
                const geometry = new THREE.ConeGeometry(crownRadius, crownHeight, 8);
                return new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x228B22 }));
            },
            () => {
                const geometry = new THREE.SphereGeometry(crownRadius, 8, 6);
                return new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x32CD32 }));
            },
            () => {
                const geometry = new THREE.SphereGeometry(crownRadius, 8, 6);
                const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x2E8B57 }));
                mesh.scale.y = 1.5;
                return mesh;
            }
        ];
        
        const crownShapeIndex = Math.floor(Math.random() * crownShapes.length);
        const crown = crownShapes[crownShapeIndex]();
        crown.position.y = trunkHeight + crownHeight / 2;
        treeGroup.add(crown);
        
        return treeGroup;
    }

    addTreeAtPosition(latLng) {
        // Convert lat/lng to world coordinates
        const projection = this.mapManager.map.getProjection();
        const worldCoordinate = projection.fromLatLngToPoint(latLng);
        
        // Scale to match our coordinate system
        const scale = 100000;
        const x = (worldCoordinate.x - 0.5) * scale;
        const z = (worldCoordinate.y - 0.5) * scale;
        
        // Generate tree
        const height = 5 + Math.random() * 10;
        const tree = this.generateProceduralTree(height);
        
        // Position tree
        tree.position.set(x, 0, z);
        tree.rotation.y = Math.random() * Math.PI * 2;
        
        // Store tree data
        tree.userData = {
            type: 'tree',
            height,
            latLng: latLng
        };
        
        this.treeGroup.add(tree);
        this.trees.push(tree);
        
        return tree;
    }

    addSampleTrees() {
        // Add sample trees at specific locations
        const sampleLocations = [
            new google.maps.LatLng(3.25, 98.93),
            new google.maps.LatLng(3.26, 98.94),
            new google.maps.LatLng(3.27, 98.95),
            new google.maps.LatLng(3.28, 98.92),
            new google.maps.LatLng(3.29, 98.93)
        ];
        
        sampleLocations.forEach(location => {
            this.addTreeAtPosition(location);
        });
    }

    toggleTrees() {
        this.treeGroup.visible = !this.treeGroup.visible;
    }

    animateGrowth() {
        this.trees.forEach(tree => {
            if (tree.userData.type === 'tree') {
                this.animateTreeGrowth(tree, tree.userData.height, 2000);
            }
        });
    }

    animateTreeGrowth(tree, targetHeight, duration = 2000) {
        const startHeight = 0.1;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeProgress = this.easeOutElastic(progress);
            const currentHeight = startHeight + (targetHeight - startHeight) * easeProgress;
            
            // Update trunk
            const trunk = tree.children.find(child => 
                child.geometry instanceof THREE.CylinderGeometry
            );
            if (trunk) {
                trunk.scale.y = currentHeight / targetHeight;
                trunk.position.y = (currentHeight * 0.6) / 2;
            }
            
            // Update crown
            const crown = tree.children.find(child => 
                child.geometry instanceof THREE.ConeGeometry || 
                child.geometry instanceof THREE.SphereGeometry
            );
            if (crown) {
                crown.scale.y = currentHeight / targetHeight;
                crown.position.y = (currentHeight * 0.6) + (currentHeight * 0.8) / 2;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    easeOutElastic(x) {
        const c4 = (2 * Math.PI) / 3;
        return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.renderer.render(this.scene, this.camera);
    }

    getTreeCount() {
        return this.trees.length;
    }
}