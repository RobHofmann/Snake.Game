import { GAME_CONFIG, POWER_UP_CONFIG, UI_CONFIG } from '../config/gameConfig.js';
import gameState from '../state/gameState.js';

/**
 * Handles rendering of the main game area
 */
export class GameRenderer {
    constructor(canvasIdOrElement, context) {
        // Handle both canvas ID string and canvas element
        if (typeof canvasIdOrElement === 'string') {
            this.canvas = document.getElementById(canvasIdOrElement);
            this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        } else {
            this.canvas = canvasIdOrElement;
            this.ctx = context || (this.canvas ? this.canvas.getContext('2d') : null);
        }
        
        // Initialize canvas if found
        if (this.canvas && this.ctx) {
            this.initializeCanvas();
        } else {
            console.error('❌ GameRenderer: Canvas not found or context not available');
        }
        
        this.lastGameRender = 0;
        this.lastGameStateHash = '';
    }    /**
     * Initialize canvas dimensions and settings
     */
    initializeCanvas() {
        // Calculate canvas dimensions from board size and cell size
        this.canvas.width = GAME_CONFIG.BOARD_SIZE.width * GAME_CONFIG.CELL_SIZE;
        this.canvas.height = GAME_CONFIG.BOARD_SIZE.height * GAME_CONFIG.CELL_SIZE;
        console.log('✅ GameRenderer canvas initialized:', this.canvas.width, 'x', this.canvas.height);
    }

    /**
     * Check if rendering is needed based on timing and state changes
     * @returns {boolean}
     */
    shouldRender() {
        const now = Date.now();
        const currentGameStateHash = JSON.stringify({
            snake: gameState.snake,
            food: gameState.food,
            score: gameState.score,
            gameState: gameState.gameState
        });

        return (now - this.lastGameRender >= GAME_CONFIG.RENDER_THROTTLE_MS) && 
               (currentGameStateHash !== this.lastGameStateHash);
    }

    /**
     * Main render function
     */
    render() {
        if (!this.shouldRender() || !this.ctx || gameState.snake.length === 0) {
            return;
        }

        this.clearCanvas();
        this.drawGrid();
        this.drawSnake();
        this.drawFood();
        this.drawPowerUps();

        // Update render tracking
        this.lastGameRender = Date.now();
        this.lastGameStateHash = JSON.stringify({
            snake: gameState.snake,
            food: gameState.food,
            score: gameState.score,
            gameState: gameState.gameState
        });
    }

