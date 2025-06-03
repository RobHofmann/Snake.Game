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
let gameStartTime = 0; // Track when game started
let connection = null;
let scoreSubmitted = false; // Track if score has been submitted for current game session
let gameWasPlayed = false; // Track if a real game was played (not just page load)
let pageLoadTime = Date.now(); // Track when page was loaded to prevent initial modal

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
// Set canvas dimensions with extra height for powerup panel below
canvas.width = BOARD_SIZE.width * CELL_SIZE;
canvas.height = BOARD_SIZE.height * CELL_SIZE + 100; // Extra space for powerup panel

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

// NUCLEAR OPTION: Completely prevent modal from showing for first 15 seconds
if (nameInputModal) {
    const originalRemove = nameInputModal.classList.remove;
      // Override remove method to block showing modal
    nameInputModal.classList.remove = function(className) {
        const timeSincePageLoad = Date.now() - pageLoadTime;
        if (className === 'hide' && timeSincePageLoad < 15000) {
            return; // Block the modal from being shown
        }
        return originalRemove.call(this, className);
    };
    
    // Restore normal behavior after 15 seconds
    setTimeout(() => {
        nameInputModal.classList.remove = originalRemove;
    }, 15000);
      // Ensure modal starts hidden
    nameInputModal.classList.add('hide');
    nameInputModal.style.display = 'none';
}

