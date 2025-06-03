using System.Collections.Immutable;
using System.Collections.Generic;
using System.Linq;
using System;

namespace Snake.Domain.GameEngine;

public class GameEngine : IGameEngine
{
    private readonly Random _random = new();
    private readonly float _logicUpdateRate = 1000f / 10; // 10 logic updates per second base speed
    private readonly float _renderUpdateRate = 1000f / 60; // 60 FPS target
    private float _logicAccumulator;
    private float _renderAccumulator;
    private List<Position> _snake;
    private Position _food;
    private int _score; private bool _growNextUpdate;
    private List<PowerUp> _powerUps;
    private List<PowerUp> _activePowerUpEffects; // Track active powerup effects separately
    private readonly int _maxPowerUps = 2; // Maximum 2 power-ups on screen as per PRD
    private DateTime _lastPowerUpSpawnTime;
    private bool _isShieldActive;
    private bool _isDoublePointsActive;
    private float _speedMultiplier = 1.0f;
    private readonly TimeSpan _minPowerUpSpawnInterval = TimeSpan.FromSeconds(5);
    private readonly TimeSpan _maxPowerUpSpawnInterval = TimeSpan.FromSeconds(15);
    private TimeSpan _nextPowerUpSpawnInterval;
    private readonly Queue<Direction> _directionQueue = new();
    private const int MaxQueuedDirections = 2; // Allow up to 2 queued direction changes

    public GameState State { get; private set; }
    public int Score => _score;
    public (int Width, int Height) BoardSize { get; private set; }
    public IReadOnlyList<Position> Snake => _snake.AsReadOnly();
    public Position Food => _food;
    public Direction CurrentDirection { get; private set; }
    public float LastFrameTime { get; private set; }
    public IReadOnlyList<PowerUp> PowerUps => _powerUps.AsReadOnly();
    public IReadOnlyList<PowerUp> ActivePowerUpEffects => _activePowerUpEffects.AsReadOnly();
    public bool IsShieldActive => _isShieldActive;
    public bool IsDoublePointsActive => _isDoublePointsActive;
    public float SpeedMultiplier => _speedMultiplier; public GameEngine()
    {
        _snake = new List<Position>();
        _powerUps = new List<PowerUp>();
        _activePowerUpEffects = new List<PowerUp>();
        State = GameState.Ready;
    }

    public void Initialize(int width, int height)
    {
        if (width < 10 || height < 10)
            throw new ArgumentException("Board size must be at least 10x10"); BoardSize = (width, height);
        _snake.Clear();
        _score = 0;
        _logicAccumulator = 0;
        _renderAccumulator = 0; _growNextUpdate = false;
        _powerUps.Clear(); _activePowerUpEffects.Clear();
        _lastPowerUpSpawnTime = DateTime.Now;
        _nextPowerUpSpawnInterval = TimeSpan.FromSeconds(5); // Start with minimum interval
        _directionQueue.Clear(); // Clear any queued directions

        // Reset powerup effects
        _isShieldActive = false;
        _isDoublePointsActive = false;
        _speedMultiplier = 1.0f;

        // Start in the middle, moving right
        var startX = width / 2;
        var startY = height / 2;
        _snake.Add(new Position(startX, startY));
        _snake.Add(new Position(startX - 1, startY));
        _snake.Add(new Position(startX - 2, startY));

        CurrentDirection = Direction.Right;
        SpawnFood();
        SpawnPowerUps();

        State = GameState.Playing;
    }

