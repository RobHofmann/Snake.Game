// Game constants
const CELL_SIZE = 20;
const BOARD_SIZE = { width: 30, height: 30 };
const API_BASE_URL = 'http://localhost:5075'; // Add API base URL

// Mobile control constants
const SWIPE_THRESHOLD = 30; // Minimum distance for swipe detection
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity ratio for swipe

// Game variables
let gameState = 'Ready';
let score = 0;
let snake = [];
let food = { x: 0, y: 0 };
let powerUps = [];
let activePowerUpEffects = []; // Track active powerup effects with timers
let lastActivePowerUpEffects = []; // Track last powerup effects hash to minimize redraws
let stablePowerUpEffects = []; // STABLE version of powerup effects to prevent flashing
let powerupDataHistory = []; // Track recent powerup data to detect inconsistencies
let lastPowerupPanelUpdate = 0; // Track when we last updated the powerup panel for timers
let lastGameRender = 0; // Track when we last rendered the main game area
let lastGameStateHash = ''; // Track game state changes to prevent unnecessary renders
let gameStartTime = 0; // Track when game started
let connection = null;
let scoreSubmitted = false; // Track if score has been submitted for current game session
let gameWasPlayed = false; // Track if a real game was played (not just page load)
let pageLoadTime = Date.now(); // Track when page was loaded to prevent initial modal
let powerupPanelFrozen = false; // NUCLEAR OPTION: Completely freeze powerup panel during gameplay

// Mobile touch variables
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isTouchDevice = false;

// Game state indicators
let isShieldActive = false;
let isDoublePointsActive = false;
let speedMultiplier = 1.0;

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const powerupCanvas = document.getElementById('powerupCanvas');
const powerupCtx = powerupCanvas.getContext('2d');

// Set main game canvas dimensions to exact game area
canvas.width = BOARD_SIZE.width * CELL_SIZE;
canvas.height = BOARD_SIZE.height * CELL_SIZE;

// Set powerup panel canvas dimensions 
powerupCanvas.width = BOARD_SIZE.width * CELL_SIZE;
powerupCanvas.height = 60; // Height for powerup panel

// DOM elements
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('finalScore');
const gameStatusElement = document.getElementById('gameStatus');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOver');
const playAgainButton = document.getElementById('playAgain');
const nameInputModal = document.getElementById('nameInputModal');
const playerNameInput = document.getElementById('playerNameInput');
const submitHighScoreButton = document.getElementById('submitHighScore');
const skipHighScoreButton = document.getElementById('skipHighScore');
const highScoreValueElement = document.getElementById('highScoreValue');

//// NUCLEAR OPTION: Completely prevent modal from showing for first 15 seconds
//if (nameInputModal) {
//    const originalRemove = nameInputModal.classList.remove;
//      // Override remove method to block showing modal
//    nameInputModal.classList.remove = function(className) {
//        const timeSincePageLoad = Date.now() - pageLoadTime;
//        if (className === 'hide' && timeSincePageLoad < 15000) {
//            return; // Block the modal from being shown
//        }
//        return originalRemove.call(this, className);
//    };
//    
//    // Restore normal behavior after 15 seconds
//    setTimeout(() => {
//        nameInputModal.classList.remove = originalRemove;
//    }, 15000);
//      // Ensure modal starts hidden
//    nameInputModal.classList.add('hide');
//    nameInputModal.style.display = 'none';
//}

