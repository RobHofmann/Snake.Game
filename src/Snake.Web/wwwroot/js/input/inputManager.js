import gameState from '../state/gameState.js';
import { EventEmitter } from '../utils/eventEmitter.js';

export class InputManager extends EventEmitter {
    constructor() {
        super();
        this.setupKeyboardInput();
    }

    setupKeyboardInput() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            const gameKeys = [
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
                'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', ' '
            ];
            
            if (gameKeys.includes(e.key)) {
                e.preventDefault();
                this.handleInput(e.key);
            }
        });
    }

    async handleInput(key) {
        const direction = this.getDirectionFromKey(key);
        
        if (direction && gameState.gameState === 'Playing') {
            this.emit('directionChanged', direction);
            return;
        }

        if (key === ' ') {
            this.handleSpaceKey();
        }
    }

    getDirectionFromKey(key) {
        const directionMap = {
            'ArrowUp': 'Up', 'w': 'Up', 'W': 'Up',
            'ArrowDown': 'Down', 's': 'Down', 'S': 'Down',
            'ArrowLeft': 'Left', 'a': 'Left', 'A': 'Left',
            'ArrowRight': 'Right', 'd': 'Right', 'D': 'Right'
        };
        return directionMap[key] || null;
    }

    handleSpaceKey() {
        switch (gameState.gameState) {
            case 'Ready':
                console.log('Player pressed SPACE to start game');
                this.emit('gameAction', 'start');
                break;
            case 'Playing':
                this.emit('gameAction', 'pause');
                break;
            case 'Paused':
                this.emit('gameAction', 'resume');
                break;
        }
    }

    getGameKeys() {
        return [
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', ' '
        ];
    }

    destroy() {
        this.removeAllListeners();
    }
}
