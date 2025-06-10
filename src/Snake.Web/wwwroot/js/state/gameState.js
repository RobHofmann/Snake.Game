import { GAME_CONFIG, POWER_UP_CONFIG } from '../config/gameConfig.js';
import { EventEmitter } from '../utils/eventEmitter.js';

/**
 * Centralized game state management
 */
class GameState extends EventEmitter {
    constructor() {
        super();
        this.reset();
        this.pageLoadTime = Date.now();
    }    /**
     * Reset all game state to initial values
     */
    reset() {
        this.gameState = 'Ready';
        this.score = 0;
        this.snake = [];
        this.food = { x: 0, y: 0 };
        this.powerUps = [];
        this.activePowerUpEffects = [];
        this.stablePowerUpEffects = [];
        this.powerupDataHistory = [];        this.gameStartTime = 0;
        this.scoreSubmitted = false;
        this.gameWasPlayed = false;
        this.submissionInProgress = false; // Track if submission is currently happening
        this.currentGameId = Date.now(); // Unique ID for each game session
        
        // Power-up effect states
        this.isShieldActive = false;
        this.isDoublePointsActive = false;
        this.speedMultiplier = 1.0;
    }

    /**
     * Update state from server data
     * @param {Object} serverState - State data from server
     * @returns {boolean} - Whether game state changed
     */
    updateFromServer(serverState) {
        if (!serverState) return false;

        const previousGameState = this.gameState;
        const previousScore = this.score;
        const previousSnakeLength = this.snake.length;
        
        this.gameState = serverState.gameState || 'Ready';
        this.score = serverState.score || 0;
        this.snake = Array.isArray(serverState.snake) ? serverState.snake : [];
        this.food = serverState.food || { x: 0, y: 0 };
          // Handle game start logic
        if (this.shouldMarkGameAsStarted(previousGameState)) {
            this.markGameAsStarted();
        }
        
        // Update power-ups with color information
        this.updatePowerUps(serverState.powerUps);
        
        // Update active power-up effects with stability system
        this.updateActivePowerUpEffects(serverState.activePowerUpEffects);
        
        // Update power-up effect states
        this.isShieldActive = serverState.isShieldActive || false;
        this.isDoublePointsActive = serverState.isDoublePointsActive || false;
        this.speedMultiplier = serverState.speedMultiplier || 1.0;
          // Determine if significant change occurred
        const snakeGrew = this.snake.length > previousSnakeLength;
        const scoreChanged = this.score !== previousScore;
        const gameStateChanged = this.gameState !== previousGameState;
        
        // Emit state change event when state changes
        if (gameStateChanged || scoreChanged || snakeGrew) {
            this.emit('stateChanged', this.getCurrentState());
        }
        
        return gameStateChanged || scoreChanged || snakeGrew;
    }

    /**
     * Check if game should be marked as started
     * @param {string} previousGameState 
     * @returns {boolean}
     */
    shouldMarkGameAsStarted(previousGameState) {
        return (this.gameState === 'Playing') || 
               (this.gameState === 'GameOver' && this.score > 0 && this.gameStartTime === 0);
    }

    /**
     * Mark game as started and set flags
     */
    markGameAsStarted() {
        if (this.gameStartTime === 0) {
            this.gameStartTime = Date.now();
        }
        this.gameWasPlayed = true;
        this.scoreSubmitted = false;
    }

    /**
     * Update power-ups array with color information
     * @param {Array} serverPowerUps 
     */
    updatePowerUps(serverPowerUps) {
        if (Array.isArray(serverPowerUps)) {
            this.powerUps = serverPowerUps.map(p => ({
                ...p,
                color: p.color || this.getPowerUpColor(p.type)
            }));
        } else {
            this.powerUps = [];
        }
    }

    /**
     * Update active power-up effects with stability filtering
     * @param {Array} serverEffects 
     */    updateActivePowerUpEffects(serverEffects) {
        // Track powerup data history for stability
        this.powerupDataHistory.push({
            timestamp: Date.now(),
            length: serverEffects ? serverEffects.length : 0,
            state: this.gameState
        });

        // Keep only last 10 entries
        if (this.powerupDataHistory.length > 10) {
            this.powerupDataHistory.shift();
        }

        // Apply stability filter
        let effectsToUse = this.filterPowerUpEffects(serverEffects || []);
        
        this.activePowerUpEffects = effectsToUse.map(p => ({
            ...p,
            color: p.color || this.getPowerUpColor(p.type)
        }));
    }