// Set up SignalR connection
async function setupSignalR() {
    try {
        connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_BASE_URL}/gamehub`)
            .withAutomaticReconnect()
            .build();
        
        // Handle game state updates from server
        connection.on('UpdateGameState', (state) => {
            if (state) {
                const previousGameState = gameState;
                const previousScore = score;
                const previousSnakeLength = snake.length;
                
                gameState = state.gameState || 'Ready';
                score = state.score || 0;
                snake = Array.isArray(state.snake) ? state.snake : [];
                food = state.food || { x: 0, y: 0 };
                
                // Only log significant state changes, not every update
                if (previousGameState !== gameState) {
                    console.log(`Game state: ${previousGameState} → ${gameState}, score: ${score}`);
                }                  // Set flags when game actually starts (any transition to Playing OR when score > 0)
                const gameActuallyStarted = (gameState === 'Playing') || 
                                          (gameState === 'GameOver' && score > 0 && gameStartTime === 0);
                
                if (gameActuallyStarted) {
                    console.log(`🎮 CONSECUTIVE MODAL DEBUG: Game started - ${previousGameState} → ${gameState}, score: ${score}`);
                    console.log(`   Before conditional setting - gameStartTime: ${gameStartTime}, gameWasPlayed: ${gameWasPlayed}`);
                    
                    // Always ensure gameStartTime is set when game actually starts
                    if (gameStartTime === 0) {
                        console.log('   Setting gameStartTime via SignalR (was 0)');
                        gameStartTime = Date.now();
                    } else {
                        console.log('   gameStartTime already set, keeping existing value');
                    }
                    
                    gameWasPlayed = true; // Mark that a real game was started
                    scoreSubmitted = false; // ALWAYS reset score submission flag for new game
                    
                    console.log(`   After setting flags - gameStartTime: ${gameStartTime}, gameWasPlayed: ${gameWasPlayed}, scoreSubmitted: ${scoreSubmitted}`);
                }
                
                // Handle powerup panel freezing for Playing state specifically
                if (previousGameState === 'Ready' && gameState === 'Playing') {
                    powerupPanelFrozen = true; // FREEZE powerup panel during gameplay
                    
                    //// NUCLEAR OPTION: Completely hide the powerup canvas during gameplay
                    //if (powerupCanvas) {
                    //    powerupCanvas.style.display = 'none';
                    //    console.log('🎮 Game started, powerup canvas HIDDEN');
                    //}
                }
                
                // Show powerup panel when game ends
                if (gameState === 'GameOver' && powerupPanelFrozen) {
                    powerupPanelFrozen = false;
                      // Show the powerup canvas again
                    if (powerupCanvas) {
                        powerupCanvas.style.display = 'block';
                        console.log('🎮 Game ended, powerup canvas SHOWN');
                    }
                }
                
                // Update power-ups while preserving color information more efficiently
                const previousPowerUpsState = JSON.stringify(powerUps || []);
                if (Array.isArray(state.powerUps)) {
                    powerUps = state.powerUps.map(p => ({
                        ...p,
                        color: p.color || getPowerUpColor(p.type)
                    }));
                } else {
                    powerUps = [];
                }
                
                // Only force redraw for significant changes, not direction-only updates
                const currentPowerUpsState = JSON.stringify(powerUps);
                const snakeGrew = snake.length > previousSnakeLength;
                const scoreChanged = score !== previousScore;
                const powerUpsChanged = currentPowerUpsState !== previousPowerUpsState;
                const gameStateChanged = gameState !== previousGameState;
                  if (powerUpsChanged || snakeGrew || scoreChanged || gameStateChanged) {
                    lastGameStateHash = ''; // Force redraw only for meaningful changes
                }
                
                // POWERUP PANEL STABILITY SYSTEM - Filter out inconsistent server data
                if (!powerupPanelFrozen) {
                    // Track powerup data history to detect server inconsistencies
                    powerupDataHistory.push({
                        timestamp: Date.now(),
                        length: state.activePowerUpEffects ? state.activePowerUpEffects.length : 0,
                        state: gameState
                    });
                    
                    // Keep only last 10 entries for analysis
                    if (powerupDataHistory.length > 10) {
                        powerupDataHistory.shift();
                    }

                    // Implement powerup data stability filter
                    let effectsToUse = state.activePowerUpEffects || [];
                    
                    if (effectsToUse) {
                        const currentLength = effectsToUse.length;
                        const currentTime = Date.now();
                        
                        // Check if we have recent history to compare against
                        const recentEntries = powerupDataHistory.filter(entry => 
                            currentTime - entry.timestamp < 2000 && // Last 2 seconds
                            entry.state === gameState // Same game state
                        );
                        
                        // If we detect rapid alternation between 0 and non-zero powerups, use stable version
                        if (recentEntries.length >= 4) {
                            const hasAlternation = recentEntries.some((entry, index) => {
                                if (index === 0) return false;
                                const prev = recentEntries[index - 1];
                                return (entry.length === 0 && prev.length > 0) || 
                                       (entry.length > 0 && prev.length === 0);
                            });
                            
                            if (hasAlternation) {
                                //console.log('🔧 DETECTED POWERUP DATA INCONSISTENCY - Using stable version');
                                // Use the most recent non-empty powerup data if available
                                const lastNonEmpty = recentEntries.filter(e => e.length > 0).slice(-1)[0];
                                if (lastNonEmpty && currentLength === 0) {
                                    // Keep using stable version instead of empty array
                                    effectsToUse = stablePowerUpEffects;
                                    //console.log('🛡️ PRESERVED STABLE POWERUPS:', stablePowerUpEffects.length);
                                }
                            }
                        }
                        
                        // Update stable version when we get consistent non-empty data
                        if (currentLength > 0) {
                            stablePowerUpEffects = [...effectsToUse];
                        }
                    }

                    const newActivePowerUpEffects = Array.isArray(effectsToUse) 
                        ? effectsToUse.map(p => ({
                            ...p,
                            color: p.color || getPowerUpColor(p.type)
                        }))
                        : [];

                    activePowerUpEffects = newActivePowerUpEffects;
                } else {
                    console.log('🧊 POWERUP DATA IGNORED (panel frozen during gameplay)');
                }
                
                // NO immediate powerup panel updates - let gameLoop handle everything with timing
                
                // Update power-up effect states consistently
                isShieldActive = state.isShieldActive || false;
                isDoublePointsActive = state.isDoublePointsActive || false;
                speedMultiplier = state.speedMultiplier || 1.0;
                
                updateUI();
                
                // Force initial render when game starts to ensure proper display
                if (previousGameState === 'Ready' && gameState === 'Playing') {
                    drawGame();
                    // Don't draw powerup panel - it will be hidden anyway
                    lastGameRender = Date.now();
                    lastGameStateHash = ''; // Reset to ensure next frame gets rendered
                }
                
                // Let the gameLoop handle all rendering with proper throttling
            }
        });

        // Start the connection
        await connection.start();
        console.log('Connected to game hub');
    } catch (err) {
        console.error('Error establishing connection:', err);
    }
}

// Game drawing functions
function drawGame() {
    if (!ctx || snake.length === 0) return;

    // Clear and redraw main game area
    ctx.fillStyle = '#1a0b2e'; // Dark purple background as per PRD
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid in the main game area
    ctx.strokeStyle = '#2a1a3e'; // Slightly lighter purple for grid
    for (let x = 0; x <= BOARD_SIZE.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL_SIZE, 0);
        ctx.lineTo(x * CELL_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= BOARD_SIZE.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL_SIZE);
        ctx.lineTo(canvas.width, y * CELL_SIZE);
        ctx.stroke();
    }

    // Draw snake with potential shield effect
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = isShieldActive ? '#FFFF00' : '#39ff14'; // Yellow glow for shield, green for normal
    ctx.fillStyle = isShieldActive ? '#FFFF00' : '#39ff14';
    
    if (snake && Array.isArray(snake)) {
        snake.forEach(segment => {
            if (segment && typeof segment.x === 'number' && typeof segment.y === 'number') {
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(
                        segment.x * CELL_SIZE,
                        segment.y * CELL_SIZE,
                        CELL_SIZE,
                        CELL_SIZE,
                        4
                    );
                } else {
                    ctx.rect(
                        segment.x * CELL_SIZE,
                        segment.y * CELL_SIZE,
                        CELL_SIZE,
                        CELL_SIZE
                    );
                }
                ctx.fill();
            }
        });
    }

    // Draw food
    if (food && typeof food.x === 'number' && typeof food.y === 'number') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff3131';
        ctx.fillStyle = '#ff3131';
        ctx.beginPath();
        ctx.arc(
            food.x * CELL_SIZE + CELL_SIZE / 2,
            food.y * CELL_SIZE + CELL_SIZE / 2,
            CELL_SIZE / 3,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }    // Draw power-ups
    if (powerUps && Array.isArray(powerUps)) {
        powerUps.forEach(powerUp => {
            if (powerUp && powerUp.position && !powerUp.isExpired) {
                // Save context for each power-up
                ctx.save();
                
                const centerX = powerUp.position.x * CELL_SIZE + CELL_SIZE / 2;
                const centerY = powerUp.position.y * CELL_SIZE + CELL_SIZE / 2;

                // Draw background circle for better visibility
                ctx.shadowBlur = 15;
                ctx.fillStyle = '#2a1a3e';
                ctx.beginPath();
                ctx.arc(centerX, centerY, CELL_SIZE * 0.45, 0, Math.PI * 2);
                ctx.fill();

                // Draw the power-up icon with glow
                ctx.shadowBlur = 10;
                ctx.shadowColor = powerUp.color;
                ctx.fillStyle = powerUp.color;
                ctx.font = `${CELL_SIZE * 0.6}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Get the appropriate icon for this power-up type
                const icon = getPowerUpIcon(powerUp.type);
                ctx.fillText(icon, centerX, centerY);
                
                // Draw expiration progress ring
                if (powerUp.remainingExpirationTimePercentage < 1) {
                    // Draw background ring
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = '#2a1a3e';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, CELL_SIZE * 0.35, 0, Math.PI * 2);
                    ctx.stroke();

                    // Draw progress ring
                    ctx.strokeStyle = powerUp.color;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(
                        centerX, 
                        centerY, 
                        CELL_SIZE * 0.35, 
                        -Math.PI / 2, 
                        -Math.PI / 2 + (Math.PI * 2 * powerUp.remainingExpirationTimePercentage)
                    );
                    ctx.stroke();
                }
                
                ctx.restore();
            }
        });
    }

    ctx.restore();
}

