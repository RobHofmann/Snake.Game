using Microsoft.AspNetCore.SignalR;
using Snake.API.Hubs;
using Snake.Domain.GameEngine;
using System.Diagnostics;

namespace Snake.API.Services;

public class GameService : BackgroundService
{
    private readonly IGameInstanceManager _gameInstanceManager;
    private readonly IHubContext<GameHub> _hubContext;
    private readonly ILogger<GameService> _logger;
    private readonly Stopwatch _stopwatch = new();
    private float _previousFrameTime;

    public GameService(
        IGameInstanceManager gameInstanceManager,
        IHubContext<GameHub> hubContext,
        ILogger<GameService> logger)
    {
        _gameInstanceManager = gameInstanceManager;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Game service started");
        _stopwatch.Start();
        _previousFrameTime = _stopwatch.ElapsedMilliseconds;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Calculate delta time
                var currentTime = _stopwatch.ElapsedMilliseconds;
                var deltaTime = currentTime - _previousFrameTime;
                _previousFrameTime = currentTime;

                // Update all active game instances
                var activeGames = _gameInstanceManager.GetAllActiveGames().ToList();
                
                if (activeGames.Any())
                {
                    _logger.LogDebug("Updating {GameCount} active game instances", activeGames.Count);
                }
                
                foreach (var (connectionId, gameEngine) in activeGames)
                {
                    // Update game state
                    if (gameEngine.State == GameState.Playing && gameEngine.Update(deltaTime))
                    {
                        // Broadcast updated state to the specific client
                        await BroadcastGameStateToPlayer(connectionId, gameEngine);
                    }
                    else if (gameEngine.State != GameState.Playing)
                    {
                        // Broadcast state changes even when not actively playing (less frequently)
                        if (currentTime % 1000 < 16) // Only broadcast once per second
                        {
                            await BroadcastGameStateToPlayer(connectionId, gameEngine);
                        }
                    }
                }

                // Throttle updates to avoid overloading clients (60 FPS max)
                await Task.Delay(16, stoppingToken); // ~60 FPS
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in game loop");
                await Task.Delay(1000, stoppingToken); // Wait before retrying
            }
        }

        _logger.LogInformation("Game service stopped");
    }

    private async Task BroadcastGameStateToPlayer(string connectionId, IGameEngine gameEngine)
    {
        try
        {
            await _hubContext.Clients.Client(connectionId).SendAsync("UpdateGameState", new
            {
                BoardSize = gameEngine.BoardSize,
                Snake = gameEngine.Snake,
                Food = gameEngine.Food,
                PowerUps = gameEngine.PowerUps,
                ActivePowerUpEffects = gameEngine.ActivePowerUpEffects,
                Score = gameEngine.Score,
                GameState = gameEngine.State.ToString(),
                IsShieldActive = gameEngine.IsShieldActive,
                IsDoublePointsActive = gameEngine.IsDoublePointsActive,
                SpeedMultiplier = gameEngine.SpeedMultiplier
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error broadcasting game state to player {ConnectionId}", connectionId);
            
            // If we can't reach the client, remove their game instance
            _gameInstanceManager.RemoveGameInstance(connectionId);
        }
    }
}