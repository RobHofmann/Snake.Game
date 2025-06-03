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

1. **HTML Structure**

   - Canvas element for game rendering
   - Score and status displays
   - Game controls and modal screens

2. **CSS Styling**

   - Responsive layout for different screen sizes
   - Game board and UI element styling
   - Transitions and animations for game elements

3. **JavaScript Logic**
   - SignalR connection management
   - Canvas rendering engine
   - Input handling (keyboard and touch)
   - Game state management
   - UI updates and animations

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
- State management

### 4.2 Input System

- Keyboard input handler (WASD + Arrow keys)
- Touch input handler (swipe + on-screen controls)
- Input state management
- Cross-platform input normalization

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