// Separate function to draw the powerup panel on its own canvas
function drawPowerupPanel() {
    if (!powerupCtx) return;
    
     //// NUCLEAR OPTION: Don't draw anything if canvas is hidden
     //if (powerupCanvas && powerupCanvas.style.display === 'none') {
     //    console.log('🚫 Powerup panel draw skipped - canvas hidden');
     //    return;
     //}
      // Clear the powerup panel canvas
    powerupCtx.fillStyle = '#1a0b2e'; // Dark purple background
    powerupCtx.fillRect(0, 0, powerupCanvas.width, powerupCanvas.height);
    
    // Draw active power-up effect indicators WITHOUT countdown timers to eliminate flashing
    if (activePowerUpEffects && activePowerUpEffects.length > 0) {
        const panelX = 5;
        const panelY = 5;
        const panelWidth = powerupCanvas.width - 10;
        const panelHeight = powerupCanvas.height - 10;
        
        // Draw semi-transparent panel background
        powerupCtx.fillStyle = 'rgba(26, 11, 46, 0.9)';
        powerupCtx.fillRect(panelX, panelY, panelWidth, panelHeight);
        
        // Draw each active effect WITHOUT timers
        powerupCtx.font = 'bold 16px Arial';
        powerupCtx.textBaseline = 'middle';
        
        // Calculate spacing between effects based on panel width and number of effects
        const effectWidth = Math.min(280, panelWidth / activePowerUpEffects.length);
          activePowerUpEffects.forEach((effect, index) => {
            const x = panelX + (effectWidth * index) + 15;
            const y = panelY + panelHeight / 2;
            
            // Draw icon with glow
            powerupCtx.save();
            powerupCtx.shadowBlur = 10;
            powerupCtx.shadowColor = effect.color;
            powerupCtx.fillStyle = effect.color;
            powerupCtx.fillText(getPowerUpIcon(effect.type), x, y);
            
            // Draw effect name
            powerupCtx.shadowBlur = 0;
            powerupCtx.fillStyle = '#ffffff';
            powerupCtx.textAlign = 'left';
            powerupCtx.fillText(getEffectName(effect.type), x + 30, y);
            
            // Draw countdown timer and progress bar
            const remainingPercent = effect.remainingEffectTimePercentage || 0;
            const effectDurationSeconds = effect.effectDurationInSeconds || getEffectDuration(effect.type);
            const remainingSeconds = Math.ceil(remainingPercent * effectDurationSeconds);
            
            // Background progress bar
            const barWidth = 60;
            const barHeight = 6;
            const barX = x + effectWidth - 100;
            const barY = y - barHeight / 2;
            
            powerupCtx.fillStyle = '#2a1a3e';
            powerupCtx.fillRect(barX, barY, barWidth, barHeight);
            
            // Active progress bar
            powerupCtx.fillStyle = effect.color;
            powerupCtx.fillRect(barX, barY, barWidth * remainingPercent, barHeight);
            
            // Draw countdown timer text
            powerupCtx.fillStyle = '#ffff00';
            powerupCtx.textAlign = 'left';
            powerupCtx.fillText(`${remainingSeconds}s`, barX + barWidth + 5, y);
            
            powerupCtx.restore();
        });
    }
}