    /**
     * Clear the canvas with background color
     * @private
     */
    clearCanvas() {
        this.ctx.fillStyle = UI_CONFIG.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draw the grid lines
     * @private
     */
    drawGrid() {
        this.ctx.strokeStyle = UI_CONFIG.COLORS.GRID;
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= GAME_CONFIG.BOARD_SIZE.width; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * GAME_CONFIG.CELL_SIZE, 0);
            this.ctx.lineTo(x * GAME_CONFIG.CELL_SIZE, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= GAME_CONFIG.BOARD_SIZE.height; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * GAME_CONFIG.CELL_SIZE);
            this.ctx.lineTo(this.canvas.width, y * GAME_CONFIG.CELL_SIZE);
            this.ctx.stroke();
        }
    }

    /**
     * Draw the snake with shield effect if active
     * @private
     */
    drawSnake() {
        if (!gameState.snake || !Array.isArray(gameState.snake)) return;

        this.ctx.save();
        this.ctx.shadowBlur = UI_CONFIG.GLOW.SNAKE_BLUR;
        this.ctx.shadowColor = gameState.isShieldActive ? UI_CONFIG.COLORS.SNAKE_SHIELD : UI_CONFIG.COLORS.SNAKE_NORMAL;
        this.ctx.fillStyle = gameState.isShieldActive ? UI_CONFIG.COLORS.SNAKE_SHIELD : UI_CONFIG.COLORS.SNAKE_NORMAL;

        gameState.snake.forEach(segment => {
            if (segment && typeof segment.x === 'number' && typeof segment.y === 'number') {
                this.drawRoundedRect(
                    segment.x * GAME_CONFIG.CELL_SIZE,
                    segment.y * GAME_CONFIG.CELL_SIZE,
                    GAME_CONFIG.CELL_SIZE,
                    GAME_CONFIG.CELL_SIZE,
                    4
                );
            }
        });

        this.ctx.restore();
    }

    /**
     * Draw the food
     * @private
     */
    drawFood() {
        if (!gameState.food || typeof gameState.food.x !== 'number' || typeof gameState.food.y !== 'number') return;

        this.ctx.save();
        this.ctx.shadowBlur = UI_CONFIG.GLOW.FOOD_BLUR;
        this.ctx.shadowColor = UI_CONFIG.COLORS.FOOD;
        this.ctx.fillStyle = UI_CONFIG.COLORS.FOOD;
        
        this.ctx.beginPath();
        this.ctx.arc(
            gameState.food.x * GAME_CONFIG.CELL_SIZE + GAME_CONFIG.CELL_SIZE / 2,
            gameState.food.y * GAME_CONFIG.CELL_SIZE + GAME_CONFIG.CELL_SIZE / 2,
            GAME_CONFIG.CELL_SIZE / 3,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.restore();
    }

    /**
     * Draw all power-ups
     * @private
     */
    drawPowerUps() {
        if (!gameState.powerUps || !Array.isArray(gameState.powerUps)) return;

        gameState.powerUps.forEach(powerUp => {
            if (powerUp && powerUp.position && !powerUp.isExpired) {
                this.drawSinglePowerUp(powerUp);
            }
        });
    }

    /**
     * Draw a single power-up with icon and progress ring
     * @private
     * @param {Object} powerUp 
     */
    drawSinglePowerUp(powerUp) {
        this.ctx.save();
        
        const centerX = powerUp.position.x * GAME_CONFIG.CELL_SIZE + GAME_CONFIG.CELL_SIZE / 2;
        const centerY = powerUp.position.y * GAME_CONFIG.CELL_SIZE + GAME_CONFIG.CELL_SIZE / 2;
        const color = powerUp.color || POWER_UP_CONFIG.COLORS[powerUp.type] || '#FFFFFF';

        // Background circle
        this.ctx.shadowBlur = UI_CONFIG.GLOW.POWERUP_BLUR;
        this.ctx.fillStyle = UI_CONFIG.COLORS.GRID;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, GAME_CONFIG.CELL_SIZE * 0.45, 0, Math.PI * 2);
        this.ctx.fill();

        // Icon with glow
        this.ctx.shadowBlur = UI_CONFIG.GLOW.POWERUP_BLUR;
        this.ctx.shadowColor = color;
        this.ctx.fillStyle = color;
        this.ctx.font = `${GAME_CONFIG.CELL_SIZE * 0.6}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const icon = POWER_UP_CONFIG.ICONS[powerUp.type] || '?';
        this.ctx.fillText(icon, centerX, centerY);

        // Progress ring for expiration
        if (powerUp.remainingExpirationTimePercentage < 1) {
            this.drawProgressRing(centerX, centerY, powerUp.remainingExpirationTimePercentage, color);
        }
        
        this.ctx.restore();
    }

    /**
     * Draw progress ring around power-up
     * @private
     * @param {number} centerX 
     * @param {number} centerY 
     * @param {number} percentage 
     * @param {string} color 
     */
    drawProgressRing(centerX, centerY, percentage, color) {
        const radius = GAME_CONFIG.CELL_SIZE * 0.35;
        
        // Background ring
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = UI_CONFIG.COLORS.GRID;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Progress ring
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(
            centerX, 
            centerY, 
            radius, 
            -Math.PI / 2, 
            -Math.PI / 2 + (Math.PI * 2 * percentage)
        );
        this.ctx.stroke();
    }

    /**
     * Draw rounded rectangle (with fallback for older browsers)
     * @private
     * @param {number} x 
     * @param {number} y 
     * @param {number} width 
     * @param {number} height 
     * @param {number} radius 
     */
    drawRoundedRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        if (this.ctx.roundRect) {
            this.ctx.roundRect(x, y, width, height, radius);
        } else {
            this.ctx.rect(x, y, width, height);
        }
        this.ctx.fill();
    }

    /**
     * Force a redraw on next frame
     */
    forceRedraw() {
        this.lastGameStateHash = '';
    }
}
