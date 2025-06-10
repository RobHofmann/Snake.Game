// Debug script to check current game state
console.log('🔍 Debug: Checking current game state...');

// Check game state
import gameState from './state/gameState.js';
console.log('Game State:', gameState.gameState);
console.log('Game State Object:', gameState);

// Check DOM elements
const canvas = document.getElementById('gameCanvas');
const startScreen = document.getElementById('startScreen');
const powerupCanvas = document.getElementById('powerupCanvas');

console.log('Canvas element:', canvas);
console.log('Canvas classes:', canvas?.className);
console.log('Canvas style display:', canvas?.style.display);

console.log('Start screen element:', startScreen);
console.log('Start screen classes:', startScreen?.className);

console.log('Powerup canvas element:', powerupCanvas);
console.log('Powerup canvas classes:', powerupCanvas?.className);

// Check if UIManager is working
console.log('🧪 Testing manual UI update...');
if (window.game && window.game.uiManager) {
    console.log('UIManager found, calling updateUI...');
    window.game.uiManager.updateUI();
} else {
    console.log('UIManager not found on window.game');
}
