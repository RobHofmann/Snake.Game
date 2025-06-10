import { GAME_CONFIG, POWER_UP_CONFIG, UI_CONFIG } from '../config/gameConfig.js';
import gameState from '../state/gameState.js';

/**
 * Handles rendering of the power-up effects panel
 */
export class PowerUpRenderer {
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
            console.error('❌ PowerUpRenderer: Canvas not found or context not available');
        }
        
        this.lastPowerupPanelUpdate = 0;
    }    /**
     * Initialize canvas dimensions and settings
     */
    initializeCanvas() {
        // Calculate canvas dimensions - same width as game, smaller height for power-up panel
        this.canvas.width = GAME_CONFIG.BOARD_SIZE.width * GAME_CONFIG.CELL_SIZE;
        this.canvas.height = 80; // Fixed height for power-up panel
        console.log('✅ PowerUpRenderer canvas initialized:', this.canvas.width, 'x', this.canvas.height);
    }    /**
     * Render the power-up effects panel
     */
    render() {
        if (!this.ctx) return;
        
        // Clear the powerup panel canvas
        this.clearPanel();
        
        // Debug logging for powerup panel state
        const hasEffects = gameState.activePowerUpEffects && gameState.activePowerUpEffects.length > 0;
        const panelFrozen = gameState.powerupPanelFrozen;
        
        console.log(`🎮 PowerUp Panel Render:`, {
            hasEffects,
            effectCount: gameState.activePowerUpEffects?.length || 0,
            panelFrozen,
            gameState: gameState.gameState
        });
        
        // Only draw if we have active effects and panel isn't frozen
        if (hasEffects && !panelFrozen) {
            // Filter out effects with very low remaining time (< 5%)
            const visibleEffects = gameState.activePowerUpEffects.filter(effect => {
                const remainingPercent = effect.remainingEffectTimePercentage || 0;
                const shouldShow = remainingPercent >= 0.05;
                if (!shouldShow) {
                    console.log(`🕐 PowerUp ${effect.type} hidden - remainingPercent: ${remainingPercent.toFixed(3)}`);
                }
                return shouldShow;
            });
            
            if (visibleEffects.length > 0) {
                // Temporarily override the gameState effects for rendering
                const originalEffects = gameState.activePowerUpEffects;
                gameState.activePowerUpEffects = visibleEffects;
                this.drawActivePowerUpEffects();
                gameState.activePowerUpEffects = originalEffects;
            }
        }
    }

    /**
     * Clear the power-up panel
     * @private
     */
    clearPanel() {
        this.ctx.fillStyle = UI_CONFIG.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draw active power-up effect indicators
     * @private
     */
    drawActivePowerUpEffects() {
        const panelX = 5;
        const panelY = 5;
        const panelWidth = this.canvas.width - 10;
        const panelHeight = this.canvas.height - 10;
        
        // Draw semi-transparent panel background
        this.ctx.fillStyle = 'rgba(26, 11, 46, 0.9)';
        this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        
        // Setup text properties
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textBaseline = 'middle';
        
        // Calculate spacing between effects
        const effectWidth = Math.min(280, panelWidth / gameState.activePowerUpEffects.length);
        
        gameState.activePowerUpEffects.forEach((effect, index) => {
            this.drawSingleEffect(effect, index, panelX, panelY, panelHeight, effectWidth);
        });
    }

    /**
     * Draw a single power-up effect
     * @private
     * @param {Object} effect 
     * @param {number} index 
     * @param {number} panelX 
     * @param {number} panelY 
     * @param {number} panelHeight 
     * @param {number} effectWidth 
     */
    drawSingleEffect(effect, index, panelX, panelY, panelHeight, effectWidth) {
        const x = panelX + (effectWidth * index) + 15;
        const y = panelY + panelHeight / 2;
        
        this.ctx.save();
        
        // Draw icon with glow
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = effect.color;
        this.ctx.fillStyle = effect.color;
        this.ctx.textAlign = 'left';
        
        const icon = POWER_UP_CONFIG.ICONS[effect.type] || '?';
        this.ctx.fillText(icon, x, y);
        
        // Draw effect name
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#ffffff';
        const effectName = POWER_UP_CONFIG.NAMES[effect.type] || 'Unknown';
        this.ctx.fillText(effectName, x + 30, y);
        
        // Draw progress bar and countdown
        this.drawEffectProgress(effect, x, y, effectWidth);
        
        this.ctx.restore();
    }    /**
     * Draw progress bar and countdown timer for effect
     * @private
     * @param {Object} effect 
     * @param {number} x 
     * @param {number} y 
     * @param {number} effectWidth 
     */
    drawEffectProgress(effect, x, y, effectWidth) {
        const remainingPercent = effect.remainingEffectTimePercentage || 0;
        const effectDurationSeconds = effect.effectDurationInSeconds || POWER_UP_CONFIG.DURATIONS[effect.type] || 10;
        
        // FIX: Use Math.round() instead of Math.ceil() to prevent "1s" stuck display
        // Add threshold check to hide display when very little time remains
        const remainingSeconds = remainingPercent < 0.05 ? 0 : Math.round(remainingPercent * effectDurationSeconds);
        
        // Debug logging for powerup timer calculations
        console.log(`🔍 PowerUp Timer Debug - ${effect.type}:`, {
            remainingPercent: remainingPercent.toFixed(3),
            effectDurationSeconds,
            remainingSeconds,
            shouldShow: remainingPercent >= 0.05
        });
        
        // Progress bar dimensions
        const barWidth = 60;
        const barHeight = 6;
        const barX = x + effectWidth - 100;
        const barY = y - barHeight / 2;
        
        // Background progress bar
        this.ctx.fillStyle = UI_CONFIG.COLORS.GRID;
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Active progress bar
        this.ctx.fillStyle = effect.color;
        this.ctx.fillRect(barX, barY, barWidth * remainingPercent, barHeight);
        
        // Only show countdown timer text if there's meaningful time remaining
        if (remainingPercent >= 0.05 && remainingSeconds > 0) {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`${remainingSeconds}s`, barX + barWidth + 5, y);
        }
    }

    /**
     * Check if power-up panel should be hidden
     * @returns {boolean}
     */
    shouldHidePanel() {
        return gameState.powerupPanelFrozen;
    }
}
