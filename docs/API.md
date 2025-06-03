# API Documentation - Snake Game

**Date: June 4, 2025**

## 1. Overview

This document details the API endpoints for the Snake Game backend, implemented using ASP.NET Core Web API and SignalR for real-time communication.

## 2. Base URL

```
https://app-snake-api-{env}.azurewebsites.net
```

Where `{env}` is one of: `dev`, `tst`, `acc`, `prd`

## 3. Authentication

### 3.1 Authentication Method

- Bearer Token Authentication using Microsoft.Identity.Web
- Azure AD B2C for user authentication
- Rate limiting applied at the API Gateway level

### 3.2 Security Headers

```http
Authorization: Bearer {token}
Content-Type: application/json
```

## 4. API Endpoints

### 4.1 REST Endpoints

#### Submit Score

```http
POST /api/v1/scores
Content-Type: application/json
Authorization: Bearer {token}
```

Request Body:

```json
{
  "value": 1500,
  "playTime": 180,
  "powerUpsCollected": 3,
  "gameplayHash": "a1b2c3d4...",
  "replayData": {
    "moves": ["UP", "RIGHT", "DOWN"],
    "foodPositions": [
      [1, 1],
      [3, 4],
      [5, 2]
    ],
    "powerUpCollections": [
      {
        "type": "SPEED_BOOST",
        "timestamp": 45
      }
    ]
  }
}
```

Response (201 Created):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "rank": 42,
  "value": 1500,
  "verified": true,
  "timestamp": "2025-05-30T14:30:00Z"
}
```

#### Get High Scores

```http
GET /scores/top?period={period}&page={page}&pageSize={pageSize}
```

Parameters:

- `period`: Optional. Values: `all`, `daily`, `weekly`, `monthly`. Default: `all`
- `page`: Optional. Default: 1
- `pageSize`: Optional. Default: 20, Max: 100

Response (200 OK):

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "playerName": "ACE",
      "value": 2500,
      "timestamp": "2025-05-30T14:30:00Z",
      "rank": 1
    }
  ],
  "totalItems": 1000,
  "page": 1,
  "pageSize": 20,
  "totalPages": 50
}
```

#### Get Player's Scores

```http
GET /scores/player
Authorization: Bearer {token}
```

Parameters:

- `page`: Optional. Default: 1
- `pageSize`: Optional. Default: 20, Max: 100

Response (200 OK):

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "value": 2500,
      "timestamp": "2025-05-30T14:30:00Z",
      "rank": 42,
      "powerUpsCollected": 3,
      "playTime": 180
    }
  ],
  "totalItems": 50,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

### 4.2 SignalR Endpoints

The game uses SignalR for real-time communication between the client and server.

#### Connection

```
SignalR Hub URL: /gamehub
```

#### Client Methods (JavaScript)

Methods that can be called from the client:

```javascript
// Start a new game
connection.invoke("StartGame");

// Pause the current game
connection.invoke("PauseGame");

// Resume a paused game
connection.invoke("ResumeGame");

// Change the snake's direction
// direction: "Up", "Down", "Left", "Right"
connection.invoke("ChangeDirection", direction);

// Handle keyboard input
// key: key code from keyboard event
connection.invoke("HandleInput", key);
```

#### Server Methods (C#)

Methods on the server that handle client requests:

```csharp
// Start a new game
public async Task StartGame()

// Pause the current game
public async Task PauseGame()

// Resume a paused game
public async Task ResumeGame()

// Change the snake's direction
public async Task ChangeDirection(string direction)

// Handle keyboard input
public async Task HandleInput(string key)
```

#### Server-to-Client Events

Events that the server sends to connected clients:

```javascript
// Listen for updated game state
connection.on("UpdateGameState", (gameState) => {
  // gameState contains:
  // - BoardSize: { width, height }
  // - Snake: array of position objects
  // - Food: position object { x, y }
  // - PowerUps: array of power-up objects with position, type, color, expiration
  // - Score: current score value
  // - GameState: current state string ("Ready", "Playing", "Paused", "GameOver")
  // - IsShieldActive: boolean for shield power-up status
  // - IsDoublePointsActive: boolean for double points power-up status  
  // - SpeedMultiplier: current speed multiplier from speed boost
});

// Listen for game over event
connection.on("GameOver", (finalScore) => {
  // Handle game over
});
```

