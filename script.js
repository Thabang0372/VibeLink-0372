// Wait for all dependencies to load
function waitForDependencies() {
    return new Promise((resolve) => {
        const checkDeps = () => {
            if (typeof Parse !== 'undefined' && typeof window.vibeSecurity !== 'undefined') {
                resolve();
            } else {
                setTimeout(checkDeps, 100);
            }
        };
        checkDeps();
    });
}

// Import all modules
import VibeLink0372 from './src/core/initialization/VibeLink0372.js';

let vibeApp;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Starting VibeLink 0372...');
        
        await waitForDependencies();
        console.log('✅ All dependencies loaded');
        
        vibeApp = new VibeLink0372();
        await vibeApp.initializeApp();
        window.vibeApp = vibeApp;
        
        console.log('🎉 VibeLink 0372 fully operational');
        
    } catch (error) {
        console.error('🚨 VibeLink 0372 failed:', error);
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: white; background: #0D0D0D; min-height: 100vh;">
                <h1 style="color: #FF5A1F;">🚨 VibeLink 0372 Initialization Failed</h1>
                <p><strong>Error:</strong> ${error.message}</p>
                <button onclick="window.location.reload()" style="background: #00E6E6; color: black; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer;">
                    🔄 Retry
                </button>
            </div>
        `;
    }
});