// Optimistic update functions for instant leaderboard feedback
function addOptimisticScore(playerName, score) {
    try {
        const tbody = document.getElementById('leaderboardBody');
        if (!tbody) return;
        
        console.log('Adding optimistic score:', playerName, score);
        
        // Create a new row for the submitted score
        const newRow = document.createElement('tr');
        newRow.classList.add('optimistic-score');
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
        updateOptimisticRanks();
        
        // Add a subtle highlight to show it's pending
        newRow.style.backgroundColor = 'rgba(77, 238, 234, 0.2)';
        newRow.style.border = '1px solid rgba(77, 238, 234, 0.5)';
        
    } catch (error) {
        console.error('Error adding optimistic score:', error);
    }
}

function removeOptimisticScore(playerName, score) {
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
        updateOptimisticRanks();
        
    } catch (error) {
        console.error('Error removing optimistic score:', error);
    }
}

function updateOptimisticRanks() {
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
}

// Utility function to get power-up color based on type
function getPowerUpColor(type) {
    switch (type) {
        case 'SpeedBoost':
            return '#0080FF';   // Blue neon
        case 'Shield':
            return '#FFFF00';   // Yellow neon
        case 'DoublePoints':
            return '#FF00FF';   // Pink neon
        case 'Shrink':
            return '#39FF14';   // Green neon
        default:
            return '#FFFFFF';
    }
}

// Utility function to get power-up icon based on type
function getPowerUpIcon(type) {
    switch (type) {
        case 'SpeedBoost':
            return '⚡';
        case 'Shield':
            return '🛡️';
        case 'DoublePoints':
            return '2️⃣';
        case 'Shrink':
            return '🌿';
        default:
            console.log('getPowerUpIcon: Unknown type, returning ?');
            return '?';
    }
}

// Utility function to get powerup effect names
function getEffectName(type) {
    switch (type) {
        case 'SpeedBoost':
            return 'Speed Boost';
        case 'Shield':
            return 'Shield';
        case 'DoublePoints':
            return 'Double Points';
        case 'Shrink':
            return 'Shrink';
        default:
            return 'Unknown';
    }
}

// Utility function to get powerup effect duration in seconds
function getEffectDuration(type) {
    switch (type) {
        case 'SpeedBoost':
            return 15;   // 15 seconds
        case 'Shield':
            return 10;   // 10 seconds
        case 'DoublePoints':
            return 20;   // 20 seconds
        case 'Shrink':
            return 0;    // Instant effect
        default:
            return 10;   // Default fallback
    }
}

