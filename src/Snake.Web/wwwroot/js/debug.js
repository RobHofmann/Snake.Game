// Simple test to check if our modular system is working
console.log('🧪 Starting Snake Game Module Test...');

// Test if modules load correctly
try {
    // Test EventEmitter first
    const { EventEmitter } = await import('./utils/eventEmitter.js');
    console.log('✅ EventEmitter loaded');
    
    const emitter = new EventEmitter();
    emitter.on('test', (data) => console.log('✅ EventEmitter working:', data));
    emitter.emit('test', 'Hello World');
    
    // Test InputManager
    const { InputManager } = await import('./input/inputManager.js');
    console.log('✅ InputManager loaded');
    
    const inputManager = new InputManager();
    console.log('✅ InputManager created, has on method:', typeof inputManager.on === 'function');
    
    // Test event handling
    inputManager.on('directionChanged', (direction) => {
        console.log('✅ InputManager direction event:', direction);
    });
    
    inputManager.on('gameAction', (action) => {
        console.log('✅ InputManager game action event:', action);
    });
    
    console.log('✅ All module tests passed!');
    console.log('🎮 Try pressing SPACE or arrow keys to test input');
    
} catch (error) {
    console.error('❌ Module test failed:', error);
}
