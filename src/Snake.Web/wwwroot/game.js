// Game constants
const CELL_SIZE = 20;
const BOARD_SIZE = { width: 30, height: 30 };
const API_BASE_URL = 'http://localhost:5075'; // Add API base URL

// Game variables
let gameState = 'Ready';
let score = 0;
let snake = [];
let food = { x: 0, y: 0 };
let powerUps = [];
let connection = null;

// Game state indicators
let isShieldActive = false;
let isDoublePointsActive = false;
let speedMultiplier = 1.0;

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = BOARD_SIZE.width * CELL_SIZE;
canvas.height = BOARD_SIZE.height * CELL_SIZE;

// DOM elements
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('finalScore');
const gameStatusElement = document.getElementById('gameStatus');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOver');
const playAgainButton = document.getElementById('playAgain');

// Set up SignalR connection
async function setupSignalR() {
    try {
        connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_BASE_URL}/gamehub`)
            .withAutomaticReconnect()
            .build();        // Handle game state updates from server
        connection.on('UpdateGameState', (state) => {
            console.log('Received game state update:', state);
            if (state) {
                gameState = state.gameState || 'Ready';
                score = state.score || 0;
                snake = Array.isArray(state.snake) ? state.snake : [];
                food = state.food || { x: 0, y: 0 };
                
                // Update power-ups while preserving color information more efficiently
                if (Array.isArray(state.powerUps)) {
                    powerUps = state.powerUps.map(p => ({
                        ...p,
                        color: p.color || getPowerUpColor(p.type)
                    }));
                } else {
                    powerUps = [];
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
    if (!ctx || snake.length === 0) return;

    // Clear canvas
    ctx.fillStyle = '#1a0b2e'; // Dark purple background as per PRD
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
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
    
    ctx.restore();    // Draw active power-up indicators in a semi-transparent panel
    const indicators = [];
    if (isShieldActive) indicators.push({ color: '#FFFF00', text: 'Shield Active', icon: '🛡️' });
    if (isDoublePointsActive) indicators.push({ color: '#FF00FF', text: 'Double Points Active', icon: '2️⃣' });
    if (speedMultiplier > 1.0) indicators.push({ color: '#0080FF', text: 'Speed Boost Active', icon: '⚡' });

    if (indicators.length > 0) {
        // Draw semi-transparent panel
        ctx.fillStyle = 'rgba(26, 11, 46, 0.8)'; // Match game background with alpha
        ctx.fillRect(5, 5, 200, (indicators.length * 30) + 10);
        
        // Draw indicators
        ctx.font = 'bold 16px Arial';
        ctx.textBaseline = 'middle';
        indicators.forEach((indicator, index) => {
            const y = 20 + (index * 30);
            
            // Draw icon with glow
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = indicator.color;
            ctx.fillStyle = indicator.color;
            ctx.fillText(indicator.icon, 15, y);
            
            // Draw text
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(indicator.text, 45, y);
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
            return '?';
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
    } else if (gameState === 'GameOver') {
        startScreen.classList.add('hide');
        gameOverScreen.classList.remove('hide');
        canvas.classList.remove('hide');
    } else {
        startScreen.classList.add('hide');
        gameOverScreen.classList.add('hide');
        canvas.classList.remove('hide');
    }
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
            break;
        case ' ':
            if (gameState === 'Ready') {
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
    updateUI();
    gameLoop();
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