// UI update function
function updateUI() {
    scoreElement.textContent = score;
    gameStatusElement.textContent = gameState;
    finalScoreElement.textContent = score;    // Show/hide screens based on game state
    if (gameState === 'Ready') {
        startScreen.classList.remove('hide');
        gameOverScreen.classList.add('hide');
        canvas.classList.add('hide');
        powerupCanvas.classList.add('hide');
        nameInputModal.classList.add('hide');
          // FIXED: Only reset flags when transitioning FROM GameOver TO Ready
        // This prevents resetting flags multiple times during consecutive games
        // DELAY flag reset to prevent race condition with modal validation
        if (!window.readyStateActive) {
            console.log('🔄 CONSECUTIVE MODAL DEBUG: First time entering Ready state - scheduling delayed flag reset...');
            console.log(`   Before reset - scoreSubmitted: ${scoreSubmitted}, gameStartTime: ${gameStartTime}, gameWasPlayed: ${gameWasPlayed}`);
            
            // Reset scoreSubmitted immediately as this is safe
            scoreSubmitted = false;
            
            // Delay resetting gameStartTime and gameWasPlayed to allow modal validation to complete
            setTimeout(() => {
                console.log('🔄 CONSECUTIVE MODAL DEBUG: Executing delayed flag reset...');
                console.log(`   Before delayed reset - gameStartTime: ${gameStartTime}, gameWasPlayed: ${gameWasPlayed}`);
                
                gameStartTime = 0; // Reset game start time
                gameWasPlayed = false; // Reset game played flag
                
                console.log(`   After delayed reset - gameStartTime: ${gameStartTime}, gameWasPlayed: ${gameWasPlayed}`);
            }, 100); // 100ms delay should be enough for modal validation to complete
            
            console.log(`   After immediate reset - scoreSubmitted: ${scoreSubmitted} (gameStartTime and gameWasPlayed will reset in 100ms)`);
            
            // Mark that we're now in Ready state to prevent repeated resets
            window.readyStateActive = true;
        } else {
            console.log('🔄 CONSECUTIVE MODAL DEBUG: Already in Ready state - skipping flag reset');
        }} else if (gameState === 'GameOver') {
        startScreen.classList.add('hide');
        gameOverScreen.classList.remove('hide');
        canvas.classList.remove('hide');
        // FIXED: Consistent powerup canvas visibility - only show if not frozen (same as Playing state)
        if (!powerupPanelFrozen) {
            powerupCanvas.classList.remove('hide');
        }
        // Don't force-hide modal here - let checkForHighScore() decide whether to show it
        
        // Clear Ready state flag since we're leaving Ready state
        window.readyStateActive = false;
        
        // Only attempt to submit score once per game session AND only if a real game was played
        console.log('🔍 CONSECUTIVE MODAL DEBUG: Checking modal conditions...');
        console.log(`   scoreSubmitted: ${scoreSubmitted} (should be false)`);
        console.log(`   gameStartTime: ${gameStartTime} (should be > 0)`);
        console.log(`   score: ${score} (should be > 0)`);
        console.log(`   gameWasPlayed: ${gameWasPlayed} (should be true)`);
        
        const condition1 = !scoreSubmitted;
        const condition2 = gameStartTime > 0;
        const condition3 = score > 0;
        const condition4 = gameWasPlayed;
        const allConditionsMet = condition1 && condition2 && condition3 && condition4;
        
        console.log(`🧮 Individual conditions: !scoreSubmitted=${condition1}, gameStartTime>0=${condition2}, score>0=${condition3}, gameWasPlayed=${condition4}`);
        console.log(`🎯 ALL CONDITIONS MET: ${allConditionsMet}`);
          if (allConditionsMet) {
            console.log('✅ High score check: conditions met, checking leaderboard...');
            console.log(`Debug - Score: ${score}, GameStartTime: ${gameStartTime}, GameWasPlayed: ${gameWasPlayed}, ScoreSubmitted: ${scoreSubmitted}`);
            checkForHighScore();
        } else {
            // If conditions aren't met, just submit anonymously without modal (only if gameWasPlayed)
            if (!scoreSubmitted && gameWasPlayed && (gameStartTime <= 0 || score <= 0)) {
                console.log('📝 Submitting anonymous score for completed game');
                console.log(`Debug - Score: ${score}, GameStartTime: ${gameStartTime}, GameWasPlayed: ${gameWasPlayed}, ScoreSubmitted: ${scoreSubmitted}`);
                submitScore('Anonymous');
            } else if (!scoreSubmitted) {
                console.log(`⚠️ High score check blocked - Score: ${score}, GameStartTime: ${gameStartTime}, GameWasPlayed: ${gameWasPlayed}, ScoreSubmitted: ${scoreSubmitted}`);
            }
        }    } else {
        startScreen.classList.add('hide');
        gameOverScreen.classList.add('hide');
        canvas.classList.remove('hide');
        // Only show powerup canvas if not frozen
        if (!powerupPanelFrozen) {
            powerupCanvas.classList.remove('hide');
        }
        nameInputModal.classList.add('hide');
        
        // Clear Ready state flag since we're leaving Ready state
        window.readyStateActive = false;
    }
}

