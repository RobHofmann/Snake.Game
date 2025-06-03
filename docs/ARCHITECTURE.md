# Architecture Design - Snake Game

**Date: June 4, 2025**

## 1. System Overview

The Snake Game is a modern web-based implementation of a classic arcade game with online features, following Clean Architecture principles and targeting Azure PaaS services.

### 1.1 High-Level Architecture

```
                   ┌──────────────────┐
                   │     Browser      │
                   │   Snake Game     │
                   │    (HTML/JS)     │
                   └────────┬─────────┘
                           │
                           ▼
                   ┌──────────────────┐
                   │  Azure CDN/      │
                   │  Static Website  │
                   └────────┬─────────┘
                           │
                           ▼
        ┌─────────────────────────────────┐
        │      Azure App Service          │
        │    (Backend API Services)       │
        └──┬─────────────┬───────────┬───┘
           │             │           │
     ┌─────▼────┐ ┌─────▼────┐ ┌────▼────┐
     │ Cosmos DB│ │   App    │ │  Azure  │
     │(Serverless)│ │ Insights │ │  Key   │
     └──────────┘ └──────────┘ │  Vault  │
                                └─────────┘
```

## 2. Component Architecture

### 2.1 Frontend Architecture (Vanilla HTML, CSS, JavaScript)

The frontend has been simplified to use vanilla web technologies without frameworks:

```
src/Snake.Web/
├── index.html       # Main HTML structure and game UI
├── styles.css       # CSS styling for game elements
└── game.js          # Game logic and SignalR connection

Key Components:
- Canvas-based rendering
- SignalR client for real-time updates
- Browser local storage for settings
- Responsive design for mobile and desktop
```

#### Frontend Components

1. **HTML Structure** - Canvas element for game rendering

   - Score and status displays
   - Game controls and modal screens
   - Power-up effects panel below game field

2. **CSS Styling and Layout**

   - Game board dimensions: 600×600 pixels (30×30 cells) on desktop
   - Responsive scaling for mobile devices with max-width viewport
   - Power-up panel below game board: Full width × 50 pixels
   - Semi-transparent backgrounds for UI overlays
   - Responsive layout with breakpoints:
     - Desktop: >768px - Full size with margins
     - Tablet: 481-768px - Scaled to fit with touch controls
     - Mobile: ≤480px - Optimized layout with larger touch targets
   - Neon glow effects for game elements
   - Mobile-specific UI elements:
     - Touch control overlay (on-screen D-pad)
     - Larger buttons and touch targets (44px minimum)
     - Safe area margins for notched devices
   - Horizontal layout for power-up indicators
     - Icon with color-matched glow
     - Effect name in white
     - Progress bar showing duration
     - Timer in yellow text

3. **JavaScript Logic**

   - SignalR connection management
   - Input handling (keyboard and touch)
     - Keyboard: Arrow keys and WASD
     - Touch: Swipe gesture detection with momentum calculations
     - Touch: On-screen directional buttons with haptic feedback (where available)
     - Input debouncing and direction queue management
   - Game state management
   - UI updates and animations
   - Mobile device detection and adaptation
   - Touch event optimization for performance

4. **Canvas Rendering Engine**
   - Layer-based drawing system:
     1. Background and grid (game area only)
     2. Snake segments with shield effect
     3. Food items with glow
     4. Power-up items with expiration rings
     5. Power-up status panel (below game area)
   - Double buffering for smooth animations
   - Optimized rendering areas:
     - Game field: 600×600 pixels
     - UI panel: 600×50 pixels
   - GPU-accelerated when available
   - 60 FPS target refresh rate

### 2.2 Backend Architecture

The backend follows Clean Architecture principles with a domain-driven design:

