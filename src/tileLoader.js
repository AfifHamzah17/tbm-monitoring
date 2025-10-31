// import * as THREE from 'three';

// export class TileManager {
//     constructor(scene, camera) {
//         this.scene = scene;
//         this.camera = camera;
//         this.tileGroup = new THREE.Group();
//         this.scene.add(this.tileGroup);
        
//         this.tileCache = new Map();
//         this.visibleTiles = new Set();
        
//         this.GCS_BUCKET = 'https://storage.googleapis.com/BUCKET_NAME'; // Ganti dengan bucket Anda
//         this.TILE_SIZE = 256;
//         this.EARTH_RADIUS = 6378137;
//         this.TILE_SCALE = this.EARTH_RADIUS * 2 * Math.PI / this.TILE_SIZE;
//         this.MAX_ZOOM = 19;
//         this.MIN_ZOOM = 0;
//     }

//     lonLatToMercator(lon, lat) {
//         const x = lon * (this.EARTH_RADIUS * Math.PI / 180);
//         const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) * (this.EARTH_RADIUS * Math.PI / 180);
//         return { x, y };
//     }

//     tileToMercator(x, y, z) {
//         const n = Math.pow(2, z);
//         const lon1 = x / n * 360.0 - 180.0;
//         const lat1 = y / n * 180.0 - 90.0;
//         const lon2 = (x + 1) / n * 360.0 - 180.0;
//         const lat2 = (y + 1) / n * 180.0 - 90.0;

//         const merc1 = this.lonLatToMercator(lon1, lat1);
//         const merc2 = this.lonLatToMercator(lon2, lat2);

//         return {
//             x1: merc1.x,
//             y1: merc1.y,
//             x2: merc2.x,
//             y2: merc2.y
//         };
//     }

//     createTileMesh(x, y, z) {
//         const bbox = this.tileToMercator(x, y, z);
//         const width = bbox.x2 - bbox.x1;
//         const height = bbox.y2 - bbox.y1;

//         const geometry = new THREE.PlaneGeometry(width, height);
//         const material = new THREE.MeshBasicMaterial({
//             side: THREE.DoubleSide,
//             transparent: true
//         });

//         const mesh = new THREE.Mesh(geometry, material);
//         mesh.position.set(
//             (bbox.x1 + bbox.x2) / 2,
//             0,
//             (bbox.y1 + bbox.y2) / 2
//         );
//         mesh.rotation.x = -Math.PI / 2;

//         mesh.userData = { x, y, z, bbox };

//         return mesh;
//     }

//     loadTileTexture(mesh) {
//         const { x, y, z } = mesh.userData;
//         const tileUrl = `${this.GCS_BUCKET}/${z}/${x}/${y}.png`;
        
//         const textureLoader = new THREE.TextureLoader();
//         textureLoader.load(
//             tileUrl,
//             (texture) => {
//                 mesh.material.map = texture;
//                 mesh.material.needsUpdate = true;
//             },
//             undefined,
//             (error) => {
//                 console.error(`Error loading tile ${z}/${x}/${y}.png:`, error);
//                 mesh.material.color.set(0xff0000);
//             }
//         );
//     }

//     updateTiles() {
//         const frustum = new THREE.Frustum();
//         const cameraMatrix = new THREE.Matrix4().multiplyMatrices(
//             this.camera.projectionMatrix,
//             this.camera.matrixWorldInverse
//         );
//         frustum.setFromProjectionMatrix(cameraMatrix);

//         const distance = this.camera.position.length();
//         const zoom = Math.max(
//             this.MIN_ZOOM,
//             Math.min(this.MAX_ZOOM, Math.floor(Math.log2(this.EARTH_RADIUS * 2 * Math.PI / (distance * 0.5))))
//         );

//         const newVisibleTiles = new Set();
//         const tilesToLoad = [];
//         const tilesToRemove = [];

//         this.tileGroup.children.forEach(mesh => {
//             const { x, y, z: tileZ } = mesh.userData;
//             const tileKey = `${tileZ},${x},${y}`;
            
//             if (tileZ !== zoom || !frustum.containsPoint(mesh.position)) {
//                 tilesToRemove.push(mesh);
//             } else {
//                 newVisibleTiles.add(tileKey);
//             }
//         });

