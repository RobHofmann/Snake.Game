using Microsoft.AspNetCore.SignalR;
using Snake.Domain.GameEngine;
using Snake.API.Services;

namespace Snake.API.Hubs;

public class GameHub : Hub
{
    private readonly IGameInstanceManager _gameInstanceManager;
    private readonly ILogger<GameHub> _logger;

    public GameHub(IGameInstanceManager gameInstanceManager, ILogger<GameHub> logger)
    {
        _gameInstanceManager = gameInstanceManager;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Player connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Player disconnected: {ConnectionId}", Context.ConnectionId);
        _gameInstanceManager.RemoveGameInstance(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task StartGame()
    {
        var gameEngine = _gameInstanceManager.GetGameInstance(Context.ConnectionId);
        gameEngine.Initialize(30, 30);
        _logger.LogInformation("Game started for player: {ConnectionId}", Context.ConnectionId);
        await BroadcastGameStateToPlayer(gameEngine);
    }

    public async Task PauseGame()
    {
        var gameEngine = _gameInstanceManager.GetGameInstance(Context.ConnectionId);
        if (gameEngine.State == GameState.Playing)
        {
            gameEngine.TogglePause();
            await BroadcastGameStateToPlayer(gameEngine);
        }
    }

    public async Task ResumeGame()
    {
        var gameEngine = _gameInstanceManager.GetGameInstance(Context.ConnectionId);
        if (gameEngine.State == GameState.Paused)
        {
            gameEngine.TogglePause();
            await BroadcastGameStateToPlayer(gameEngine);
        }
    }

    public async Task ChangeDirection(string direction)
    {
        var gameEngine = _gameInstanceManager.GetGameInstance(Context.ConnectionId);
        if (Enum.TryParse<Direction>(direction, true, out var dir))
        {
            gameEngine.ChangeDirection(dir);
            await BroadcastGameStateToPlayer(gameEngine);
        }
    }
    public async Task HandleInput(string key)
    {
        var gameEngine = _gameInstanceManager.GetGameInstance(Context.ConnectionId);

        if (gameEngine.State == GameState.GameOver || string.IsNullOrEmpty(key))
            return;

        key = key.ToLower();

        bool handled = false;
        if (key == " ")
        {
            gameEngine.TogglePause();
            handled = true;
        }
        else
        {
            handled = key switch
            {
                "arrowup" or "w" => gameEngine.ChangeDirection(Direction.Up),
                "arrowdown" or "s" => gameEngine.ChangeDirection(Direction.Down),
                "arrowleft" or "a" => gameEngine.ChangeDirection(Direction.Left),
                "arrowright" or "d" => gameEngine.ChangeDirection(Direction.Right),
                _ => false
            };
        }

        if (handled)
        {
            await BroadcastGameStateToPlayer(gameEngine);
        }
    }

    private async Task BroadcastGameStateToPlayer(IGameEngine gameEngine)
    {
        await Clients.Caller.SendAsync("UpdateGameState", new
        {
            BoardSize = gameEngine.BoardSize,
            Snake = gameEngine.Snake,
            Food = gameEngine.Food,
            Score = gameEngine.Score,
            GameState = gameEngine.State.ToString(),
            PowerUps = gameEngine.PowerUps,
            ActivePowerUpEffects = gameEngine.ActivePowerUpEffects,
            IsShieldActive = gameEngine.IsShieldActive,
            IsDoublePointsActive = gameEngine.IsDoublePointsActive,
            SpeedMultiplier = gameEngine.SpeedMultiplier
        });
    }
}
