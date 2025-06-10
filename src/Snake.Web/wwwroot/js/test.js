// Test script to verify module loading
import { InputManager } from './input/inputManager.js';
import { MobileControlsManager } from './input/mobileControlsManager.js';
import { EventEmitter } from './utils/eventEmitter.js';

console.log('Testing module loading...');

// Test EventEmitter
const emitter = new EventEmitter();
console.log('EventEmitter created:', emitter);
console.log('EventEmitter has on method:', typeof emitter.on === 'function');
console.log('EventEmitter has emit method:', typeof emitter.emit === 'function');

// Test InputManager
try {
    const inputManager = new InputManager();
    console.log('InputManager created:', inputManager);
    console.log('InputManager has on method:', typeof inputManager.on === 'function');
    console.log('InputManager has emit method:', typeof inputManager.emit === 'function');
    console.log('InputManager extends EventEmitter:', inputManager instanceof EventEmitter);
} catch (error) {
    console.error('Error creating InputManager:', error);
}

// Test MobileControlsManager
try {
    const mobileManager = new MobileControlsManager();
    console.log('MobileControlsManager created:', mobileManager);
    console.log('MobileControlsManager has on method:', typeof mobileManager.on === 'function');
    console.log('MobileControlsManager has emit method:', typeof mobileManager.emit === 'function');
    console.log('MobileControlsManager extends EventEmitter:', mobileManager instanceof EventEmitter);
} catch (error) {
    console.error('Error creating MobileControlsManager:', error);
}

console.log('Module testing complete');
