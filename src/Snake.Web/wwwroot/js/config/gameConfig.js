// Game configuration constants
export const GAME_CONFIG = {
    CELL_SIZE: 20,
    BOARD_SIZE: { width: 30, height: 30 },
    API_BASE_URL: 'http://localhost:5075',
    SWIPE_THRESHOLD: 30,
    SWIPE_VELOCITY_THRESHOLD: 0.3,
    RENDER_THROTTLE_MS: 16, // ~60 FPS
    PAGE_LOAD_MODAL_DELAY_MS: 500
};

export const POWER_UP_CONFIG = {
    COLORS: {
        SpeedBoost: '#0080FF',   // Blue neon
        Shield: '#FFFF00',       // Yellow neon
        DoublePoints: '#FF00FF', // Pink neon
        Shrink: '#39FF14'        // Green neon
    },
    ICONS: {
        SpeedBoost: '⚡',
        Shield: '🛡️',
        DoublePoints: '2️⃣',
        Shrink: '🌿'
    },
    NAMES: {
        SpeedBoost: 'Speed Boost',
        Shield: 'Shield',
        DoublePoints: 'Double Points',
        Shrink: 'Shrink'
    },
    DURATIONS: {
        SpeedBoost: 15,   // 15 seconds
        Shield: 10,       // 10 seconds
        DoublePoints: 20, // 20 seconds
        Shrink: 0         // Instant effect
    }
};

export const UI_CONFIG = {
    COLORS: {
        BACKGROUND: '#1a0b2e',      // Dark purple background
        GRID: '#2a1a3e',            // Slightly lighter purple for grid
        SNAKE_NORMAL: '#39ff14',     // Green neon
        SNAKE_SHIELD: '#FFFF00',     // Yellow when shielded
        FOOD: '#ff3131'             // Red neon
    },
    GLOW: {
        BLUR: 15,
        SNAKE_BLUR: 15,
        FOOD_BLUR: 15,
        POWERUP_BLUR: 10
    }
};
