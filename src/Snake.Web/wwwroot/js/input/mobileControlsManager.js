import { GAME_CONFIG } from '../config/gameConfig.js';
import gameState from '../state/gameState.js';
import { EventEmitter } from '../utils/eventEmitter.js';

/**
 * Handles mobile touch controls and swipe gestures
 */
export class MobileControlsManager extends EventEmitter {
    constructor() {
        super();
        this.isTouchDevice = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.setup();
    }

    /**
     * Set up mobile controls if on touch device
     */
    setup() {
        this.isTouchDevice = this.detectTouchDevice();
        
        if (this.isTouchDevice) {
            this.showMobileControls();
            this.setupTouchControls();
            this.setupSwipeControls();
        }
    }

    /**
     * Detect if device supports touch
     * @returns {boolean}
     * @private
     */
    detectTouchDevice() {
        return (('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0) ||
               (navigator.msMaxTouchPoints > 0));
    }

    /**
     * Show mobile control elements
     * @private
     */
    showMobileControls() {
        const mobileControls = document.getElementById('mobileControls');
        const mobilePause = document.getElementById('mobilePause');
        
        if (mobileControls) {
            mobileControls.classList.add('show');
        }
        if (mobilePause) {
            mobilePause.classList.add('show');
        }
    }

    /**
     * Set up on-screen button controls
     * @private
     */
    setupTouchControls() {
        const dpadButtons = document.querySelectorAll('.dpad-button');
        const mobilePause = document.getElementById('mobilePause');
        
        dpadButtons.forEach(button => {
            this.setupButtonEvents(button);
        });
        
        if (mobilePause) {
            this.setupPauseButtonEvents(mobilePause);
        }
    }

    /**
     * Set up events for directional buttons
     * @param {HTMLElement} button 
     * @private
     */
    setupButtonEvents(button) {
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const direction = button.dataset.direction;
            this.handleMobileInput(direction);
            
            // Visual feedback
            button.style.backgroundColor = 'rgba(77, 238, 234, 0.8)';
        });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            // Remove visual feedback
            button.style.backgroundColor = 'rgba(77, 238, 234, 0.3)';
        });
        
        // Prevent context menu on long press
        button.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    /**
     * Set up events for pause button
     * @param {HTMLElement} mobilePause 
     * @private
     */
    setupPauseButtonEvents(mobilePause) {
        mobilePause.addEventListener('touchstart', async (e) => {
            e.preventDefault();
            await this.handlePauseInput();
            
            // Visual feedback
            mobilePause.style.backgroundColor = 'rgba(77, 238, 234, 0.8)';
        });
        
        mobilePause.addEventListener('touchend', (e) => {
            e.preventDefault();
            mobilePause.style.backgroundColor = 'rgba(77, 238, 234, 0.3)';
        });
    }

    /**
     * Set up swipe gesture detection
     * @private
     */
    setupSwipeControls() {
        const canvas = document.getElementById('gameCanvas');
        const gameContainer = document.querySelector('.game-container');
        
        // Use game container as swipe target for better UX
        const swipeTarget = gameContainer || canvas;
        
        if (!swipeTarget) return;
        
        swipeTarget.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e);
        }, { passive: false });
        
        swipeTarget.addEventListener('touchmove', (e) => {
            // Prevent scrolling during swipe
            e.preventDefault();
        }, { passive: false });
        
        swipeTarget.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e);
        }, { passive: false });
    }

    /**
     * Handle touch start for swipe detection
     * @param {TouchEvent} e 
     * @private
     */
    handleTouchStart(e) {
        if (e.touches.length === 1) { // Single finger only
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchStartTime = Date.now();
        }
    }

    /**
     * Handle touch end for swipe detection
     * @param {TouchEvent} e 
     * @private
     */
    handleTouchEnd(e) {
        if (e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            const touchEndX = touch.clientX;
            const touchEndY = touch.clientY;
            const touchEndTime = Date.now();
            
            this.handleSwipeGesture(
                this.touchStartX, 
                this.touchStartY, 
                touchEndX, 
                touchEndY, 
                touchEndTime - this.touchStartTime
            );
        }
    }

    /**
     * Process swipe gesture and determine direction
     * @param {number} startX 
     * @param {number} startY 
     * @param {number} endX 
     * @param {number} endY 
     * @param {number} duration 
     * @private
     */
    handleSwipeGesture(startX, startY, endX, endY, duration) {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Check if swipe meets minimum distance threshold
        if (distance < GAME_CONFIG.SWIPE_THRESHOLD) {
            return;
        }
        
        // Calculate velocity (distance per millisecond)
        const velocity = distance / duration;
        
        // Check if swipe meets minimum velocity threshold
        if (velocity < GAME_CONFIG.SWIPE_VELOCITY_THRESHOLD) {
            return;
        }
        
        // Determine swipe direction based on larger axis
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        let direction;
        if (absDeltaX > absDeltaY) {
            // Horizontal swipe
            direction = deltaX > 0 ? 'right' : 'left';
        } else {
            // Vertical swipe
            direction = deltaY > 0 ? 'down' : 'up';
        }
        
        this.handleMobileInput(direction);
    }    /**
     * Handle mobile directional input
     * @param {string} direction 
     */
    async handleMobileInput(direction) {
        if (gameState.gameState !== 'Playing') {
            return;
        }
        
        // Map direction to game direction
        const directionMap = {
            'up': 'Up',
            'down': 'Down',
            'left': 'Left',
            'right': 'Right'
        };
        
        const gameDirection = directionMap[direction];
        if (gameDirection) {
            this.emit('directionChanged', gameDirection);
        }
    }    /**
     * Handle pause input from mobile controls
     * @private
     */
    async handlePauseInput() {
        switch (gameState.gameState) {
            case 'Ready':
                console.log('🎮 Mobile player pressed pause to start game');
                this.emit('gameAction', 'start');
                break;
            case 'Playing':
                this.emit('gameAction', 'pause');
                break;
            case 'Paused':
                this.emit('gameAction', 'resume');
                break;
        }
    }    /**
     * Check if device is touch-enabled
     * @returns {boolean}
     */
    isTouchEnabled() {
        return this.isTouchDevice;
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        this.removeAllListeners();
    }
}