    /**
     * Filter power-up effects for stability
     * @param {Array} effects 
     * @returns {Array}
     */
    filterPowerUpEffects(effects) {
        const currentLength = effects.length;
        const currentTime = Date.now();
        
        // Check recent history for inconsistencies
        const recentEntries = this.powerupDataHistory.filter(entry => 
            currentTime - entry.timestamp < 2000 && // Last 2 seconds
            entry.state === this.gameState
        );
        
        // Detect rapid alternation between 0 and non-zero powerups
        if (recentEntries.length >= 4) {
            const hasAlternation = recentEntries.some((entry, index) => {
                if (index === 0) return false;
                const prev = recentEntries[index - 1];
                return (entry.length === 0 && prev.length > 0) || 
                       (entry.length > 0 && prev.length === 0);
            });
            
            if (hasAlternation && currentLength === 0) {
                // Use stable version instead of empty array
                return this.stablePowerUpEffects;
            }
        }
        
        // Update stable version when we get consistent non-empty data
        if (currentLength > 0) {
            this.stablePowerUpEffects = [...effects];
        }
        
        return effects;
    }

    /**
     * Get power-up color based on type
     * @param {string} type 
     * @returns {string}
     */
    getPowerUpColor(type) {
        return POWER_UP_CONFIG.COLORS[type] || '#FFFFFF';
    }

    /**
     * Check if score qualifies for high score modal
     * @returns {boolean}
     */
    shouldShowHighScoreModal() {
        const timeSincePageLoad = Date.now() - this.pageLoadTime;
        
        // Basic validation conditions
        return timeSincePageLoad >= GAME_CONFIG.PAGE_LOAD_MODAL_DELAY_MS &&
               this.score > 0 &&
               this.gameWasPlayed &&
               this.gameStartTime > 0 &&
               !this.scoreSubmitted;
    }    /**
     * Reset flags for new game session
     */
    resetForNewGame() {
        this.scoreSubmitted = false;
        
        // Delay resetting other flags to prevent race conditions
        setTimeout(() => {
            this.gameStartTime = 0;
            this.gameWasPlayed = false;
        }, 100);
    }

    /**
     * Get the current complete game state
     * @returns {Object}
     */
    getCurrentState() {
        return {
            gameState: this.gameState,
            score: this.score,
            snake: this.snake,
            food: this.food,
            powerUps: this.powerUps,
            activePowerUpEffects: this.activePowerUpEffects,
            isShieldActive: this.isShieldActive,
            isDoublePointsActive: this.isDoublePointsActive,
            speedMultiplier: this.speedMultiplier
        };
    }

    /**
     * Get the game start time
     * @returns {number}
     */
    getGameStartTime() {
        return this.gameStartTime;
    }

    /**
     * Check if the game has been played
     * @returns {boolean}
     */
    hasGameBeenPlayed() {
        return this.gameWasPlayed;
    }    /**
     * Get the game duration in milliseconds
     * @returns {number}
     */
    getGameDuration() {
        if (this.gameStartTime === 0) return 0;
        return Date.now() - this.gameStartTime;
    }

    /**
     * Check if score submission can proceed (prevents duplicates)
     * @returns {boolean}
     */
    canSubmitScore() {
        return !this.scoreSubmitted && !this.submissionInProgress && this.gameWasPlayed && this.score > 0;
    }

    /**
     * Mark submission as in progress
     */
    startSubmission() {
        this.submissionInProgress = true;
    }

    /**
     * Mark submission as completed
     */
    completeSubmission() {
        this.scoreSubmitted = true;
        this.submissionInProgress = false;
    }

    /**
     * Reset submission state (for retry)
     */
    resetSubmissionState() {
        this.scoreSubmitted = false;
        this.submissionInProgress = false;
    }
}

// Export singleton instance
export default new GameState();
