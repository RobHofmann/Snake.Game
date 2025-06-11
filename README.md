# Snake Game

A modern implementation of the classic Snake game with power-ups, built with .NET 8 and SignalR for real-time gameplay.

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- A modern web browser (Chrome, Firefox, Edge, etc.)

### Running the Game

The game consists of two parts that need to be running simultaneously:

1. **API Server** (handles game logic and SignalR communication)
2. **Web Frontend** (serves the game interface)

#### Option 1: Running from Command Line

1. Start the API server:

```powershell
cd src/Snake.API
dotnet run --urls="http://localhost:5075"
```

2. In a new terminal, start the web frontend:

```powershell
cd src/Snake.Web
dotnet run --urls="http://localhost:5080"
```

3. Open your browser and navigate to:
   - Game URL: http://localhost:5080

#### Multiplayer Support

The game now supports **multiple concurrent players**:

- Open multiple browser tabs/windows to the same URL
- Each player gets their own independent game instance
- Players can start, pause, and play at different times without interfering with each other
- Each player maintains their own score and game progress
- Perfect for testing or playing with friends on the same network

#### Option 2: Running from Visual Studio

1. Open `Snake.Game.sln` in Visual Studio
2. Right-click on the Solution in Solution Explorer
3. Select "Set Startup Projects..."
4. Choose "Multiple startup projects"
5. Set both `Snake.API` and `Snake.Web` to "Start"
6. Press F5 or click the "Start" button

### Playing the Game

- Press Space to start
- Use Arrow keys or WASD to control the snake
- Collect food (red dots) to grow and score points
- Look for power-ups:
  - 🔵 Blue neon: Speed Boost
  - 💛 Yellow neon: Shield (protects from collisions)
  - 💖 Pink neon: Double Points
  - 💚 Green neon: Shrink (reduces length)
- Press Space to pause/resume
- Game ends if you collide with walls or yourself (unless shielded)

## Development Environment Setup

### VS Code

1. Install recommended extensions:

   - C# Dev Kit
   - JavaScript Debugger
   - Live Server
   - Thunder Client (for API testing)

2. Open workspace settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "ms-dotnettools.csharp"
}
```

3. Configure launch profiles (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "API",
      "type": "coreclr",
      "request": "launch",
      "program": "${workspaceFolder}/src/Snake.API/bin/Debug/net8.0/Snake.API.dll",
      "args": ["--urls", "http://localhost:5075"],
      "cwd": "${workspaceFolder}/src/Snake.API",
      "stopAtEntry": false,
      "env": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    },
    {
      "name": "Web",
      "type": "coreclr",
      "request": "launch",
      "program": "${workspaceFolder}/src/Snake.Web/bin/Debug/net8.0/Snake.Web.dll",
      "args": ["--urls", "http://localhost:5080"],
      "cwd": "${workspaceFolder}/src/Snake.Web",
      "stopAtEntry": false,
      "env": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  ],
  "compounds": [
    {
      "name": "API + Web",
      "configurations": ["API", "Web"]
    }
  ]
}
```

### Visual Studio

1. Install workloads:

   - ASP.NET and web development
   - .NET desktop development

2. Install extensions:

   - Web Essentials
   - SignalR Monitor

3. Configure user secrets (optional):

```powershell
dotnet user-secrets init --project src/Snake.API
dotnet user-secrets init --project src/Snake.Web
```

## Development

### Building

```powershell
dotnet build Snake.Game.sln
```

### Running Tests

```powershell
dotnet test Snake.Game.sln
```

## Project Structure

- `src/Snake.API` - Backend API and SignalR hub
- `src/Snake.Web` - Frontend web application
- `src/Snake.Domain` - Core game logic and entities
- `tests/` - Unit, integration, and functional tests

## Configuration

- API runs on port 5075 by default
- Web frontend runs on port 5080 by default
- These can be changed in:
  - API: `src/Snake.API/Properties/launchSettings.json`
  - Web: `src/Snake.Web/Properties/launchSettings.json`

## Troubleshooting

1. **SignalR Connection Issues**

   - Ensure both API and Web projects are running
   - Check browser console for errors
   - Verify CORS settings in `Snake.API/Program.cs`

2. **Game Not Loading**

   - Verify both servers are running
   - Check browser console for JavaScript errors
   - Clear browser cache and reload

3. **Build Errors**
   - Run `dotnet restore` to restore packages
   - Check for any missing dependencies
   - Verify .NET 8 SDK is installed

For more detailed information, see:

- [Architecture Documentation](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Testing Strategy](docs/TESTING.md)