//         const n = Math.pow(2, zoom);
//         const mercCenter = this.lonLatToMercator(
//             this.camera.position.x * 180 / (this.EARTH_RADIUS * Math.PI),
//             this.camera.position.z * 180 / (this.EARTH_RADIUS * Math.PI)
//         );
        
//         const centerTileX = Math.floor((mercCenter.x + this.EARTH_RADIUS * Math.PI) / (this.EARTH_RADIUS * 2 * Math.PI) * n);
//         const centerTileY = Math.floor((mercCenter.y + this.EARTH_RADIUS * Math.PI) / (this.EARTH_RADIUS * 2 * Math.PI) * n);
        
//         const range = Math.ceil(Math.sqrt(2) * this.camera.fov / 10) + 2;

//         for (let x = centerTileX - range; x <= centerTileX + range; x++) {
//             for (let y = centerTileY - range; y <= centerTileY + range; y++) {
//                 if (x >= 0 && x < n && y >= 0 && y < n) {
//                     const tileKey = `${zoom},${x},${y}`;
//                     if (!newVisibleTiles.has(tileKey)) {
//                         tilesToLoad.push({ x, y, z: zoom });
//                         newVisibleTiles.add(tileKey);
//                     }
//                 }
//             }
//         }

//         tilesToRemove.forEach(mesh => {
//             this.tileGroup.remove(mesh);
//             if (mesh.material.map) {
//                 mesh.material.map.dispose();
//             }
//             mesh.geometry.dispose();
//             mesh.material.dispose();
//         });

//         tilesToLoad.forEach(tile => {
//             const mesh = this.createTileMesh(tile.x, tile.y, tile.z);
//             this.loadTileTexture(mesh);
//             this.tileGroup.add(mesh);
//         });

//         this.visibleTiles = newVisibleTiles;
//         document.getElementById('zoom').textContent = zoom;
//         document.getElementById('tile-count').textContent = this.visibleTiles.size;
//     }
// }

import * as THREE from 'three';

export class TileLoader {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.tileGroup = new THREE.Group();
        this.scene.add(this.tileGroup);
        
        this.tileCache = new Map();
        this.visibleTiles = new Set();
        
        // Konstanta dari kode Google Maps
        this.mapBounds = {
            north: 3.3203997259626465,
            south: 3.224203180825914,
            east: 98.99210539797713,
            west: 98.90907309153492
        };
        this.mapMinZoom = 0;
        this.mapMaxZoom = 19;
        
