import { GAME_CONFIG } from '../config/gameConfig.js';
import gameState from '../state/gameState.js';
import { EventEmitter } from '../utils/eventEmitter.js';

/**
 * Dedicated High Score Management System
 * Handles ONLY high score modal and submission logic
 */
export class HighScoreManager extends EventEmitter {
    constructor() {
        super();
        this.isSubmitting = false;
        this.hasSubmittedThisGame = false;
        this.currentGameId = null;
        
        // Capture game data when modal is shown
        this.capturedScore = 0;
        this.capturedGameStartTime = 0;
        
        this.initializeElements();
        this.setupEventListeners();
    }

    /**
     * Initialize DOM elements
     * @private
     */    initializeElements() {
        this.modal = document.getElementById('nameInputModal');
        this.nameInput = document.getElementById('playerNameInput');
        this.submitButton = document.getElementById('submitHighScore');
        this.skipButton = document.getElementById('skipHighScore');
        this.scoreDisplay = document.getElementById('highScoreValue');
        this.submissionOverlay = document.getElementById('submissionOverlay');

        // Validate all elements exist
        const elements = {
            modal: this.modal,
            nameInput: this.nameInput,
            submitButton: this.submitButton,
            skipButton: this.skipButton,
            scoreDisplay: this.scoreDisplay,
            submissionOverlay: this.submissionOverlay
        };

        const missing = Object.entries(elements)
            .filter(([name, element]) => !element)
            .map(([name]) => name);

        if (missing.length > 0) {
            console.error('❌ Missing DOM elements:', missing);
            return;
        }

        console.log('✅ High Score Manager: All DOM elements found');
    }

