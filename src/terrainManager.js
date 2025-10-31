import * as THREE from 'three';

export class TerrainManager {
    constructor(scene, tileLoader) {
        this.scene = scene;
        this.tileLoader = tileLoader;
        this.terrainGroup = new THREE.Group();
        this.scene.add(this.terrainGroup);
        
        // Parameter terrain
        this.heightScale = 100; // Skala ketinggian
        this.noiseScale = 0.05;  // Skala noise
        this.detailLevel = 5;    // Level detail terrain
    }

    // Generate 3D terrain dari tile data
    generateTerrainFromTile(tileMesh) {
        const { x, y, z, bbox } = tileMesh.userData;
        
        // Buat geometri terrain dengan subdivisi
        const width = bbox.x2 - bbox.x1;
        const height = bbox.y2 - bbox.y1;
        const segments = 64; // Resolusi terrain
        
        const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
        
        // Generate ketinggian menggunakan noise
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            
            // Hitung jarak dari center
            const distanceFromCenter = Math.sqrt(x * x + y * y);
            
            // Generate ketinggian dengan beberapa layer noise
            let elevation = 0;
            
            // Layer 1: Noise dasar
            elevation += this.noise(x * this.noiseScale, y * this.noiseScale) * this.heightScale;
            
            // Layer 2: Noise detail
            elevation += this.noise(x * this.noiseScale * 5, y * this.noiseScale * 5) * this.heightScale * 0.3;
            
            // Layer 3: Noise besar
            elevation += this.noise(x * this.noiseScale * 0.2, y * this.noiseScale * 0.2) * this.heightScale * 2;
            
            // Efek pegunungan di pinggir
            const edgeEffect = Math.max(0, (distanceFromCenter - width * 0.3) / (width * 0.2));
            elevation += edgeEffect * edgeEffect * this.heightScale * 3;
            
            vertices[i + 2] = elevation;
        }
        
        // Update normals untuk lighting yang benar
        geometry.computeVertexNormals();
        
        // Buat material terrain
        const material = new THREE.MeshLambertMaterial({
            color: 0x8FBC8F,
            wireframe: false
        });
        
        // Buat mesh terrain
        const terrainMesh = new THREE.Mesh(geometry, material);
        terrainMesh.position.copy(tileMesh.position);
        terrainMesh.rotation.copy(tileMesh.rotation);
        terrainMesh.userData = { type: 'terrain', tileX: x, tileY: y, tileZ: z };
        
        return terrainMesh;
    }

    // Fungsi noise sederhana
    noise(x, y) {
        return Math.sin(x * 1.2) * Math.cos(y * 1.2) + 
               Math.sin(x * 2.4) * Math.cos(y * 2.4) * 0.5 +
               Math.sin(x * 4.8) * Math.cos(y * 4.8) * 0.25;
    }

    // Update terrain untuk tile yang terlihat
    updateVisibleTerrain() {
        // Hapus terrain yang tidak terlihat
        const terrainsToRemove = [];
        this.terrainGroup.children.forEach(terrain => {
            const { tileX, tileY, tileZ } = terrain.userData;
            const tileKey = `${tileZ},${tileX},${tileY}`;
            
            if (!this.tileLoader.visibleTiles.has(tileKey)) {
                terrainsToRemove.push(terrain);
            }
        });
        
        terrainsToRemove.forEach(terrain => {
            this.terrainGroup.remove(terrain);
            terrain.geometry.dispose();
            terrain.material.dispose();
        });
        
        // Tambahkan terrain untuk tile yang terlihat
        this.tileLoader.tileGroup.children.forEach(tileMesh => {
            const { x, y, z } = tileMesh.userData;
            const tileKey = `${z},${x},${y}`;
            
            // Cek apakah terrain sudah ada
            const terrainExists = this.terrainGroup.children.some(terrain => {
                const { tileX, tileY, tileZ } = terrain.userData;
                return tileX === x && tileY === y && tileZ === z;
            });
            
            if (!terrainExists && this.tileLoader.visibleTiles.has(tileKey)) {
                const terrain = this.generateTerrainFromTile(tileMesh);
                this.terrainGroup.add(terrain);
            }
        });
    }
}