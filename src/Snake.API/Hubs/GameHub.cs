using Microsoft.AspNetCore.SignalR;
using Snake.Domain.GameEngine;

namespace Snake.API.Hubs;

public class GameHub : Hub
{
    private readonly IGameEngine _gameEngine;
    private readonly IInputHandler _inputHandler;

    public GameHub(IGameEngine gameEngine, IInputHandler inputHandler)
    {
        _gameEngine = gameEngine;
        _inputHandler = inputHandler;
    }

    public async Task StartGame()
    {
        _gameEngine.Initialize(30, 30);
        await BroadcastGameState();
    }

    public async Task PauseGame()
    {
        if (_gameEngine.State == GameState.Playing)
        {
            _gameEngine.TogglePause();
            await BroadcastGameState();
        }
    }

    public async Task ResumeGame()
    {
        if (_gameEngine.State == GameState.Paused)
        {
            _gameEngine.TogglePause();
            await BroadcastGameState();
        }
    }

    public async Task ChangeDirection(string direction)
    {
        if (Enum.TryParse<Direction>(direction, true, out var dir))
        {
            _gameEngine.ChangeDirection(dir);
            await BroadcastGameState();
        }
    }

    public async Task HandleInput(string key)
    {
        _inputHandler.HandleKeyPress(key);
        await BroadcastGameState();
    }
    private async Task BroadcastGameState()
    {
        await Clients.All.SendAsync("UpdateGameState", new
        {
            BoardSize = _gameEngine.BoardSize,
            Snake = _gameEngine.Snake,
            Food = _gameEngine.Food,
            Score = _gameEngine.Score,
            GameState = _gameEngine.State.ToString(),
            PowerUps = _gameEngine.PowerUps,
            IsShieldActive = _gameEngine.IsShieldActive,
            IsDoublePointsActive = _gameEngine.IsDoublePointsActive,
            SpeedMultiplier = _gameEngine.SpeedMultiplier
        });
    }
}
