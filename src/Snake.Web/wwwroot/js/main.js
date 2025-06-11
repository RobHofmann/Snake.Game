/**
 * Main game orchestrator - coordinates all modules and initializes the game
 * This is the entry point for the modular Snake game
 */

import { GAME_CONFIG } from './config/gameConfig.js';
import gameState from './state/gameState.js';
import { SignalRClient } from './network/signalrClient.js';
import { GameRenderer } from './rendering/gameRenderer.js';
import { PowerUpRenderer } from './rendering/powerUpRenderer.js';
import { InputManager } from './input/inputManager.js';
import { MobileControlsManager } from './input/mobileControlsManager.js';
import { LeaderboardManager } from './leaderboard/leaderboardManager.js';
import { UIManager } from './ui/uiManager.js';
import { HighScoreManager } from './ui/highScoreManager.js';

/**
 * Main Game class - orchestrates all game modules
 */
class SnakeGame {
    constructor() {
        this.gameState = null;
        this.signalrClient = null;
        this.gameRenderer = null;
        this.powerUpRenderer = null;
        this.inputManager = null;        this.mobileControlsManager = null;
        this.leaderboardManager = null;
        this.uiManager = null;
        this.highScoreManager = null;
          // Animation frame tracking
        this.lastGameRender = 0;
        this.lastGameStateHash = '';
        this.animationFrameId = null;
        
        // Game session tracking
        this.currentGameId = null;
    }

    /**
     * Initialize all game modules and start the game
     */
    async initialize() {
        try {            console.log('🚀 Initializing Snake Game modules...');
            
            // Initialize core state management
            this.gameState = gameState;            // Initialize networking
            this.signalrClient = new SignalRClient();
            await this.signalrClient.connect();
            
            // Connect SignalR events to game state
            this.setupSignalREventHandlers();
            
            // Initialize rendering modules
            this.gameRenderer = new GameRenderer('gameCanvas');
            this.powerUpRenderer = new PowerUpRenderer('powerupCanvas');
            
            // Initialize input handling
            this.inputManager = new InputManager();
            this.mobileControlsManager = new MobileControlsManager();            // Initialize UI management
            this.uiManager = new UIManager();
            this.highScoreManager = new HighScoreManager();
            this.leaderboardManager = new LeaderboardManager(GAME_CONFIG.API_BASE_URL);
            
            // Setup event handlers between modules
            this.setupModuleEventHandlers();
            
            // Start the game loop
            this.startGameLoop();
            
            // Load initial leaderboard
            await this.leaderboardManager.fetchLeaderboard();
            
            console.log('✅ Snake Game initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Snake Game:', error);
            throw error;
        }
    }

    /**
     * Setup SignalR event handlers to update game state
     */    setupSignalREventHandlers() {
        // Game state updates from server - corrected event name
        this.signalrClient.on('gameStateUpdated', (data) => {
            this.gameState.updateFromServer(data.state);
        });

        // Connection state changes
        this.signalrClient.on('connectionStateChanged', (isConnected) => {
            console.log(`🔌 Connection state: ${isConnected ? 'Connected' : 'Disconnected'}`);
        });

        // Error handling
        this.signalrClient.on('error', (error) => {
            console.error('SignalR error:', error);
        });
    }

