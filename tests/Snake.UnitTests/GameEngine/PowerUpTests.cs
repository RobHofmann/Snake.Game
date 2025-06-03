using System;
using Xunit;
using FluentAssertions;
using Snake.Domain.GameEngine;

namespace Snake.UnitTests.GameEngine;

public class PowerUpTests
{
    [Fact]
    public void PowerUp_ShouldExpireAfterSpecifiedTime()
    {
        // Arrange
        var position = new Position(5, 5);
        var powerUp = new PowerUp(PowerUpType.SpeedBoost, position);

        // Act & Assert
        powerUp.IsExpired.Should().BeFalse();

        // Fast forward time by simulating maximum disappear time
        var expireTime = powerUp.ExpireTime;
        ((Action)(() =>
        {
            typeof(PowerUp)
                .GetProperty(nameof(PowerUp.SpawnTime))
                ?.SetValue(powerUp, expireTime.AddSeconds(-20));
        }))
        .Should().NotThrow();

        powerUp.IsExpired.Should().BeTrue();
    }

    [Fact]
    public void PowerUp_EffectDuration_ShouldMatchSpecification()
    {
        var speedBoost = new PowerUp(PowerUpType.SpeedBoost, new Position(0, 0));
        var shield = new PowerUp(PowerUpType.Shield, new Position(0, 0));
        var doublePoints = new PowerUp(PowerUpType.DoublePoints, new Position(0, 0));
        var shrink = new PowerUp(PowerUpType.Shrink, new Position(0, 0));

        speedBoost.EffectDurationInSeconds.Should().Be(5);
        shield.EffectDurationInSeconds.Should().Be(3);
        doublePoints.EffectDurationInSeconds.Should().Be(10);
        shrink.EffectDurationInSeconds.Should().Be(0); // Instant effect
    }

    [Fact]
    public void PowerUp_Colors_ShouldMatchSpecification()
    {
        var speedBoost = new PowerUp(PowerUpType.SpeedBoost, new Position(0, 0));
        var shield = new PowerUp(PowerUpType.Shield, new Position(0, 0));
        var doublePoints = new PowerUp(PowerUpType.DoublePoints, new Position(0, 0));
        var shrink = new PowerUp(PowerUpType.Shrink, new Position(0, 0));

        speedBoost.Color.Should().Be("#0080FF"); // Blue neon
        shield.Color.Should().Be("#FFFF00"); // Yellow neon
        doublePoints.Color.Should().Be("#FF00FF"); // Pink neon
        shrink.Color.Should().Be("#39FF14"); // Green neon
    }

    [Fact]
    public void PowerUp_Activation_ShouldSetCorrectTimes()
    {
        // Arrange
        var powerUp = new PowerUp(PowerUpType.SpeedBoost, new Position(0, 0));

        // Act
        powerUp.Activate();

        // Assert
        powerUp.IsActive.Should().BeTrue();
        powerUp.ActivationTime.Should().NotBeNull();
        powerUp.DeactivationTime.Should().NotBeNull();
        powerUp.DeactivationTime.Value.Should().BeCloseTo(
            powerUp.ActivationTime.Value.AddSeconds(powerUp.EffectDurationInSeconds),
            TimeSpan.FromMilliseconds(100));
    }

    [Fact]
    public void PowerUp_ShrinkEffect_ShouldHaveInstantDeactivation()
    {
        // Arrange
        var powerUp = new PowerUp(PowerUpType.Shrink, new Position(0, 0));

        // Act
        powerUp.Activate();

        // Assert
        powerUp.IsActive.Should().BeTrue();
        powerUp.ActivationTime.Should().NotBeNull();
        powerUp.DeactivationTime.Should().NotBeNull();
        powerUp.ActivationTime.Should().Be(powerUp.DeactivationTime);
    }

    [Fact]
    public void PowerUp_RemainingEffectTime_ShouldBeAccurate()
    {
        // Arrange
        var powerUp = new PowerUp(PowerUpType.SpeedBoost, new Position(0, 0));
        powerUp.Activate();

        // Act & Assert - Check initial percentage
        powerUp.RemainingEffectTimePercentage.Should().BeApproximately(1.0, 0.1);

        // Fast forward time by 2.5 seconds (half of 5 second duration)
        ((Action)(() =>
        {
            typeof(PowerUp)
                .GetProperty(nameof(PowerUp.ActivationTime))
                ?.SetValue(powerUp, DateTime.UtcNow.AddSeconds(-2.5));
        }))
        .Should().NotThrow();

        // Should be approximately 50% remaining
        powerUp.RemainingEffectTimePercentage.Should().BeApproximately(0.5, 0.1);
    }
}
