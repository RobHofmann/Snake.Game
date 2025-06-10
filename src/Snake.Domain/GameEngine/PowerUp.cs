using System;
using Microsoft.Extensions.Logging;

namespace Snake.Domain.GameEngine;

public enum PowerUpType
{
    None,
    SpeedBoost,  // Blue neon
    Shield,      // Yellow neon
    DoublePoints, // Pink neon
    Shrink       // Green neon
}

public class PowerUp
{
    private readonly Random _random = new();
    private readonly int _disappearTimeInSeconds;
    private readonly ILogger? _logger;

    public PowerUpType Type { get; private set; }
    public Position Position { get; private set; }
    private DateTime _spawnTime;
    public DateTime SpawnTime
    {
        get => _spawnTime;
        set
        {
            _spawnTime = value;
            ExpireTime = _spawnTime.AddSeconds(_disappearTimeInSeconds);
        }
    }
    private DateTime _expireTime;
    public DateTime ExpireTime
    {
        get => _expireTime;
        private set
        {
            _expireTime = value;
            // No need to update DisappearTimeInSeconds, as it's a computed property
        }
    }
    public bool IsActive { get; private set; }
    private DateTime? _activationTime;
    public DateTime? ActivationTime
    {
        get => _activationTime;
        set
        {
            _activationTime = value;
            if (_activationTime.HasValue)
            {
                if (EffectDurationInSeconds > 0)
                    DeactivationTime = _activationTime.Value.AddSeconds(EffectDurationInSeconds);
                else
                    DeactivationTime = _activationTime;
            }
        }
    }
    public DateTime? DeactivationTime { get; private set; }
    public bool IsExpired => DateTime.UtcNow > ExpireTime;    public bool IsActiveEffect
    {
        get
        {
            var isActive = IsActive && ActivationTime.HasValue &&
                          (DeactivationTime == null || DateTime.UtcNow <= DeactivationTime.Value);
            
            // Log when effect becomes inactive
            if (!isActive && IsActive)
            {
                _logger?.LogDebug("❌ PowerUp {Type} effect EXPIRED | Now: {Now} | DeactivationTime: {DeactivationTime}", 
                    Type, DateTime.UtcNow, DeactivationTime);
            }
            
            return isActive;
        }
    }

    public int DisappearTimeInSeconds => _disappearTimeInSeconds;
    public int EffectDurationInSeconds
    {
        get
        {
            return Type switch
            {
                PowerUpType.SpeedBoost => 15,   // 15 seconds
                PowerUpType.Shield => 10,       // 10 seconds
                PowerUpType.DoublePoints => 20, // 20 seconds
                PowerUpType.Shrink => 0,        // Instant effect
                _ => 0
            };
        }
    }

    public string Color
    {
        get
        {
            return Type switch
            {
                PowerUpType.SpeedBoost => "#0080FF",   // Blue neon
                PowerUpType.Shield => "#FFFF00",       // Yellow neon
                PowerUpType.DoublePoints => "#FF00FF", // Pink neon
                PowerUpType.Shrink => "#39FF14",       // Green neon
                _ => "#FFFFFF"
            };
        }
    }    public PowerUp(PowerUpType type, Position position, int? disappearTimeInSeconds = null, ILogger? logger = null)
    {
        Type = type;
        Position = position;
        _logger = logger;
        _disappearTimeInSeconds = disappearTimeInSeconds ?? type switch
        {
            PowerUpType.SpeedBoost => _random.Next(5, 16),    // 5-15 seconds
            PowerUpType.Shield => _random.Next(8, 21),        // 8-20 seconds
            PowerUpType.DoublePoints => _random.Next(10, 26), // 10-25 seconds
            PowerUpType.Shrink => _random.Next(3, 11),        // 3-10 seconds
            _ => 10
        };
        _spawnTime = DateTime.UtcNow;
        ExpireTime = _spawnTime.AddSeconds(_disappearTimeInSeconds);
        IsActive = false;

        _logger?.LogDebug("🔮 PowerUp {Type} spawned at {Position} | Duration: {Duration}s | Expires: {ExpireTime}", 
            Type, Position, _disappearTimeInSeconds, ExpireTime);
    }    public void Activate()
    {
        IsActive = true;
        ActivationTime = DateTime.UtcNow;
        if (EffectDurationInSeconds > 0)
        {
            DeactivationTime = ActivationTime.Value.AddSeconds(EffectDurationInSeconds);
        }
        else
        {
            // For instant effects like Shrink
            DeactivationTime = ActivationTime;
        }

        _logger?.LogDebug("⚡ PowerUp {Type} ACTIVATED | Duration: {Duration}s | Deactivates: {DeactivationTime}", 
            Type, EffectDurationInSeconds, DeactivationTime);
    }

    public void Deactivate()
    {
        IsActive = false;
        _logger?.LogDebug("🛑 PowerUp {Type} DEACTIVATED | Was active for: {Duration}s", 
            Type, ActivationTime.HasValue ? (DateTime.UtcNow - ActivationTime.Value).TotalSeconds : 0);
    }    public double RemainingEffectTimePercentage
    {
        get
        {
            if (!IsActive || !ActivationTime.HasValue || !DeactivationTime.HasValue)
            {
                _logger?.LogDebug("📊 PowerUp {Type} RemainingEffectTimePercentage: 0 (inactive or missing times)", Type);
                return 0;
            }

            var now = DateTime.UtcNow;
            var totalDuration = (DeactivationTime.Value - ActivationTime.Value).TotalMilliseconds;
            var remaining = (DeactivationTime.Value - now).TotalMilliseconds;
            
            if (totalDuration <= 0) 
            {
                _logger?.LogDebug("📊 PowerUp {Type} RemainingEffectTimePercentage: 0 (zero duration)", Type);
                return 0;
            }

            var percentage = Math.Clamp(remaining / totalDuration, 0, 1);
            
            // Log detailed timing information, especially when percentage is very low
            if (percentage < 0.1) // Log when less than 10% remaining
            {
                _logger?.LogDebug("🔍 PowerUp {Type} CRITICAL TIMING | Percentage: {Percentage:F4} | Remaining: {RemainingMs}ms | Total: {TotalMs}ms | Now: {Now} | Deactivates: {DeactivationTime}", 
                    Type, percentage, remaining, totalDuration, now, DeactivationTime.Value);
            }
            
            return percentage;
        }
    }

    public double RemainingExpirationTimePercentage
    {
        get
        {
            var now = DateTime.UtcNow;
            if (now >= ExpireTime)
                return 0;

            var totalDuration = (ExpireTime - SpawnTime).TotalMilliseconds;
            var remaining = (ExpireTime - now).TotalMilliseconds;

            return Math.Clamp(remaining / totalDuration, 0, 1);
        }
    }

    // For testing: allow setting spawn time and update expire time accordingly
    public void SetSpawnTime(DateTime time)
    {
        SpawnTime = time;
    }
}