    /// <summary>
    /// Updates the game state based on the current direction and time delta.
    /// </summary>
    /// <param name="deltaTime">The time elapsed since the last update in milliseconds.</param>
    /// <returns>True if the game state was updated, false if the game is over or paused.</returns>
    public bool Update(float deltaTime)
    {
        if (State != GameState.Playing)
            return false;

        LastFrameTime = deltaTime;        // Update game logic at fixed time steps
        _logicAccumulator += deltaTime;
        while (_logicAccumulator >= _logicUpdateRate)
        {
            if (!UpdateGameLogic())
                return false;
            _logicAccumulator -= _logicUpdateRate;
        }

        return true;
    }
    private bool UpdateGameLogic()
    {
        var currentTickRate = _logicUpdateRate * (1f - (_score * 0.01f)).Clamp(0.5f, 1f);        // Process next queued direction if available
        if (_directionQueue.Count > 0)
        {
            CurrentDirection = _directionQueue.Dequeue();
        }

        var newHead = _snake[0] + CurrentDirection.ToPosition();

        // Check wall and self collisions (skip if shield is active)
        if (!_isShieldActive)
        {
            // Check wall collision
            if (newHead.X < 0 || newHead.X >= BoardSize.Width ||
                newHead.Y < 0 || newHead.Y >= BoardSize.Height)
            {
                State = GameState.GameOver;
                return false;
            }

            // Check self collision
            if (_snake.Contains(newHead))
            {
                State = GameState.GameOver;
                return false;
            }
        }
        else
        {
            // With shield, wrap around walls
            newHead = new Position(
                (newHead.X + BoardSize.Width) % BoardSize.Width,
                (newHead.Y + BoardSize.Height) % BoardSize.Height
            );
        }

        // Move snake
        _snake.Insert(0, newHead);

        // Check food collision
        if (newHead == Food)
        {
            // Base food points (100) with double points multiplier if active
            var basePoints = 100;
            _score += _isDoublePointsActive ? basePoints * 2 : basePoints;

            _growNextUpdate = true;
            SpawnFood();
        }

        if (!_growNextUpdate)
            _snake.RemoveAt(_snake.Count - 1);
        else
            _growNextUpdate = false;

        // Power-up logic
        UpdatePowerUps(currentTickRate);

        return true;
    }
    private void UpdatePowerUps(float currentTickRate)
    {
        // First handle all active power-up effects
        var expiredEffects = _activePowerUpEffects.Where(p => p.IsActive && !p.IsActiveEffect).ToList();
        foreach (var powerUp in expiredEffects)
        {
            DeactivatePowerUp(powerUp);
            _activePowerUpEffects.Remove(powerUp);
        }

        // Then handle existing uncollected power-ups
        for (int i = _powerUps.Count - 1; i >= 0; i--)
        {
            var powerUp = _powerUps[i];

            // Remove power-ups that have expired naturally
            if (powerUp.IsExpired)
            {
                _powerUps.RemoveAt(i);
                continue;
            }            // Check collision with snake head and collect power-up
            if (_snake[0] == powerUp.Position)
            {
                // Award points for collecting power-up (50 base points, doubled if Double Points active)
                var powerUpPoints = 50;
                _score += _isDoublePointsActive ? powerUpPoints * 2 : powerUpPoints;

                // Check if the same powerup type is already active and reset its timer
                var existingEffect = _activePowerUpEffects.FirstOrDefault(p => p.Type == powerUp.Type);
                if (existingEffect != null)
                {
                    // Reset the timer for the existing effect
                    existingEffect.Activate(); // This will reset ActivationTime and DeactivationTime
                }
                else
                {
                    // Activate new powerup
                    ActivatePowerUp(powerUp);

                    // Move to active effects list if it has a duration > 0
                    if (powerUp.EffectDurationInSeconds > 0)
                    {
                        _activePowerUpEffects.Add(powerUp);
                    }
                }

                // Remove from uncollected powerups list
                _powerUps.RemoveAt(i);
            }
        }

        // Finally try to spawn new power-ups if needed
        if (_powerUps.Count < _maxPowerUps && DateTime.Now - _lastPowerUpSpawnTime > _nextPowerUpSpawnInterval)
        {
            SpawnPowerUps();
        }
    }
    private void ActivatePowerUp(PowerUp powerUp)
    {
        powerUp.Activate();

        switch (powerUp.Type)
        {
            case PowerUpType.Shield:
                _isShieldActive = true;
                break;
            case PowerUpType.DoublePoints:
                _isDoublePointsActive = true;
                break;
            case PowerUpType.SpeedBoost:
                _speedMultiplier = 1.5f;
                break;
            case PowerUpType.Shrink:
                // Reduce snake length by 3 segments, but never below 3
                int segmentsToRemove = Math.Min(3, _snake.Count - 3);
                for (int i = 0; i < segmentsToRemove; i++)
                {
                    _snake.RemoveAt(_snake.Count - 1);
                }
                break;
        }
    }