// Function to check if current score qualifies for high score entry
async function checkForHighScore() {
    // Basic validation - only check essential conditions
    const timeSincePageLoad = Date.now() - pageLoadTime;
      // Only block for first 500ms to prevent page load issues
    if (timeSincePageLoad < 500) {
        console.log('🚫 Too soon after page load, submitting as Anonymous');
        submitScore('Anonymous');
        return;
    }
    
    // Don't show modal for zero/negative scores
    if (score <= 0) {
        console.log('🚫 Score is 0 or negative, submitting as Anonymous');
        submitScore('Anonymous');
        return;
    }
    
    // Don't show modal if no actual game was played
    if (!gameWasPlayed || !gameStartTime) {
        console.log('🚫 No real game played, submitting as Anonymous');
        submitScore('Anonymous');
        return;
    }
    
    console.log('✅ All conditions met, showing name input modal for score:', score);
    
    // SIMPLIFIED: For now, show modal for ANY score > 0 to test the functionality
    // This will help us determine if the issue is with the leaderboard API or the modal itself
    showNameInputModal();
    
    // TODO: Uncomment the code below once basic modal functionality is confirmed
    /*
    try {
        // Get current leaderboard to check if this is a qualifying score
        const response = await fetch(`${API_BASE_URL}/api/leaderboard/scores/top?limit=10`);
        if (response.ok) {
            const scores = await response.json();
            const lowestHighScore = scores.length > 0 ? Math.min(...scores.map(s => s.score)) : 0;
            
            // Show modal if score is higher than lowest OR leaderboard has room
            const isQualifyingScore = score > lowestHighScore || scores.length < 10;
            
            if (isQualifyingScore) {
                console.log('🎉 Score qualifies! Showing name input modal');
                showNameInputModal();
            } else {
                console.log('📝 Score not high enough for leaderboard, submitting as Anonymous');
                submitScore('Anonymous');
            }
        } else {
            // If API fails, show modal for any score > 0 (better UX)
            console.log('⚠️ API error, showing modal for score > 0');
            showNameInputModal();
        }
    } catch (error) {
        console.error('💥 Error checking leaderboard:', error);
        // On error, show modal for any score > 0
        showNameInputModal();
    }
    */
}// Function to show name input modal
function showNameInputModal() {
    // Final safety check - don't show modal if score is 0 or negative
    if (score <= 0) {
        console.log('🚫 Modal blocked - score is 0 or negative');
        submitScore('Anonymous');
        return;
    }
    
    console.log('✅ Showing name input modal for score:', score);
    
    // Set up the modal
    highScoreValueElement.textContent = score;
    playerNameInput.value = localStorage.getItem('playerName') || '';
    
    // Show the modal and focus on input
    nameInputModal.classList.remove('hide');
    
    // Focus on input field after a brief delay to ensure modal is visible
    setTimeout(() => {
        playerNameInput.focus();
        playerNameInput.select(); // Select any existing text for easy replacement
    }, 100);
}

