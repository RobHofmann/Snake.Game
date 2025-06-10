import { GAME_CONFIG } from '../config/gameConfig.js';
import { EventEmitter } from '../utils/eventEmitter.js';
import gameState from '../state/gameState.js';

/**
 * SignalR client for real-time communication with game server
 */
export class SignalRClient extends EventEmitter {
    constructor() {
        super();
        this.connection = null;
    }

    /**
     * Establish connection to the game hub
     * @returns {Promise<boolean>} Success status
     */
    async connect() {
        try {
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl(`${GAME_CONFIG.API_BASE_URL}/gamehub`)
                .withAutomaticReconnect()
                .build();

            this.setupEventHandlers();
            await this.connection.start();
            console.log('Connected to game hub');
            return true;
        } catch (err) {
            console.error('Error establishing connection:', err);
            return false;
        }
    }

    /**
     * Set up SignalR event handlers
     * @private
     */
    setupEventHandlers() {
        this.connection.on('UpdateGameState', (state) => {
            if (state) {
                const stateChanged = gameState.updateFromServer(state);
                
                // Emit event for other components to react
                this.emit('gameStateUpdated', { 
                    state, 
                    stateChanged,
                    gameState: gameState.gameState,
                    score: gameState.score
                });
            }
        });

        // Handle connection events
        this.connection.onreconnecting((error) => {
            console.log('SignalR reconnecting...', error);
            this.emit('connectionStateChanged', { state: 'reconnecting', error });
        });

        this.connection.onreconnected((connectionId) => {
            console.log('SignalR reconnected:', connectionId);
            this.emit('connectionStateChanged', { state: 'connected', connectionId });
        });

        this.connection.onclose((error) => {
            console.log('SignalR connection closed:', error);
            this.emit('connectionStateChanged', { state: 'disconnected', error });
        });
    }

    /**
     * Start a new game
     */
    async startGame() {
        if (this.connection) {
            await this.connection.invoke('StartGame');
        }
    }

    /**
     * Change snake direction
     * @param {string} direction - Direction ('Up', 'Down', 'Left', 'Right')
     */
    async changeDirection(direction) {
        if (this.connection && gameState.gameState === 'Playing') {
            await this.connection.invoke('ChangeDirection', direction);
        }
    }

    /**
     * Pause the game
     */
    async pauseGame() {
        if (this.connection) {
            await this.connection.invoke('PauseGame');
        }
    }

    /**
     * Resume the game
     */
    async resumeGame() {
        if (this.connection) {
            await this.connection.invoke('ResumeGame');
        }
    }

    /**
     * Check if connected
     * @returns {boolean}
     */
    isConnected() {
        return this.connection && this.connection.state === signalR.HubConnectionState.Connected;
    }

    /**
     * Get connection state
     * @returns {string}
     */
    getConnectionState() {
        if (!this.connection) return 'disconnected';
        
        switch (this.connection.state) {
            case signalR.HubConnectionState.Connected:
                return 'connected';
            case signalR.HubConnectionState.Connecting:
                return 'connecting';
            case signalR.HubConnectionState.Reconnecting:
                return 'reconnecting';
            case signalR.HubConnectionState.Disconnected:
                return 'disconnected';
            default:
                return 'unknown';
        }
    }
}