    /**
     * Setup event listeners with proper context binding
     * @private
     */
    setupEventListeners() {
        if (!this.submitButton || !this.skipButton || !this.nameInput) {
            console.error('❌ Cannot setup event listeners - missing DOM elements');
            return;
        }

        // Remove any existing listeners first
        this.removeEventListeners();

        // Submit button
        this.submitHandler = (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            console.log('🎮 Submit button clicked, input value:', this.nameInput.value);
            this.handleSubmit();
        };
        this.submitButton.addEventListener('click', this.submitHandler);

        // Skip button
        this.skipHandler = (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            console.log('🎮 Skip button clicked');
            this.handleSubmit('Anonymous');
        };
        this.skipButton.addEventListener('click', this.skipHandler);

        // Enter key
        this.keyHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('🎮 Enter pressed, input value:', this.nameInput.value);
                this.handleSubmit();
            }
        };
        this.nameInput.addEventListener('keypress', this.keyHandler);

        console.log('✅ High Score Manager: Event listeners setup complete');
    }

    /**
     * Remove event listeners
     * @private
     */
    removeEventListeners() {
        if (this.submitButton && this.submitHandler) {
            this.submitButton.removeEventListener('click', this.submitHandler);
        }
        if (this.skipButton && this.skipHandler) {
            this.skipButton.removeEventListener('click', this.skipHandler);
        }
        if (this.nameInput && this.keyHandler) {
            this.nameInput.removeEventListener('keypress', this.keyHandler);
        }
    }    /**
     * Start a new game session
     * @param {string} gameId - Unique identifier for this game
     * @param {string} previousGameId - Previous game ID (optional, for logging)
     * @param {boolean} previousHasSubmitted - Previous submission state (optional, for logging)
     * @param {boolean} previousIsSubmitting - Previous submitting state (optional, for logging)
     */
    startNewGame(gameId, previousGameId = null, previousHasSubmitted = false, previousIsSubmitting = false) {
        console.log('🎮 HighScoreManager.startNewGame called with:', {
            newGameId: gameId,
            previousGameId: previousGameId || this.currentGameId,
            previousHasSubmitted: previousHasSubmitted || this.hasSubmittedThisGame,
            previousIsSubmitting: previousIsSubmitting || this.isSubmitting
        });
        
        this.currentGameId = gameId;
        this.hasSubmittedThisGame = false;
        this.isSubmitting = false;
        
        console.log('🎮 High Score Manager: New game started', gameId);
        console.log('🎮 Flags reset - hasSubmittedThisGame:', this.hasSubmittedThisGame, 'isSubmitting:', this.isSubmitting);
    }/**
     * Show the high score modal
     * @param {number} score - The achieved score
     */
    showModal(score) {
        console.log('🎮 HighScoreManager.showModal called with:', {
            score,
            hasSubmittedThisGame: this.hasSubmittedThisGame,
            currentGameId: this.currentGameId,
            isSubmitting: this.isSubmitting
        });
        
        if (this.hasSubmittedThisGame) {
            console.log('🚫 Modal blocked - already submitted for this game');
            return;
        }

        if (score <= 0) {
            console.log('🚫 Modal blocked - invalid score:', score);
            return;
        }

        console.log('✅ Showing high score modal for score:', score);

        // CAPTURE the score and timing data NOW, before the game state can be reset
        this.capturedScore = score;
        this.capturedGameStartTime = gameState.gameStartTime;
        
        console.log('🎯 Captured game data:', {
            capturedScore: this.capturedScore,
            capturedGameStartTime: this.capturedGameStartTime,
            currentGameState: gameState.gameState
        });

        // Setup modal content
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = score;
        }

        // Load saved name
        if (this.nameInput) {
            const savedName = localStorage.getItem('playerName') || '';
            this.nameInput.value = savedName;
            console.log('🎮 Loaded saved name:', savedName);
        }        // Show modal immediately
        this.modal.classList.remove('hide');

        // Focus input immediately (using requestAnimationFrame for instant but smooth focus)
        requestAnimationFrame(() => {
            if (this.nameInput) {
                this.nameInput.focus();
                this.nameInput.select();
                console.log('🎮 Input focused immediately, current value:', this.nameInput.value);
            }
        });
    }    /**
     * Handle score submission
     * @param {string} forcedName - Force a specific name (e.g., 'Anonymous')
     */
    handleSubmit(forcedName = null) {
        if (this.isSubmitting) {
            console.log('🚫 Submission blocked - already in progress');
            return;
        }

        if (this.hasSubmittedThisGame) {
            console.log('🚫 Submission blocked - already submitted for this game');
            return;
        }

        this.isSubmitting = true;        // Show submission overlay instead of hiding modal
        this.showSubmissionOverlay();

        // Determine final player name
        let playerName = forcedName;
        
        if (!playerName && this.nameInput) {
            const inputValue = this.nameInput.value.trim();
            if (inputValue && inputValue.length > 0) {
                playerName = inputValue;
            }
        }

        // Try localStorage if no name yet
        if (!playerName) {
            const savedName = localStorage.getItem('playerName');
            if (savedName && savedName !== 'Anonymous') {
                playerName = savedName;
            }
        }

        // Final fallback
        if (!playerName) {
            playerName = 'Anonymous';
        }

        console.log('🏆 FINAL PLAYER NAME:', playerName);
        console.log('🏆 INPUT VALUE WAS:', this.nameInput?.value);
        console.log('🏆 FORCED NAME WAS:', forcedName);

        // Save name for future (if not Anonymous)
        if (playerName !== 'Anonymous') {
            localStorage.setItem('playerName', playerName);
            console.log('🏆 Saved name to localStorage:', playerName);
        }

        // Mark as submitted for this game
        this.hasSubmittedThisGame = true;

        // Store submission data for completion handling
        this.pendingSubmission = {
            playerName,
            score: this.capturedScore,
            gameTime: this.capturedGameStartTime > 0 ? 
                Math.floor((Date.now() - this.capturedGameStartTime) / 1000) : 0
        };

        console.log('🏆 Emitting score submission with CAPTURED data:', {
            ...this.pendingSubmission,
            gameId: this.currentGameId,
            capturedScore: this.capturedScore,
            capturedGameStartTime: this.capturedGameStartTime
        });        this.emit('scoreSubmitted', this.pendingSubmission.playerName, this.pendingSubmission.score, this.pendingSubmission.gameTime);
    }

    /**
     * Show submission overlay
     * @private
     */
    showSubmissionOverlay() {
        if (this.submissionOverlay) {
            this.submissionOverlay.classList.remove('hide');
            console.log('🔄 Showing submission overlay');
        }
    }

    /**
     * Hide submission overlay
     * @private
     */
    hideSubmissionOverlay() {
        if (this.submissionOverlay) {
            this.submissionOverlay.classList.add('hide');
            console.log('🔄 Hiding submission overlay');
        }
    }

    /**
     * Complete the submission process
     * @param {boolean} success - Whether submission was successful
     */
    completeSubmission(success = true) {
        console.log('🏆 Completing submission, success:', success);
        
        this.isSubmitting = false;
        this.hideSubmissionOverlay();
        
        if (success) {
            // Hide modal completely on successful submission
            this.hideModal();
        } else {
            // On failure, hide overlay but keep modal open for retry
            console.log('🔄 Submission failed, keeping modal open for retry');
        }
    }

    /**
     * Hide the modal
     */
    hideModal() {
        if (this.modal) {
            this.modal.classList.add('hide');
        }
    }

    /**
     * Reset for retry (in case of submission failure)
     */
    resetForRetry() {
        this.hasSubmittedThisGame = false;
        this.isSubmitting = false;
        console.log('🔄 High Score Manager: Reset for retry');
    }

    /**
     * Cleanup
     */
    destroy() {
        this.removeEventListeners();
        this.removeAllListeners();
    }
}
