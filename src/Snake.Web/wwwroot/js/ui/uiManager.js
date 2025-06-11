import { GAME_CONFIG } from '../config/gameConfig.js';
import gameState from '../state/gameState.js';
import { EventEmitter } from '../utils/eventEmitter.js';

/**
 * Manages UI state (simplified - no longer handles high score submission)
 * High score submission is now handled by HighScoreManager in main.js
 */
export class UIManager extends EventEmitter {
    constructor() {
        super();
        this.readyStateActive = false;
        this.setupDOMElements();
        this.setupEventListeners();
    }    /**
     * Cache DOM elements for performance
     * @private
     */
    setupDOMElements() {
        this.scoreElement = document.getElementById('score');
        this.gameStatusElement = document.getElementById('gameStatus');
        this.finalScoreElement = document.getElementById('finalScore');
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOver');
        this.canvas = document.getElementById('gameCanvas');
        this.powerupCanvas = document.getElementById('powerupCanvas');
        this.playAgainButton = document.getElementById('playAgain');
        
        // Note: High score modal elements are now handled by HighScoreManager
    }    /**
     * Set up UI event listeners
     * @private
     */
    setupEventListeners() {
        // Play again button
        if (this.playAgainButton) {
            this.playAgainButton.addEventListener('click', () => {
                console.log('🎮 Player clicked Play Again button');
                this.emit('playAgain');
            });
        }
        
        // Note: High score submission event listeners are now handled by HighScoreManager
    }

    /**
     * Initialize UI components
     */
    initialize() {
        this.update();
    }    /**
     * Update UI based on current game state
     */
    update() {
        this.updateScoreDisplay();
        this.updateScreenVisibility();
    }

    /**
     * Update UI based on provided game state
     * @param {Object} newState - The new game state
     */
    updateUI(newState) {
        // Update local reference and refresh UI
        this.updateScoreDisplay();
        this.updateScreenVisibility();
    }

    /**
     * Update score display elements
     * @private
     */
    updateScoreDisplay() {
        if (this.scoreElement) {
            this.scoreElement.textContent = gameState.score;
        }
        
        if (this.gameStatusElement) {
            this.gameStatusElement.textContent = gameState.gameState;
        }
        
        if (this.finalScoreElement) {
            this.finalScoreElement.textContent = gameState.score;
        }
    }    /**
     * Update screen visibility based on game state
     * @private
     */
    updateScreenVisibility() {
        switch (gameState.gameState) {
            case 'Ready':
                this.showReadyState();
                break;
            case 'GameOver':
                this.showGameOverState();
                break;
            default:
                this.showPlayingState();
                break;
        }
    }

    /**
     * Show ready state UI
     * @private
     */
    showReadyState() {        this.showElement(this.startScreen);
        this.hideElement(this.gameOverScreen);
        this.hideElement(this.canvas);
        this.showElement(this.powerupCanvas);

        // Handle flag reset for new game session
        if (!this.readyStateActive) {
            console.log('🔄 Entering Ready state - scheduling flag reset...');
            gameState.resetForNewGame();
            this.readyStateActive = true;
        }
    }    /**
     * Show game over state UI
     * @private
     */
    showGameOverState() {
        this.hideElement(this.startScreen);
        this.showElement(this.gameOverScreen);
        this.showElement(this.canvas);
        this.showElement(this.powerupCanvas);

        // Clear ready state flag
        this.readyStateActive = false;
        
        // NOTE: High score handling is now managed by HighScoreManager in main.js
        // No need to handle high score submission here anymore
    }    /**
     * Show playing state UI
     * @private
     */
    showPlayingState() {
        this.hideElement(this.startScreen);
        this.hideElement(this.gameOverScreen);
        this.showElement(this.canvas);
        this.showElement(this.powerupCanvas);

        // Clear ready state flag
        this.readyStateActive = false;
    }/**
     * Show an element by removing 'hide' class
     * @param {HTMLElement} element 
     * @private
     */
    showElement(element) {
        if (element) {
            element.classList.remove('hide');
        }
    }

    /**
     * Hide an element by adding 'hide' class
     * @param {HTMLElement} element 
     * @private
     */
    hideElement(element) {
        if (element) {
            element.classList.add('hide');
        }
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        this.removeAllListeners();
    }
}