    private void DeactivatePowerUp(PowerUp powerUp)
    {
        powerUp.Deactivate();

        switch (powerUp.Type)
        {
            case PowerUpType.Shield:
                _isShieldActive = false;
                break;
            case PowerUpType.DoublePoints:
                _isDoublePointsActive = false;
                break;
            case PowerUpType.SpeedBoost:
                _speedMultiplier = 1.0f;
                break;
                // Shrink doesn't need deactivation as it's an instant effect
        }
    }
    public bool ChangeDirection(Direction newDirection)
    {
        if (State != GameState.Playing)
            return false;

        // Get the last direction (either current direction or last queued direction)
        var lastDirection = _directionQueue.Count > 0 ? _directionQueue.Last() : CurrentDirection;

        // Don't allow opposite direction to the last direction
        if (newDirection.IsOpposite(lastDirection))
            return false;

        // Prevent duplicate directions in queue
        if (lastDirection == newDirection)
            return false;

        // Add to queue if there's space
        if (_directionQueue.Count < MaxQueuedDirections)
        {
            _directionQueue.Enqueue(newDirection);
            return true;
        }

        return false;
    }

    public void TogglePause()
    {
        if (State == GameState.Playing)
            State = GameState.Paused;
        else if (State == GameState.Paused)
            State = GameState.Playing;
    }

    private void SpawnFood()
    {
        var availablePositions = new List<Position>();
        for (int x = 0; x < BoardSize.Width; x++)
        {
            for (int y = 0; y < BoardSize.Height; y++)
            {
                var pos = new Position(x, y);
                if (!_snake.Contains(pos))
                    availablePositions.Add(pos);
            }
        }

        if (availablePositions.Count == 0)
        {
            State = GameState.GameOver; // Game won!
            return;
        }

        _food = availablePositions[_random.Next(availablePositions.Count)];
    }
    private void SpawnPowerUps()
    {
        // Only spawn if we're under the max limit
        if (_powerUps.Count >= _maxPowerUps)
            return;

        var availablePositions = new List<Position>();
        for (int x = 0; x < BoardSize.Width; x++)
        {
            for (int y = 0; y < BoardSize.Height; y++)
            {
                var pos = new Position(x, y);
                if (!_snake.Contains(pos) && !pos.Equals(Food) && !_powerUps.Any(p => p.Position == pos))
                    availablePositions.Add(pos);
            }
        }

        if (availablePositions.Count == 0)
            return;

        var spawnCount = _random.Next(1, Math.Min(_maxPowerUps - _powerUps.Count + 1, 2));
        for (int i = 0; i < spawnCount; i++)
        {
            if (availablePositions.Count == 0)
                break;

            int posIndex = _random.Next(availablePositions.Count);
            var position = availablePositions[posIndex];
            availablePositions.RemoveAt(posIndex);

            // Pick a random power-up type excluding None
            var powerUpTypes = Enum.GetValues(typeof(PowerUpType))
                .Cast<PowerUpType>()
                .Where(t => t != PowerUpType.None)
                .ToArray();
            var type = powerUpTypes[_random.Next(powerUpTypes.Length)];

            _powerUps.Add(new PowerUp(type, position));
        }

        _lastPowerUpSpawnTime = DateTime.Now;
        _nextPowerUpSpawnInterval = TimeSpan.FromSeconds(
            _random.Next((int)_minPowerUpSpawnInterval.TotalSeconds,
                        (int)_maxPowerUpSpawnInterval.TotalSeconds));
    }
}

internal static class Extensions
{
    public static float Clamp(this float value, float min, float max)
        => value < min ? min : value > max ? max : value;
}
