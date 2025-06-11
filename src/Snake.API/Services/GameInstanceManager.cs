using System.Collections.Concurrent;
using Snake.Domain.GameEngine;
using Microsoft.Extensions.Logging;

namespace Snake.API.Services;

/// <summary>
/// Manages individual game instances for each connected player
/// </summary>
public interface IGameInstanceManager
{
    IGameEngine GetGameInstance(string connectionId);
    void RemoveGameInstance(string connectionId);
    IEnumerable<KeyValuePair<string, IGameEngine>> GetAllActiveGames();
    bool HasGameInstance(string connectionId);
}

public class GameInstanceManager : IGameInstanceManager
{
    private readonly ConcurrentDictionary<string, IGameEngine> _gameInstances = new();
    private readonly ILoggerFactory _loggerFactory;
    private readonly ILogger<GameInstanceManager> _logger;

    public GameInstanceManager(ILoggerFactory loggerFactory, ILogger<GameInstanceManager> logger)
    {
        _loggerFactory = loggerFactory;
        _logger = logger;
    }

    public IGameEngine GetGameInstance(string connectionId)
    {
        return _gameInstances.GetOrAdd(connectionId, id =>
        {
            _logger.LogInformation("Creating new game instance for connection {ConnectionId}", id);
            var gameLogger = _loggerFactory.CreateLogger<GameEngine>();
            return new GameEngine(gameLogger);
        });
    }

    public void RemoveGameInstance(string connectionId)
    {
        if (_gameInstances.TryRemove(connectionId, out var gameInstance))
        {
            _logger.LogInformation("Removed game instance for connection {ConnectionId}", connectionId);
        }
    }

    public IEnumerable<KeyValuePair<string, IGameEngine>> GetAllActiveGames()
    {
        return _gameInstances.ToList();
    }

    public bool HasGameInstance(string connectionId)
    {
        return _gameInstances.ContainsKey(connectionId);
    }
}