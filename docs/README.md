# Snake Game Project Overview

**Date: June 4, 2025**

## Introduction

The Snake Game is a modern web-based implementation of the classic arcade game, featuring real-time gameplay with a responsive UI suitable for both desktop and mobile devices. The game follows clean architecture principles and is designed for deployment to Azure PaaS services.

## Key Features

- Classic snake gameplay mechanics with responsive controls
- **Multi-player support**: Multiple players can play simultaneously without interference
- Real-time game updates using SignalR with per-connection game instances
- High score tracking and leaderboards
- Power-up system with visual effects and timing indicators
- Responsive design for mobile and desktop play
- Backend based on ASP.NET Core and Clean Architecture

## Technology Stack

### Frontend

- HTML5, CSS3, and vanilla JavaScript
- Canvas-based rendering
- SignalR client for real-time communication

### Backend

- **.NET 8** - Core framework
- **ASP.NET Core** - API and SignalR
- **SignalR** - Real-time communication
- **Entity Framework Core** - Data access

### Infrastructure

- **Azure App Service** - Hosting API and serving static content
- **Azure Cosmos DB** - Storing game data
- **Azure Key Vault** - Managing secrets
- **Azure Application Insights** - Monitoring and telemetry

## Getting Started

### Prerequisites

- .NET 8 SDK
- Visual Studio 2022 or Visual Studio Code
- Azure CLI (for deployment)

### Local Development Setup

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/snake-game.git
   cd snake-game
   ```

2. Build and run the API:

   ```
   cd src/Snake.API
   dotnet run
   ```

3. The game will be accessible at:
   ```
   http://localhost:5075
   ```

## Project Structure

The project follows Clean Architecture principles with the following structure:

```
src/
├── Snake.Domain/          # Core game logic and domain entities
├── Snake.Application/     # Application services and interfaces
├── Snake.Infrastructure/  # External service implementations
├── Snake.Persistence/     # Data access and repositories
├── Snake.API/             # ASP.NET Core Web API and SignalR hubs
└── Snake.Web/             # Frontend HTML, CSS, JavaScript
```

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Documentation

For more detailed information, please refer to:

- [PRD.md](PRD.md) - Product Requirements Document
- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed architecture documentation
- [API.md](API.md) - API documentation
- [INFRASTRUCTURE.md](INFRASTRUCTURE.md) - Infrastructure setup
- [CHANGELOG.md](CHANGELOG.md) - Record of changes and new features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