### 4.3 Leaderboard

#### Get Current Leaderboard

```http
GET /leaderboard?type={type}
```

Parameters:

- `type`: Required. Values: `daily`, `weekly`, `monthly`, `allTime`

Response (200 OK):

```json
{
  "type": "weekly",
  "start": "2025-05-24T00:00:00Z",
  "end": "2025-05-30T23:59:59Z",
  "scores": [
    {
      "rank": 1,
      "playerName": "ACE",
      "value": 2500,
      "timestamp": "2025-05-30T14:30:00Z"
    }
  ],
  "totalPlayers": 150
}
```

### 4.3 Player Profile

#### Get Profile

```http
GET /profile
Authorization: Bearer {token}
```

Response (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "ACE",
  "highScore": 2500,
  "totalGames": 42,
  "achievements": [
    {
      "id": "SPEED_MASTER",
      "name": "Speed Master",
      "description": "Collect 50 speed power-ups",
      "progress": 35,
      "target": 50
    }
  ]
}
```

#### Update Profile

```http
PATCH /profile
Authorization: Bearer {token}
Content-Type: application/json
```

Request Body:

```json
{
  "name": "PRO"
}
```

Response (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "PRO",
  "updated": "2025-05-30T14:30:00Z"
}
```

## 5. Models

### 5.1 Score Submission Model

```csharp
public class ScoreSubmission
{
    public int Value { get; set; }
    public int PlayTime { get; set; }
    public int PowerUpsCollected { get; set; }
    public string GameplayHash { get; set; }
    public ReplayData ReplayData { get; set; }
}

public class ReplayData
{
    public List<string> Moves { get; set; }
    public List<int[]> FoodPositions { get; set; }
    public List<PowerUpCollection> PowerUpCollections { get; set; }
}

public class PowerUpCollection
{
    public string Type { get; set; }
    public int Timestamp { get; set; }
}
```

### 5.2 Leaderboard Entry Model

```csharp
public class LeaderboardEntry
{
    public int Rank { get; set; }
    public string PlayerName { get; set; }
    public int Value { get; set; }
    public DateTime Timestamp { get; set; }
}
```

## 6. Rate Limiting

| Endpoint           | Rate Limit   | Window     |
| ------------------ | ------------ | ---------- |
| POST /scores       | 30 requests  | Per hour   |
| GET /scores/\*     | 120 requests | Per minute |
| GET /leaderboard   | 60 requests  | Per minute |
| GET/PATCH /profile | 30 requests  | Per minute |

## 7. Error Responses

### 7.1 Standard Error Format

```json
{
  "code": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {
    "field": ["Validation error message"]
  },
  "traceId": "00-4bf92f3577b34da6a3ce929163628e0f-00f067aa0ba902b7-01"
}
```

### 7.2 Common Error Codes

| HTTP Status | Code              | Description               |
| ----------- | ----------------- | ------------------------- |
| 400         | INVALID_REQUEST   | Request validation failed |
| 401         | UNAUTHORIZED      | Authentication required   |
| 403         | FORBIDDEN         | Insufficient permissions  |
| 404         | NOT_FOUND         | Resource not found        |
| 409         | CONFLICT          | Resource conflict         |
| 429         | TOO_MANY_REQUESTS | Rate limit exceeded       |
| 500         | SERVER_ERROR      | Internal server error     |

## 8. API Versioning

- API version is included in the URL path: `/api/v1/`
- New versions will be released as `/api/v2/`, etc.
- Old versions will be supported for 6 months after a new version is released

## 9. Development Tools

### 9.1 Swagger/OpenAPI

- Development Environment: `https://app-snake-api-dev.azurewebsites.net/swagger`
- Interactive API documentation and testing interface
- OpenAPI specification available at `/swagger/v1/swagger.json`

### 9.2 Postman Collection

A Postman collection is available for testing:

- Location: `/docs/postman/snake-game-api.postman_collection.json`
- Environment templates included for all environments

## 10. API Metrics

API performance is monitored through Azure Application Insights:

- Response times
- Request rates
- Error rates
- Dependency performance
- Resource utilization

**Version:** 1.1  
**Last Updated:** June 4, 2025
