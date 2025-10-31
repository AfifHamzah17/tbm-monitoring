import { MapManager } from './mapManager.js';
import { ThreeManager } from './threeManager.js';

// Fungsi untuk memastikan Google Maps API sudah dimuat
function ensureGoogleMapsLoaded() {
    return new Promise((resolve, reject) => {
        if (typeof google !== 'undefined' && google.maps) {
            resolve();
        } else {
            // Tunggu hingga google.maps tersedia
            const checkInterval = setInterval(() => {
                if (typeof google !== 'undefined' && google.maps) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // Timeout setelah 10 detik
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Google Maps API failed to load'));
            }, 10000);
        }
    });
}

// Fungsi utama
async function initializeApp() {
    try {
        // Pastikan Google Maps API sudah dimuat
        await ensureGoogleMapsLoaded();
        
        console.log('Google Maps API loaded');
        
        // Inisialisasi Map Manager
        const mapManager = new MapManager();
        await mapManager.init();
        
        console.log('Map initialized');
        
        // Inisialisasi Three Manager
        const threeManager = new ThreeManager(mapManager);
        threeManager.init();
        
        // Event listeners
        document.getElementById('toggle-3d').addEventListener('click', () => {
            threeManager.toggle3DView();
        });
        
        document.getElementById('toggle-trees').addEventListener('click', () => {
            threeManager.toggleTrees();
        });
        
        document.getElementById('animate-growth').addEventListener('click', () => {
            threeManager.animateGrowth();
        });
        
        // Update UI
        setInterval(() => {
            if (mapManager.map) {
                document.getElementById('zoom').textContent = mapManager.map.getZoom();
            }
            document.getElementById('tile-count').textContent = mapManager.getVisibleTileCount();
            document.getElementById('tree-count').textContent = threeManager.getTreeCount();
        }, 1000);
        
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Jalankan aplikasi
initializeApp();