// Function to submit score to leaderboard
async function submitScore(playerName = null) {
        if (scoreSubmitted) {
            return; // Prevent duplicate submissions
        }
        
        scoreSubmitted = true;
        
        // Calculate final player name first
        const finalPlayerName = playerName || playerNameInput.value.trim() || 'Anonymous';
        
        // Hide name input modal immediately for instant response
        nameInputModal.classList.add('hide');
        
        // Add optimistic update to leaderboard for instant feedback
        addOptimisticScore(finalPlayerName, score);
        
        try {
            // Save player name to localStorage for future games
            if (finalPlayerName !== 'Anonymous') {
                localStorage.setItem('playerName', finalPlayerName);
            }
            
            const response = await fetch(`${API_BASE_URL}/api/leaderboard/scores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerName: finalPlayerName,
                    score: score,
                    gameTime: Math.floor((Date.now() - gameStartTime) / 1000),
                    region: 'global'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Score submitted successfully:', result);
                
                // Refresh leaderboard to show new score
                fetchLeaderboard(currentLeaderboardPeriod);
            } else {
                console.error('Failed to submit score:', response.statusText);
                scoreSubmitted = false; // Allow retry on failure
                // Remove optimistic update on failure
                removeOptimisticScore(finalPlayerName, score);                // Show modal again if submission failed
                nameInputModal.classList.remove('hide');
                playerNameInput.focus();
            }
        } catch (error) {
            console.error('Error submitting score:', error);
            scoreSubmitted = false; // Allow retry on failure
            // Remove optimistic update on failure
            removeOptimisticScore(finalPlayerName, score);            // Show modal again if submission failed
            nameInputModal.classList.remove('hide');
            playerNameInput.focus();
        }
    }

// Optimistic update functions for instant leaderboard feedback
function addOptimisticScore(playerName, score) {
    try {
        const tbody = document.getElementById('leaderboardBody');
        if (!tbody) return;
        
        console.log('Adding optimistic score:', playerName, score);
        
        // Create a new row for the submitted score
        const newRow = document.createElement('tr');
        newRow.classList.add('optimistic-score');
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
        updateOptimisticRanks();
        
        // Add a subtle highlight to show it's pending
        newRow.style.backgroundColor = 'rgba(77, 238, 234, 0.2)';
        newRow.style.border = '1px solid rgba(77, 238, 234, 0.5)';
        
    } catch (error) {
        console.error('Error adding optimistic score:', error);
    }
}

function removeOptimisticScore(playerName, score) {
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
        updateOptimisticRanks();
        
    } catch (error) {
        console.error('Error removing optimistic score:', error);
    }
}

function updateOptimisticRanks() {
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
}

// Leaderboard functionality
let currentLeaderboardPeriod = 'daily';

async function fetchLeaderboard(period = 'daily') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/leaderboard/scores/top?limit=10`);
        if (response.ok) {
            const scores = await response.json();
            updateLeaderboardUI(scores);
        } else {
            console.error('Failed to fetch leaderboard:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
    }
}

function updateLeaderboardUI(scores) {
    const tbody = document.getElementById('leaderboardBody');
    
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

// Add event listeners for leaderboard tabs
document.querySelectorAll('.leaderboard-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.leaderboard-tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentLeaderboardPeriod = tab.dataset.period;
        fetchLeaderboard(currentLeaderboardPeriod);
    });
});

// Update leaderboard when game ends
function gameOver() {
    gameState = 'GameOver';
    updateUI();
    fetchLeaderboard(currentLeaderboardPeriod);
}

// Input handling
async function handleInput(key) {
    if (!connection) return;

    let direction = null;
    switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            direction = 'Up';
            break;        case 'ArrowDown':
        case 's':
        case 'S':
            direction = 'Down';
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            direction = 'Left';
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            direction = 'Right';
            break;
        case ' ':
            if (gameState === 'Ready') {
                console.log('🎮 CONSECUTIVE MODAL DEBUG: Player pressed SPACE to start game');
                console.log(`   Before setting flags - gameStartTime: ${gameStartTime}, gameWasPlayed: ${gameWasPlayed}`);
                gameStartTime = Date.now();
                gameWasPlayed = true; // Mark that player started a game
                console.log(`   After setting flags - gameStartTime: ${gameStartTime}, gameWasPlayed: ${gameWasPlayed}`);
                await connection.invoke('StartGame');
            } else if (gameState === 'Playing') {
                await connection.invoke('PauseGame');
            } else if (gameState === 'Paused') {
                await connection.invoke('ResumeGame');
            }
            return;
    }

    if (direction && gameState === 'Playing') {
        await connection.invoke('ChangeDirection', direction);
    }
}

// Mobile control functions
function detectTouchDevice() {
    return (('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0) ||
           (navigator.msMaxTouchPoints > 0));
}

function setupMobileControls() {
    isTouchDevice = detectTouchDevice();
    
    if (isTouchDevice) {
        // Show mobile controls
        const mobileControls = document.getElementById('mobileControls');
        const mobilePause = document.getElementById('mobilePause');
        
        if (mobileControls) {
            mobileControls.classList.add('show');
        }
        if (mobilePause) {
            mobilePause.classList.add('show');
        }
        
        // Setup touch event listeners
        setupTouchControls();
        setupSwipeControls();
    }
}

function setupTouchControls() {
    // Setup on-screen button controls
    const dpadButtons = document.querySelectorAll('.dpad-button');
    const mobilePause = document.getElementById('mobilePause');
    
    dpadButtons.forEach(button => {
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const direction = button.dataset.direction;
            handleMobileInput(direction);
            
            // Add visual feedback
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
    });
    
    if (mobilePause) {
        mobilePause.addEventListener('touchstart', async (e) => {
            e.preventDefault();
            await handleInput(' '); // Send space key for pause
            
            // Visual feedback
            mobilePause.style.backgroundColor = 'rgba(77, 238, 234, 0.8)';
        });
        
        mobilePause.addEventListener('touchend', (e) => {
            e.preventDefault();
            mobilePause.style.backgroundColor = 'rgba(77, 238, 234, 0.3)';
        });
    }
}

function setupSwipeControls() {
    // Setup swipe gesture detection
    const canvas = document.getElementById('gameCanvas');
    const gameContainer = document.querySelector('.game-container');
    
    // Use game container as swipe target for better UX
    const swipeTarget = gameContainer || canvas;
    
    swipeTarget.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) { // Single finger only
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
        }
    }, { passive: false });
    
    swipeTarget.addEventListener('touchmove', (e) => {
        // Prevent scrolling during swipe
        e.preventDefault();
    }, { passive: false });
    
    swipeTarget.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            const touchEndX = touch.clientX;
            const touchEndY = touch.clientY;
            const touchEndTime = Date.now();
            
            handleSwipeGesture(touchStartX, touchStartY, touchEndX, touchEndY, touchEndTime - touchStartTime);
        }
    }, { passive: false });
}