    /**
     * Setup event handlers between different modules
     */
    setupModuleEventHandlers() {
        // Input events
        this.inputManager.on('directionChanged', async (direction) => {
            if (this.gameState.getCurrentState().gameState === 'Playing') {
                await this.signalrClient.changeDirection(direction);
            }
        });

        this.inputManager.on('gameAction', async (action) => {
            await this.handleGameAction(action);
        });        this.mobileControlsManager.on('directionChanged', async (direction) => {
            if (this.gameState.getCurrentState().gameState === 'Playing') {
                await this.signalrClient.changeDirection(direction);
            }
        });

        this.mobileControlsManager.on('gameAction', async (action) => {
            await this.handleGameAction(action);
        });        // Game state changes
        this.gameState.on('stateChanged', (newState) => {
            console.log('🎮 Main.js: Game state changed to:', newState.gameState, {
                score: newState.score,
                currentGameId: this.currentGameId
            });
            
            this.uiManager.updateUI(newState);
            
            // Handle game over specifically
            if (newState.gameState === 'GameOver') {
                // Reset powerup panel when game is over
                console.log('🧹 GameOver: Resetting powerup panel');
                this.powerUpRenderer.clearPanel();
                
                this.handleGameOver(newState);
            }
              // Start new game session for high score tracking
            if (newState.gameState === 'Playing') {
                // Always generate a new game ID when starting to play
                // This ensures each game session is unique for high score tracking
                const previousGameId = this.currentGameId;
                this.currentGameId = Date.now();
                console.log('🎮 Main.js: Starting new game session with ID:', this.currentGameId);
                
                // Notify high score manager of new game session
                const previousSubmissionState = this.highScoreManager.hasSubmittedThisGame;
                const previousSubmittingState = this.highScoreManager.isSubmitting;
                this.highScoreManager.startNewGame(this.currentGameId, previousGameId, previousSubmissionState, previousSubmittingState);
            }
              // Reset game ID for new games
            if (newState.gameState === 'Ready') {
                console.log('🎮 Main.js: Resetting game ID (was:', this.currentGameId, ')');
                this.currentGameId = null;
                
                // Also clear powerup panel for clean start
                console.log('🧹 Ready: Clearing powerup panel for new game');
                this.powerUpRenderer.clearPanel();
            }
        });// UI events
        this.uiManager.on('playAgain', async () => {
            await this.signalrClient.startGame();        });
        
        // High Score Manager events (NEW SYSTEM)
        this.highScoreManager.on('scoreSubmitted', async (playerName, score, gameTime) => {
            console.log('🎯 Main.js received scoreSubmitted event:', { playerName, score, gameTime });
            
            // Add optimistic score to leaderboard for instant feedback
            this.leaderboardManager.addOptimisticScore(playerName, score);
            
            try {
                const success = await this.leaderboardManager.submitScore(playerName, score, gameTime);                if (success) {                    // Mark submission as completed in game state
                    gameState.completeSubmission();
                    
                    // Mark optimistic score as submitted (remove spinner from leaderboard row)
                    this.leaderboardManager.markOptimisticScoreSubmitted(playerName, score);
                    
                    // Refresh leaderboard to show the updated scores FIRST (while spinner is still visible)
                    await this.leaderboardManager.fetchLeaderboard();
                    
                    // THEN complete submission in high score manager (this will hide modal/spinner)
                    this.highScoreManager.completeSubmission(true);
                } else {
                    // Handle submission failure - keep modal open for retry
                    this.highScoreManager.completeSubmission(false);
                    this.handleSubmissionFailure(playerName, score);
                }
            } catch (error) {
                console.error('Error submitting score:', error);
                // Handle submission error - keep modal open for retry
                this.highScoreManager.completeSubmission(false);
                this.handleSubmissionFailure(playerName, score);
            }        });
    }

