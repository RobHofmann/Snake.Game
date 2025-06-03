using System;

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

    public PowerUpType Type { get; private set; }
    public Position Position { get; private set; }
    public DateTime SpawnTime { get; private set; }
    public DateTime ExpireTime { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime? ActivationTime { get; private set; }
    public DateTime? DeactivationTime { get; private set; }
    public bool IsExpired => DateTime.UtcNow > ExpireTime;

    public bool IsActiveEffect =>
        IsActive && ActivationTime.HasValue &&
        (DeactivationTime == null || DateTime.UtcNow < DeactivationTime.Value);

    public int DisappearTimeInSeconds
    {
        get
        {
            return Type switch
            {
                PowerUpType.SpeedBoost => _random.Next(5, 16),    // 5-15 seconds
                PowerUpType.Shield => _random.Next(8, 21),        // 8-20 seconds
                PowerUpType.DoublePoints => _random.Next(10, 26), // 10-25 seconds
                PowerUpType.Shrink => _random.Next(3, 11),        // 3-10 seconds
                _ => 10
            };
        }
    }
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
    }

    public PowerUp(PowerUpType type, Position position)
    {
        Type = type;
        Position = position;
        SpawnTime = DateTime.UtcNow;
        ExpireTime = SpawnTime.AddSeconds(DisappearTimeInSeconds);
        IsActive = false;
    }

    public void Activate()
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
    }

    public void Deactivate()
    {
        IsActive = false;
    }

    public double RemainingEffectTimePercentage
    {
        get
        {
            if (!IsActive || !ActivationTime.HasValue || !DeactivationTime.HasValue)
                return 0;

            var now = DateTime.UtcNow;
            if (now >= DeactivationTime.Value)
                return 0;

            var totalDuration = (DeactivationTime.Value - ActivationTime.Value).TotalMilliseconds;
            var remaining = (DeactivationTime.Value - now).TotalMilliseconds;

            return Math.Clamp(remaining / totalDuration, 0, 1);
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
}