        this.TILE_SIZE = 256;
        this.EARTH_RADIUS = 6378137;
    }

    // Konversi dari lat/lng ke Mercator
    latLngToMercator(lat, lng) {
        const x = lng * (this.EARTH_RADIUS * Math.PI / 180);
        const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) * (this.EARTH_RADIUS * Math.PI / 180);
        return { x, y };
    }

    // Konversi tile coordinate ke Mercator
    tileToMercator(x, y, z) {
        const n = Math.pow(2, z);
        const lng1 = x / n * 360.0 - 180.0;
        const lat1 = y / n * 180.0 - 90.0;
        const lng2 = (x + 1) / n * 360.0 - 180.0;
        const lat2 = (y + 1) / n * 180.0 - 90.0;

        const merc1 = this.latLngToMercator(lat1, lng1);
        const merc2 = this.latLngToMercator(lat2, lng2);

        return {
            x1: merc1.x,
            y1: merc1.y,
            x2: merc2.x,
            y2: merc2.y
        };
    }

    // Cek apakah tile dalam bounds
    isTileInBounds(x, y, z) {
        const n = Math.pow(2, z);
        const lng1 = x / n * 360.0 - 180.0;
        const lat1 = y / n * 180.0 - 90.0;
        const lng2 = (x + 1) / n * 360.0 - 180.0;
        const lat2 = (y + 1) / n * 180.0 - 90.0;

        return (
            lat1 < this.mapBounds.north &&
            lat2 > this.mapBounds.south &&
            lng1 < this.mapBounds.east &&
            lng2 > this.mapBounds.west
        );
    }

    // Buat mesh untuk satu tile
    createTileMesh(x, y, z) {
        const bbox = this.tileToMercator(x, y, z);
        const width = bbox.x2 - bbox.x1;
        const height = bbox.y2 - bbox.y1;

        // Buat geometri plane
        const geometry = new THREE.PlaneGeometry(width, height, 32, 32);
        const material = new THREE.MeshLambertMaterial({
            side: THREE.DoubleSide,
            transparent: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            (bbox.x1 + bbox.x2) / 2,
            0,
            (bbox.y1 + bbox.y2) / 2
        );
        mesh.rotation.x = -Math.PI / 2;

        // Simpan informasi tile
        mesh.userData = { x, y, z, bbox };

        return mesh;
    }

    // Load texture untuk tile
    loadTileTexture(mesh) {
        const { x, y, z } = mesh.userData;
        
        // Cek apakah tile dalam bounds
        if (!this.isTileInBounds(x, y, z)) {
            mesh.material.color.set(0x333333); // Warna abu-abu untuk tile di luar bounds
            return;
        }

        const tileUrl = `/hasil_tiles/${z}/${x}/${y}.png`;
        
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            tileUrl,
            (texture) => {
                mesh.material.map = texture;
                mesh.material.needsUpdate = true;
            },
            undefined,
            (error) => {
                console.error(`Error loading tile ${z}/${x}/${y}.png:`, error);
                mesh.material.color.set(0xff0000);
            }
        );
    }

    // Update tile yang terlihat
    updateTiles() {
        const frustum = new THREE.Frustum();
        const cameraMatrix = new THREE.Matrix4().multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(cameraMatrix);

        // Hitung zoom level berdasarkan jarak camera
        const distance = this.camera.position.length();
        const zoom = Math.max(
            this.mapMinZoom,
            Math.min(this.mapMaxZoom, Math.floor(Math.log2(this.EARTH_RADIUS * 2 * Math.PI / (distance * 0.5))))
        );

        const newVisibleTiles = new Set();
        const tilesToLoad = [];
        const tilesToRemove = [];

        // Cek tile yang sudah ada
        this.tileGroup.children.forEach(mesh => {
            const { x, y, z: tileZ } = mesh.userData;
            const tileKey = `${tileZ},${x},${y}`;
            
            if (tileZ !== zoom || !frustum.containsPoint(mesh.position)) {
                tilesToRemove.push(mesh);
            } else {
                newVisibleTiles.add(tileKey);
            }
        });

        // Hitung tile baru yang perlu dimuat
        const n = Math.pow(2, zoom);
        const mercCenter = this.latLngToMercator(
            this.camera.position.z * 180 / (this.EARTH_RADIUS * Math.PI),
            this.camera.position.x * 180 / (this.EARTH_RADIUS * Math.PI)
        );
        
        const centerTileX = Math.floor((mercCenter.x + this.EARTH_RADIUS * Math.PI) / (this.EARTH_RADIUS * 2 * Math.PI) * n);
        const centerTileY = Math.floor((mercCenter.y + this.EARTH_RADIUS * Math.PI) / (this.EARTH_RADIUS * 2 * Math.PI) * n);
        
        const range = Math.ceil(Math.sqrt(2) * this.camera.fov / 10) + 2;

        for (let x = centerTileX - range; x <= centerTileX + range; x++) {
            for (let y = centerTileY - range; y <= centerTileY + range; y++) {
                if (x >= 0 && x < n && y >= 0 && y < n) {
                    const tileKey = `${zoom},${x},${y}`;
                    if (!newVisibleTiles.has(tileKey)) {
                        tilesToLoad.push({ x, y, z: zoom });
                        newVisibleTiles.add(tileKey);
                    }
                }
            }
        }

        // Hapus tile yang tidak terlihat
        tilesToRemove.forEach(mesh => {
            this.tileGroup.remove(mesh);
            if (mesh.material.map) {
                mesh.material.map.dispose();
            }
            mesh.geometry.dispose();
            mesh.material.dispose();
        });

        // Tambahkan tile baru
        tilesToLoad.forEach(tile => {
            const mesh = this.createTileMesh(tile.x, tile.y, tile.z);
            this.loadTileTexture(mesh);
            this.tileGroup.add(mesh);
        });

        this.visibleTiles = newVisibleTiles;
        document.getElementById('zoom').textContent = zoom;
        document.getElementById('tile-count').textContent = this.visibleTiles.size;
    }
}