    /**
     * Handle game action from input (start, pause, resume)
     */
    async handleGameAction(action) {
        const currentState = this.gameState.getCurrentState();
        
        switch (action) {            case 'start':
                if (currentState.gameState === 'Ready') {
                    this.gameState.markGameAsStarted();
                    await this.signalrClient.startGame();
                }
                break;
                
            case 'pause':
                if (currentState.gameState === 'Playing') {
                    await this.signalrClient.pauseGame();
                }
                break;
                
            case 'resume':
                if (currentState.gameState === 'Paused') {
                    await this.signalrClient.resumeGame();
                }
                break;
        }
    }    /**
     * Handle game over state
     */
    async handleGameOver(gameState) {
        console.log('🎮 Main.js: handleGameOver called with:', {
            score: gameState.score,
            gameWasPlayed: gameState.gameWasPlayed,
            scoreSubmitted: gameState.scoreSubmitted,
            currentGameId: this.currentGameId
        });
          // Show high score modal immediately for any score > 0 (BEFORE leaderboard fetch for instant display)
        // The HighScoreManager will handle duplicates and validation
        if (gameState.score > 0) {
            console.log('🏆 Game over - showing high score modal for score:', gameState.score);
            
            // Show high score modal immediately (moved before leaderboard fetch)
            this.highScoreManager.showModal(gameState.score);
        } else {
            console.log('🚫 No high score modal - score is 0');
        }
        
        // Refresh leaderboard in background (non-blocking)
        this.leaderboardManager.fetchLeaderboard().catch(error => {
            console.error('Error fetching leaderboard:', error);
        });
    }/**
     * Handle submission failure and allow retry
     * @param {string} playerName 
     * @param {number} score 
     * @private
     */
    handleSubmissionFailure(playerName, score) {
        // Reset submission state to allow retry
        gameState.resetSubmissionState();
        
        // Reset high score manager for retry
        this.highScoreManager.resetForRetry();
        
        // Show modal again for retry
        this.highScoreManager.showModal(score);
    }

    /**
     * Main game rendering loop
     */
    gameLoop() {
        const now = Date.now();
        const currentState = this.gameState.getCurrentState();
        const currentGameStateHash = JSON.stringify({
            snake: currentState.snake,
            food: currentState.food,
            score: currentState.score,
            gameState: currentState.gameState
        });

        // Only render when game is active
        if (currentState.gameState !== 'Ready') {
            // Render main game area only when needed (60 FPS max)
            if ((now - this.lastGameRender >= 16) && (currentGameStateHash !== this.lastGameStateHash)) {
                this.gameRenderer.render(currentState);
                this.lastGameRender = now;
                this.lastGameStateHash = currentGameStateHash;
            }
              // Always update power-up panel based on current effects
            if (currentState.activePowerUpEffects && currentState.activePowerUpEffects.length > 0) {
                this.powerUpRenderer.render(currentState.activePowerUpEffects);
            } else {
                // Clear panel if no active effects
                this.powerUpRenderer.clearPanel();
            }
        }
        
        // Continue the loop
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * Start the game loop
     */
    startGameLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.gameLoop();
    }

    /**
     * Stop the game loop
     */
    stopGameLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopGameLoop();
        
        if (this.signalrClient) {
            this.signalrClient.disconnect();
        }
        
        if (this.inputManager) {
            this.inputManager.destroy();
        }
        
        if (this.mobileControlsManager) {
            this.mobileControlsManager.destroy();
        }
    }
}

/**
 * Browser polyfills for older browsers
 */
function setupPolyfills() {
    // Handle roundRect for older browsers
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
            if (width < 2 * radius) radius = width / 2;
            if (height < 2 * radius) radius = height / 2;
            this.beginPath();
            this.moveTo(x + radius, y);
            this.arcTo(x + width, y, x + width, y + height, radius);
            this.arcTo(x + width, y + height, x, y + height, radius);
            this.arcTo(x, y + height, x, y, radius);
            this.arcTo(x, y, x + width, y, radius);
            this.closePath();
            return this;
        };
    }
}

/**
 * Application entry point
 */
async function initializeGame() {
    try {
        // Setup browser polyfills
        setupPolyfills();
        
        // Create and initialize the game
        const game = new SnakeGame();
        await game.initialize();
        
        // Make game instance available globally for debugging
        window.snakeGame = game;
        
        console.log('🎮 Snake Game is ready to play!');
        
    } catch (error) {
        console.error('💥 Failed to initialize game:', error);
        alert('Failed to initialize the game. Please refresh the page and try again.');
    }
}

// Handle cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
    if (window.snakeGame) {
        window.snakeGame.destroy();
    }
});

// Start the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

// Export for testing purposes
export { SnakeGame, initializeGame };