function handleSwipeGesture(startX, startY, endX, endY, duration) {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Check if swipe meets minimum distance threshold
    if (distance < SWIPE_THRESHOLD) {
        return;
    }
    
    // Calculate velocity (distance per millisecond)
    const velocity = distance / duration;
    
    // Check if swipe meets minimum velocity threshold
    if (velocity < SWIPE_VELOCITY_THRESHOLD) {
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
    
    handleMobileInput(direction);
}

async function handleMobileInput(direction) {
    if (!connection || gameState !== 'Playing') return;
    
    // Map direction to game direction
    const directionMap = {
        'up': 'Up',
        'down': 'Down',
        'left': 'Left',
        'right': 'Right'
    };
    
    const gameDirection = directionMap[direction];
    if (gameDirection) {
        await connection.invoke('ChangeDirection', gameDirection);
    }
}

// Event listeners
document.addEventListener('keydown', (e) => {
    // Don't prevent default if user is typing in the name input field
    if (e.target === playerNameInput) {
        return; // Let the browser handle text input normally
    }
    
    // Only prevent default for game control keys
    const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', ' '];
    if (gameKeys.includes(e.key)) {
        e.preventDefault();
    }
    
    handleInput(e.key);
});

playAgainButton.addEventListener('click', async () => {
    if (connection) {
        await connection.invoke('StartGame');
    }
});

// High score modal event listeners
submitHighScoreButton.addEventListener('click', () => {
    submitScore();
});

skipHighScoreButton.addEventListener('click', () => {
    submitScore('Anonymous');
});

// Allow Enter key to submit name
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitScore();
    }
});

// Animation loop using RAF for smooth rendering
function gameLoop() {
    if (gameState !== 'Ready') {
        const now = Date.now();
          // Only include visually-relevant state in the hash
        const visualState = {
            snakePositions: snake.map(s => ({ x: s.x, y: s.y })), // Only position matters for rendering
            food: food,
            powerUps: powerUps.map(p => ({ // Only visual aspects of powerups
                position: p.position,
                type: p.type,
                remainingExpirationTimePercentage: Math.floor(p.remainingExpirationTimePercentage * 10) / 10
            })),
            gameState: gameState,
            effectsActive: { // Only active effects that change visuals
                shield: isShieldActive,
                doublePoints: isDoublePointsActive
            }
        };
        const currentGameStateHash = JSON.stringify(visualState);
        // Throttle main game rendering to 60 FPS max AND only when visual state changes
        if ((now - lastGameRender >= 16) && (currentGameStateHash !== lastGameStateHash)) { // ~60 FPS + change detection
            drawGame();
            lastGameRender = now;
            lastGameStateHash = currentGameStateHash;
        }
        
        //// Fallback: Force redraw every 2 seconds if we have powerUps but haven't drawn recently
        //// This ensures powerUps don't get "stuck" due to change detection issues
        //else if (powerUps && powerUps.length > 0 && (now - lastGameRender) > 2000) {
        //    console.log('Fallback redraw triggered for powerUps');
        //    drawGame();
        //    lastGameRender = now;
        //    lastGameStateHash = currentGameStateHash;
        //}        // COMPLETELY REMOVED: No powerup panel updates in game loop
        // The powerup panel will be updated by a separate interval timer only
    }
    requestAnimationFrame(gameLoop);
}

// Initialize the game
async function init() {
    await setupSignalR();
    setupMobileControls();
    updateUI();
    gameLoop();
    fetchLeaderboard(); // Load initial leaderboard
      // COMPLETELY SEPARATE POWERUP PANEL UPDATE SYSTEM
    // This runs on its own interval, completely disconnected from all game events
    setInterval(() => {
        // Only update when panel is not frozen and game is not in active play
        if (gameState !== 'Ready' && !powerupPanelFrozen) {
            const currentEffectTypes = activePowerUpEffects.map(e => e.type).sort();
            const lastEffectTypes = lastActivePowerUpEffects.map(e => e.type).sort();
            const effectTypesChanged = JSON.stringify(currentEffectTypes) !== JSON.stringify(lastEffectTypes);
            
                drawPowerupPanel();
                lastActivePowerUpEffects = [...activePowerUpEffects];
        } else if (powerupPanelFrozen) {
            console.log('⏰ INTERVAL UPDATE BLOCKED - Panel frozen during gameplay');
        }
    }, 250);
}

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

init();
