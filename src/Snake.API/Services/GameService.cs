using Microsoft.AspNetCore.SignalR;
using Snake.API.Hubs;
using Snake.Domain.GameEngine;
using System.Diagnostics;

namespace Snake.API.Services;

public class GameService : BackgroundService
{
    private readonly IGameEngine _gameEngine;
    private readonly IHubContext<GameHub> _hubContext;
    private readonly ILogger<GameService> _logger;
    private readonly Stopwatch _stopwatch = new();
    private float _previousFrameTime;

    public GameService(
        IGameEngine gameEngine,
        IHubContext<GameHub> hubContext,
        ILogger<GameService> logger)
    {
        _gameEngine = gameEngine;
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
                _previousFrameTime = currentTime;                // Update game state
                if (_gameEngine.State == GameState.Playing && _gameEngine.Update(deltaTime))
                {
                    // Broadcast updated state to all clients
                    await BroadcastGameState();
                }
                else if (_gameEngine.State != GameState.Playing)
                {
                    // Broadcast state changes even when not actively playing
                    if (currentTime % 1000 < 16) // Only broadcast once per second
                    {
                        await BroadcastGameState();
                    }
                }

                // Throttle updates to avoid overloading clients
                await Task.Delay(16, stoppingToken); // ~60 FPS
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating game state");
                await Task.Delay(1000, stoppingToken); // Wait a bit on error
            }
        }
    }    private async Task BroadcastGameState()
    {
        try
        {
            await _hubContext.Clients.All.SendAsync("UpdateGameState", new
            {
                BoardSize = _gameEngine.BoardSize,
                Snake = _gameEngine.Snake,
                Food = _gameEngine.Food,
                PowerUps = _gameEngine.PowerUps,
                Score = _gameEngine.Score,
                GameState = _gameEngine.State.ToString(),
                IsShieldActive = _gameEngine.IsShieldActive,
                IsDoublePointsActive = _gameEngine.IsDoublePointsActive,
                SpeedMultiplier = _gameEngine.SpeedMultiplier
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error broadcasting game state");
        }
    }
}