```csharp
// Clean Architecture Structure
src/
├── Snake.Domain/
│   ├── GameEngine/
│   │   ├── GameEngine.cs        // Core game logic
│   │   ├── IGameEngine.cs       // Interface for game engine
│   │   ├── Position.cs          // Position struct
│   │   ├── Direction.cs         // Direction enum and extensions
│   │   ├── GameState.cs         // Game state enum
│   │   └── IInputHandler.cs     // Input handler interface
│   └── Entities/
│       ├── Score.cs
│       └── Player.cs
├── Snake.Application/
│   ├── Services/
│   │   ├── ScoreService.cs
│   │   └── LeaderboardService.cs
│   └── DTOs/
│       └── ScoreDTO.cs
├── Snake.Infrastructure/
│   ├── Persistence/
│   │   ├── ScoreRepository.cs
│   │   └── DbContext.cs
│   └── Services/
│       ├── AuthService.cs
│       └── TelemetryService.cs
└── Snake.API/
    ├── Hubs/
    │   └── GameHub.cs           // SignalR hub for real-time communication
    ├── Services/
    │   └── GameService.cs       // Background service for game loop
    └── Controllers/
        ├── ScoresController.cs
        └── LeaderboardController.cs
```

#### Backend Components

1. **SignalR Hub (GameHub.cs)**

   - Manages real-time communication with clients
   - Handles game control commands (start, pause, resume)
   - Processes direction changes from user input

2. **Background Service (GameService.cs)**

   - Implements the game loop with proper delta time calculation
   - Updates game state at regular intervals
   - Broadcasts updated game state to connected clients
   - Handles game timing and synchronization

3. **Game Engine (GameEngine.cs)**

   - Core game logic implementation
   - Manages snake movement, growth, and collision detection
   - Tracks game state (playing, paused, game over)
   - Calculates scoring
   - Handles PowerUp generation and management

4. **PowerUp System (PowerUp.cs)**
   - Manages different power-up types with distinct effects:
     - SpeedBoost: Increases snake speed for 15 seconds
     - Shield: Prevents death on wall collision for 10 seconds
     - DoublePoints: Doubles all points earned for 20 seconds
     - Shrink: Instantly reduces snake length by 30%
   - Time-based expiration system:
     - Random duration based on power-up type
     - Visual countdown indicators
     - Deterministic testing capability via `SetSpawnTime` method
   - Effect duration tracking with activation/deactivation times
   - Progress percentage calculations for UI display

## 3. Data Architecture

### 3.1 Azure Cosmos DB

#### Configuration

- **Account Type**: Azure Cosmos DB for NoSQL
- **Capacity Mode**: Serverless (cost-optimized for development and low-traffic periods)
- **Consistency Level**: Session (optimal balance between consistency and performance)
- **Backup**: Continuous backup enabled
- **Networking**: Public access with managed identity authentication

#### Database Design

- **Database**: SnakeGameDB
- **Containers**:
  1. **Leaderboard**
     - Partition Key: `/partitionKey` (composite of region and date)
     - Indexed Paths: Score (descending), Timestamp
     - Document Structure:
       ```json
       {
         "id": "unique-guid",
         "partitionKey": "eu-west_2025-05",
         "playerName": "string",
         "score": number,
         "gameTime": number,
         "timestamp": "ISO-8601-date",
         "region": "string"
       }
       ```

#### Access Patterns

- User-assigned managed identity for secure access
- Cosmos DB Data Contributor role assigned to the App Service identity
- Repository pattern with the Microsoft.Azure.Cosmos client SDK
- Optimistic concurrency for score updates

#### Database Initialization

- **Automatic Setup**: Database and containers are created automatically on application startup
- **Idempotent Operations**: Safe to run multiple times, checks for existing resources
- **Environment Support**: Works with both local emulator and Azure production environments
- **Container Configuration**: Proper partition keys and indexing policies applied during creation
- **Seed Data**: Optional initial data for development and testing environments

#### Scaling & Performance

- Serverless capacity mode auto-scales based on demand
- Session-level consistency for optimal read performance
- Indexing policy optimized for leaderboard queries
- Partition key design supports efficient regional leaderboards

## 4. Key Components

### 4.1 Game Engine

- Canvas-based rendering
- Frame-based animation loop
- Collision detection system
- Power-up management
  - Time-based expiration system with deterministic test capabilities
  - Effect duration tracking with percentage calculation
  - Spawn time and expiration time management
  - Activation and deactivation lifecycle handling
  - Test-friendly design with optional constructor parameters
  - Methods for controlling time values in tests (`SetSpawnTime`)