// Set up SignalR connection
async function setupSignalR() {
    try {
        connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_BASE_URL}/gamehub`)
            .withAutomaticReconnect()
            .build();        // Handle game state updates from server
        connection.on('UpdateGameState', (state) => {
            if (state) {
                const previousGameState = gameState;
                const previousScore = score;
                
                gameState = state.gameState || 'Ready';
                score = state.score || 0;
                snake = Array.isArray(state.snake) ? state.snake : [];
                food = state.food || { x: 0, y: 0 };
                
                // Only log significant state changes, not every update
                if (previousGameState !== gameState || Math.abs(previousScore - score) > 0) {
                    console.log(`Game state: ${previousGameState} → ${gameState}, score: ${previousScore} → ${score}`);
                }                // Set gameStartTime when transitioning from Ready to Playing
                if (previousGameState === 'Ready' && gameState === 'Playing' && gameStartTime === 0) {
                    gameStartTime = Date.now();
                    gameWasPlayed = true; // Mark that a real game was started
                    console.log('🎮 Game started by player, gameWasPlayed=true');
                }
                
                // Update power-ups while preserving color information more efficiently
                if (Array.isArray(state.powerUps)) {
                    powerUps = state.powerUps.map(p => ({
                        ...p,
                        color: p.color || getPowerUpColor(p.type)
                    }));
                } else {
                    powerUps = [];
                }
                
                // Update active powerup effects with countdown timers
                if (Array.isArray(state.activePowerUpEffects)) {
                    activePowerUpEffects = state.activePowerUpEffects.map(p => ({
                        ...p,
                        color: p.color || getPowerUpColor(p.type)
                    }));
                } else {
                    activePowerUpEffects = [];
                }
                
                // Update power-up effect states consistently
                isShieldActive = state.isShieldActive || false;
                isDoublePointsActive = state.isDoublePointsActive || false;
                speedMultiplier = state.speedMultiplier || 1.0;
                
                updateUI();
                requestAnimationFrame(drawGame);
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
    if (!ctx || snake.length === 0) return;    // Clear entire canvas
    ctx.fillStyle = '#1a0b2e'; // Dark purple background as per PRD
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid only in the game area (not in the powerup panel area)
    const gameAreaWidth = BOARD_SIZE.width * CELL_SIZE;
    ctx.strokeStyle = '#2a1a3e'; // Slightly lighter purple for grid
    for (let x = 0; x <= BOARD_SIZE.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL_SIZE, 0);
        ctx.lineTo(x * CELL_SIZE, BOARD_SIZE.height * CELL_SIZE);
        ctx.stroke();
    }
    for (let y = 0; y <= BOARD_SIZE.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL_SIZE);
        ctx.lineTo(gameAreaWidth, y * CELL_SIZE);
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
      ctx.restore();    // Draw active power-up effect indicators with countdown timers
    if (activePowerUpEffects && activePowerUpEffects.length > 0) {
        // Position panel below the playing field
        const gameAreaHeight = BOARD_SIZE.height * CELL_SIZE;
        const panelX = 5;
        const panelY = gameAreaHeight + 10;
        const panelWidth = canvas.width - 10;
        const panelHeight = 50; // Fixed height for panel
        
        // Draw semi-transparent panel
        ctx.fillStyle = 'rgba(26, 11, 46, 0.9)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        
        // Draw each active effect with countdown timer
        ctx.font = 'bold 16px Arial';
        ctx.textBaseline = 'middle';
        
        // Calculate spacing between effects based on panel width and number of effects
        const effectWidth = Math.min(280, panelWidth / activePowerUpEffects.length);
        
        activePowerUpEffects.forEach((effect, index) => {
            const x = panelX + (effectWidth * index) + 15;
            const y = panelY + 25;
            
            // Draw icon with glow
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = effect.color;
            ctx.fillStyle = effect.color;
            ctx.fillText(getPowerUpIcon(effect.type), x, y);
            
            // Draw effect name
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(getEffectName(effect.type), x + 30, y);
            
            // Background bar
            const barWidth = 60;
            const barHeight = 6;
            const barX = x + effectWidth - 100;
            const barY = y - barHeight / 2;
            
            ctx.fillStyle = '#2a1a3e';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Progress bar
            const remainingPercent = effect.remainingEffectTimePercentage || 0;
            ctx.fillStyle = effect.color;
            ctx.fillRect(barX, barY, barWidth * remainingPercent, barHeight);
            
            // Draw countdown timer
            const remainingSeconds = Math.ceil(remainingPercent * effect.effectDurationInSeconds);
            ctx.fillStyle = '#ffff00';
            ctx.textAlign = 'left';
            ctx.fillText(`${remainingSeconds}s`, barX + barWidth + 5, y);
            
            ctx.restore();
        });
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

// UI update function
function updateUI() {
    scoreElement.textContent = score;
    gameStatusElement.textContent = gameState;
    finalScoreElement.textContent = score;

    // Show/hide screens based on game state
    if (gameState === 'Ready') {
        startScreen.classList.remove('hide');
        gameOverScreen.classList.add('hide');
        canvas.classList.add('hide');
        nameInputModal.classList.add('hide');        // Reset game session flags
        scoreSubmitted = false; // Reset score submission flag for new game
        gameStartTime = 0; // Reset game start time
        gameWasPlayed = false; // Reset game played flag
    } else if (gameState === 'GameOver') {
        startScreen.classList.add('hide');
        gameOverScreen.classList.remove('hide');        canvas.classList.remove('hide');
        nameInputModal.classList.add('hide');

        // Only attempt to submit score once per game session AND only if a real game was played
        if (!scoreSubmitted && gameStartTime > 0 && score > 0 && gameWasPlayed) {
            console.log('✅ High score check: conditions met, checking leaderboard...');
            checkForHighScore();
        } else {
            // If conditions aren't met, just submit anonymously without modal (only if gameWasPlayed)
            if (!scoreSubmitted && gameWasPlayed && (gameStartTime <= 0 || score <= 0)) {
                console.log('📝 Submitting anonymous score for completed game');
                submitScore('Anonymous');
            }
        }
    } else {
        startScreen.classList.add('hide');
        gameOverScreen.classList.add('hide');
        canvas.classList.remove('hide');
        nameInputModal.classList.add('hide');
    }
}// Function to check if current score qualifies for high score entry
async function checkForHighScore() {
    // CRITICAL: Block all modals during page load period (PRIMARY FIX)
    const timeSincePageLoad = Date.now() - pageLoadTime;
    if (timeSincePageLoad < 5000) {
        console.log('🚫 BLOCKING: Still in page load grace period, submitting as Anonymous');
        submitScore('Anonymous');
        return;
    }
    
    // Don't show name input for scores of 0 or negative scores
    if (score <= 0) {
        console.log('🚫 BLOCKING: Score is 0 or negative, submitting as Anonymous');
        submitScore('Anonymous');
        return;
    }
    
    // Don't show name input if no game has been started (gameStartTime not set)
    if (!gameStartTime || gameStartTime === 0) {
        console.log('🚫 BLOCKING: Game not started (gameStartTime is 0), submitting as Anonymous');
        submitScore('Anonymous');
        return;
    }
    
    // Don't show name input if no real game was played
    if (!gameWasPlayed) {
        console.log('🚫 BLOCKING: No real game was played, submitting as Anonymous');
        submitScore('Anonymous');
        return;
    }
    
    // Additional check: Ensure this isn't happening during page load/initial state
    // If gameStartTime was set less than 1 second ago, it might be from initial load
    const timeSinceGameStart = Date.now() - gameStartTime;
    if (timeSinceGameStart < 1000) {
        console.log('🚫 BLOCKING: Game started too recently (potential page load), submitting as Anonymous');
        submitScore('Anonymous');
        return;
    }
    
    try {        // Get current leaderboard to check if this is a high score
        const response = await fetch(`${API_BASE_URL}/api/leaderboard/scores/top?limit=10`);
        if (response.ok) {
            const scores = await response.json();
            const lowestHighScore = scores.length > 0 ? Math.min(...scores.map(s => s.score)) : 0;
            
            // If player scored higher than lowest high score or (leaderboard has less than 10 entries AND score > 0)
            const isHigherScore = score > lowestHighScore;
            const hasRoomInLeaderboard = scores.length < 10;
            const isQualifyingScore = isHigherScore || (hasRoomInLeaderboard && score > 0);
            
            if (isQualifyingScore) {
                console.log('🎉 Score qualifies for leaderboard, showing modal');
                showNameInputModal();
            } else {
                console.log('📝 Score not high enough, submitting as Anonymous');
                submitScore('Anonymous');
            }        } else {
            // If can't fetch leaderboard, only show name input for scores > 0
            if (score > 0) {
                console.log('🎉 Fallback: Score > 0, showing modal');
                showNameInputModal();
            } else {
                console.log('📝 Fallback: Score <= 0, submitting as Anonymous');
                submitScore('Anonymous');
            }
        }    } catch (error) {
        console.error('💥 Error checking for high score:', error);
        // On error, only show name input for scores > 0
        if (score > 0) {
            showNameInputModal();
        } else {
            submitScore('Anonymous');
        }
    }
}// Function to show name input modal
function showNameInputModal() {
    // NUCLEAR OPTION: Absolutely prevent modal for first 15 seconds after page load
    const timeSincePageLoad = Date.now() - pageLoadTime;
    if (timeSincePageLoad < 15000) { // 15 seconds - very aggressive
        console.log('🚫 Modal blocked due to recent page load (NUCLEAR PROTECTION)');
        return; // Don't even submit score, just return
    }
    
    // Additional safety checks to prevent any modal from showing inappropriately
    if (score <= 0) {
        console.log('🚫 Modal blocked due to zero or negative score');
        submitScore('Anonymous');
        return;
    }
    
    if (!gameWasPlayed) {
        console.log('🚫 Modal blocked - no real game played');
        submitScore('Anonymous');
        return;
    }
    
    if (!gameStartTime || gameStartTime === 0) {
        console.log('🚫 Modal blocked - no game start time');
        submitScore('Anonymous');
        return;
    }
    
    const timeSinceGameStart = Date.now() - gameStartTime;
    if (timeSinceGameStart < 1000) {
        console.log('🚫 Modal blocked - game started too recently');
        submitScore('Anonymous');
        return;
    }
    
    // Show the modal
    highScoreValueElement.textContent = score;
    playerNameInput.value = localStorage.getItem('playerName') || '';
    playerNameInput.focus();
    nameInputModal.classList.remove('hide');
}

    // Function to submit score to leaderboard
    async function submitScore(playerName = null) {
        if (scoreSubmitted) {
            return; // Prevent duplicate submissions
        }
        
        scoreSubmitted = true;
        
        try {
            const finalPlayerName = playerName || playerNameInput.value.trim() || 'Anonymous';
            
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
                
                // Hide name input modal if it's showing
                nameInputModal.classList.add('hide');
                
                // Refresh leaderboard to show new score
                fetchLeaderboard(currentLeaderboardPeriod);
            } else {
                console.error('Failed to submit score:', response.statusText);
                scoreSubmitted = false; // Allow retry on failure
            }
        } catch (error) {
            console.error('Error submitting score:', error);
            scoreSubmitted = false; // Allow retry on failure
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
    tbody.innerHTML = '';

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
            break;
        case 'ArrowDown':
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
            break;        case ' ':
            if (gameState === 'Ready') {
                console.log('🎮 Player pressed SPACE to start game - setting gameWasPlayed=true');
                gameStartTime = Date.now();
                gameWasPlayed = true; // Mark that player started a game
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
    e.preventDefault();
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
        drawGame();
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
