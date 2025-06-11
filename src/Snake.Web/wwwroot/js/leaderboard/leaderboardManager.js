import { GAME_CONFIG } from '../config/gameConfig.js';
import gameState from '../state/gameState.js';
import { EventEmitter } from '../utils/eventEmitter.js';

/**
 * Manages leaderboard functionality including optimistic updates
 */
export class LeaderboardManager extends EventEmitter {
    constructor(apiBaseUrl) {
        super();
        this.apiBaseUrl = apiBaseUrl || GAME_CONFIG.API_BASE_URL;
        this.currentLeaderboardPeriod = 'daily';
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for leaderboard tabs
     * @private
     */
    setupEventListeners() {
        document.querySelectorAll('.leaderboard-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.handleTabClick(tab);
            });
        });
    }

    /**
     * Handle leaderboard tab click
     * @param {HTMLElement} tab 
     * @private
     */
    handleTabClick(tab) {
        // Update active tab
        document.querySelectorAll('.leaderboard-tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update period and fetch data
        this.currentLeaderboardPeriod = tab.dataset.period;
        this.fetchLeaderboard(this.currentLeaderboardPeriod);
    }

    /**
     * Fetch leaderboard data from API
     * @param {string} period - Time period filter
     */    async fetchLeaderboard(period = 'daily') {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/leaderboard/scores/top?limit=10`);
            if (response.ok) {
                const scores = await response.json();
                this.updateLeaderboardUI(scores);
            } else {
                console.error('Failed to fetch leaderboard:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        }
    }

    /**
     * Update the leaderboard UI with new data
     * @param {Array} scores 
     */
    updateLeaderboardUI(scores) {
        const tbody = document.getElementById('leaderboardBody');
        if (!tbody) return;
        
        // Remove any existing optimistic scores before showing real data
        const optimisticScores = tbody.querySelectorAll('tr.optimistic-score');
        optimisticScores.forEach(row => row.remove());
        
        // Clear only non-optimistic rows
        const realScores = tbody.querySelectorAll('tr:not(.optimistic-score)');
        realScores.forEach(row => row.remove());

        scores.forEach((score, index) => {
            const row = document.createElement('tr');
            const date = new Date(score.timestamp);
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${score.playerName}</td>
                <td>${score.score}</td>
                <td>${date.toLocaleDateString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * Add optimistic score update for instant feedback
     * @param {string} playerName 
     * @param {number} score 
     */
    addOptimisticScore(playerName, score) {        try {
            const tbody = document.getElementById('leaderboardBody');
            if (!tbody) return;
            
            console.log('Adding optimistic score:', playerName, score);
            
            // Create a new row for the submitted score
            const newRow = document.createElement('tr');
            newRow.classList.add('optimistic-score', 'submitting');
            newRow.setAttribute('data-player-name', playerName);
            newRow.setAttribute('data-score', score);
            newRow.innerHTML = `
                <td>?</td>
                <td>${playerName}</td>
                <td>${score}</td>
                <td>Just now</td>
            `;
            
            // Find where to insert the new score (sorted by score descending)
            const existingRows = Array.from(tbody.querySelectorAll('tr:not(.optimistic-score)'));
            let insertIndex = 0;
            
            for (let i = 0; i < existingRows.length; i++) {
                const existingScore = parseInt(existingRows[i].cells[2].textContent);
                if (score > existingScore) {
                    insertIndex = i;
                    break;
                } else {
                    insertIndex = i + 1;
                }
            }
            
            // Insert the row at the correct position
            if (insertIndex >= existingRows.length) {
                tbody.appendChild(newRow);
            } else {
                tbody.insertBefore(newRow, existingRows[insertIndex]);
            }
            
            // Update ranks for all rows
            this.updateOptimisticRanks();
            
            // Add a subtle highlight to show it's pending
            newRow.style.backgroundColor = 'rgba(77, 238, 234, 0.2)';
            newRow.style.border = '1px solid rgba(77, 238, 234, 0.5)';
            newRow.style.position = 'relative'; // Needed for absolute positioning of ::after content
            
        } catch (error) {
            console.error('Error adding optimistic score:', error);
        }
    }

    /**
     * Remove optimistic score update (on failure)
     * @param {string} playerName 
     * @param {number} score 
     */
    removeOptimisticScore(playerName, score) {
        try {
            const tbody = document.getElementById('leaderboardBody');
            if (!tbody) return;
            
            console.log('Removing optimistic score:', playerName, score);
            
            // Find and remove the optimistic score
            const optimisticRows = tbody.querySelectorAll('tr.optimistic-score');
            optimisticRows.forEach(row => {
                const rowPlayerName = row.cells[1].textContent;
                const rowScore = parseInt(row.cells[2].textContent);
                if (rowPlayerName === playerName && rowScore === score) {
                    row.remove();
                }
            });
            
            // Update ranks for remaining rows
            this.updateOptimisticRanks();
            
        } catch (error) {
            console.error('Error removing optimistic score:', error);
        }
    }

    /**
     * Mark optimistic score as successfully submitted (remove submitting state)
     * @param {string} playerName 
     * @param {number} score 
     */
    markOptimisticScoreSubmitted(playerName, score) {
        try {
            const tbody = document.getElementById('leaderboardBody');
            if (!tbody) return;
            
            console.log('Marking optimistic score as submitted:', playerName, score);
            
            // Find the optimistic score row
            const optimisticRows = tbody.querySelectorAll('tr.optimistic-score.submitting');
            optimisticRows.forEach(row => {
                const rowPlayerName = row.getAttribute('data-player-name');
                const rowScore = parseInt(row.getAttribute('data-score'));
                if (rowPlayerName === playerName && rowScore === score) {
                    // Remove submitting class to stop the spinner/loading animation
                    row.classList.remove('submitting');
                    console.log('🎯 Removed submitting state from optimistic score');
                }
            });
            
        } catch (error) {
            console.error('Error marking optimistic score as submitted:', error);
        }
    }

    /**
     * Update rank numbers for all rows
     * @private
     */
    updateOptimisticRanks() {
        try {
            const tbody = document.getElementById('leaderboardBody');
            if (!tbody) return;
            
            const allRows = tbody.querySelectorAll('tr');
            allRows.forEach((row, index) => {
                if (row.cells && row.cells[0]) {
                    row.cells[0].textContent = index + 1;
                }
            });
            
        } catch (error) {
            console.error('Error updating optimistic ranks:', error);
        }
    }    /**
     * Submit score to leaderboard
     * @param {string} playerName 
     * @param {number} score 
     * @returns {Promise<boolean>} Success status
     */
    async submitScore(playerName, score, gameTime) {
        console.log('🎯 LeaderboardManager.submitScore called with:', { playerName, score, gameTime });
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/leaderboard/scores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerName,
                    score: score,  // Ensure score is passed correctly
                    gameTime: gameTime || Math.floor((Date.now() - gameState.gameStartTime) / 1000),
                    region: 'global'
                })
            });
            
            console.log('🏆 Score submission request sent:', {
                playerName,
                score,
                gameTime: gameTime || Math.floor((Date.now() - gameState.gameStartTime) / 1000),
                region: 'global'
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('🏆 Score submitted successfully:', result);
                
                // Emit event to notify that score was submitted
                this.emit('scoreSubmitted');
                
                return true;            } else {
                console.error('❌ Failed to submit score:', response.statusText);
                const errorText = await response.text();
                console.error('❌ Response body:', errorText);
                return false;
            }
        } catch (error) {
            console.error('💥 Error submitting score:', error);
            return false;
        }
    }

    /**
     * Check if score qualifies for leaderboard
     * @param {number} score 
     * @returns {Promise<boolean>}
     */    async checkScoreQualification(score) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/leaderboard/scores/top?limit=10`);
            if (response.ok) {
                const scores = await response.json();
                const lowestHighScore = scores.length > 0 ? Math.min(...scores.map(s => s.score)) : 0;
                
                // Score qualifies if higher than lowest OR leaderboard has room
                return score > lowestHighScore || scores.length < 10;
            } else {
                // If API fails, assume score qualifies (better UX)
                return true;
            }
        } catch (error) {
            console.error('Error checking score qualification:', error);
            // On error, assume score qualifies
            return true;
        }
    }

    /**
     * Load initial leaderboard data
     */
    loadInitialLeaderboard() {
        this.fetchLeaderboard(this.currentLeaderboardPeriod);
    }    /**
     * Handle game over and potential high score
     */
    handleGameOver() {
        // Refresh leaderboard when game ends
        this.fetchLeaderboard(this.currentLeaderboardPeriod);
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        this.removeAllListeners();
    }
}