- State management

### 4.2 Input System

#### Desktop Input

- Keyboard input handler (WASD + Arrow keys)
- Space bar for pause/resume and start game

#### Mobile Input

- **Touch/Swipe Gestures**: Primary mobile input method

  - Swipe up/down/left/right for directional control
  - Minimum swipe distance: 30px for reliable detection
  - Touch response time: <16ms target for 60fps
  - Gesture threshold: 0.3 velocity ratio to prevent accidental triggers

- **On-Screen Control Buttons**: Secondary mobile input method
  - Semi-transparent directional pad (D-pad) overlay
  - Positioned in bottom-right corner with safe area margins
  - Only visible on touch devices (CSS media queries)
  - Button size: 44px minimum (iOS/Android accessibility guidelines)
  - Visual feedback on press with neon glow effects

#### Cross-Platform Features

- Input state management with debouncing
- Automatic input method detection (touch vs keyboard)
- Responsive control visibility based on device capabilities
- Input normalization across platforms

### 4.3 Audio System

- Web Audio API implementation
- Sound effect manager
- Background music manager
- Audio state persistence

### 4.4 State Management

```typescript
interface GameState {
  snake: {
    positions: Position[];
    direction: Direction;
    speed: number;
  };
  powerups: {
    active: PowerUp[];
    available: PowerUp[];
  };
  score: {
    current: number;
    multiplier: number;
  };
  game: {
    status: GameStatus;
    level: number;
  };
}
```

### 4.5 API Endpoints

```typescript
// Score API
POST / api / scores;
GET / api / scores;
GET / api / scores / top;
GET / api / scores / player / { id };

// Leaderboard API
GET / api / leaderboard;
GET / api / leaderboard / weekly;
GET / api / leaderboard / monthly;
```

## 5. Data Models

### 5.1 Score Entity

```csharp
public class Score
{
    public Guid Id { get; set; }
    public string PlayerName { get; set; }
    public int Value { get; set; }
    public DateTime Timestamp { get; set; }
    public string GameplayHash { get; set; }
    public bool IsVerified { get; set; }
}
```

### 5.2 Database Schema

```sql
CREATE TABLE Scores (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    PlayerName NVARCHAR(3) NOT NULL,
    Value INT NOT NULL,
    Timestamp DATETIME2 NOT NULL,
    GameplayHash NVARCHAR(64) NOT NULL,
    IsVerified BIT NOT NULL
);
```

## 6. Security Measures

### 6.1 Score Validation

- Replay hash verification
- Rate limiting
- Pattern detection
- Server-side validation

### 6.2 API Security

- Azure AD authentication
- HTTPS enforcement
- CORS policy
- Input validation

## 7. Monitoring & Analytics

### 7.1 Application Insights Integration

```typescript
interface GameAnalytics {
  gameStart: () => void;
  gameEnd: (score: number, duration: number) => void;
  powerupCollected: (type: PowerUpType) => void;
  controlMethodUsed: (method: ControlMethod) => void;
}
```

### 7.2 Performance Monitoring

- Page load times
- Frame rate monitoring
- API response times
- Error tracking

## 8. Offline Capabilities

### 8.1 Service Worker Strategy

- Cache-first for static assets
- Network-first for API calls
- Background sync for scores
- Periodic sync for leaderboard

### 8.2 Data Persistence

```typescript
interface OfflineStorage {
  scores: Score[];
  settings: GameSettings;
  pendingSync: SyncItem[];
}
```

## 9. Performance Optimizations

### 9.1 Asset Loading

- Image sprite sheets
- Audio sprite sheets
- Lazy loading
- Asset preloading

### 9.2 Rendering

- RequestAnimationFrame
- Canvas optimization
- DOM updates batching
- Memory management

## 10. Testing Strategy

### 10.1 Frontend Testing

- Unit tests (Jest)
- Component tests (Testing Library)
- E2E tests (Playwright)
- Performance tests (Lighthouse)

### 10.2 Backend Testing

- Unit tests (xUnit)
- Integration tests
- Load tests
- Security tests

**Version:** 1.0
**Last Updated:** May 30, 2025
