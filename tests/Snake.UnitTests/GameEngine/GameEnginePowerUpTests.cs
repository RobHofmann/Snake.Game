using System;
using System.Collections.Generic;
using Xunit;
using FluentAssertions;
using Snake.Domain.GameEngine;
using GameEngineClass = Snake.Domain.GameEngine.GameEngine;

namespace Snake.UnitTests.GameEngine;

public class GameEnginePowerUpTests
{
    [Fact]
    public void GameEngine_ShouldSpawnPowerUpsWithinLimits()
    {
        // Arrange
        var engine = new GameEngineClass();
        engine.Initialize(20, 20);

        // Act - Run multiple updates to allow power-ups to spawn
        for (int i = 0; i < 100; i++)
        {
            engine.Update(100); // 100ms per update
        }        // Assert
        engine.PowerUps.Count.Should().BeLessOrEqualTo(2); // Max 2 power-ups as per specification
    }

    [Fact]
    public void GameEngine_PowerUpCollision_ShouldTriggerEffect()
    {
        // Arrange
        var engine = new GameEngineClass();
        engine.Initialize(20, 20);

        // Use reflection to add a power-up directly in the snake's path
        var snakeHead = engine.Snake[0];
        var powerUpPosition = snakeHead + Direction.Right.ToPosition();

        typeof(GameEngineClass)
            .GetField("_powerUps", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
            ?.SetValue(engine, new List<PowerUp> { new PowerUp(PowerUpType.Shield, powerUpPosition) });

        // Act
        engine.Update(100); // Move snake into power-up

        // Assert
        engine.IsShieldActive.Should().BeTrue();
        engine.PowerUps.Should().BeEmpty(); // Power-up should be consumed
    }

    [Fact]
    public void GameEngine_SpeedBoost_ShouldAffectMovementSpeed()
    {
        // Arrange
        var engine = new GameEngineClass();
        engine.Initialize(20, 20);

        // Add speed boost power-up
        var snakeHead = engine.Snake[0];
        var powerUpPosition = snakeHead + Direction.Right.ToPosition();

        typeof(GameEngineClass)
            .GetField("_powerUps", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
            ?.SetValue(engine, new List<PowerUp> { new PowerUp(PowerUpType.SpeedBoost, powerUpPosition) });

        // Act
        engine.Update(100); // Move snake into power-up

        // Assert
        engine.SpeedMultiplier.Should().BeGreaterThan(1.0f);
    }

    [Fact]
    public void GameEngine_ShrinkPowerUp_ShouldReduceSnakeLength()
    {
        // Arrange
        var engine = new GameEngineClass();
        engine.Initialize(20, 20);

        // Grow snake by collecting food
        var initialLength = engine.Snake.Count;
        for (int i = 0; i < 5; i++)
        {
            typeof(GameEngineClass)
                .GetField("_food", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                ?.SetValue(engine, engine.Snake[0] + Direction.Right.ToPosition());
            engine.Update(100);
        }

        var grownLength = engine.Snake.Count;
        grownLength.Should().BeGreaterThan(initialLength);

        // Add shrink power-up
        var snakeHead = engine.Snake[0];
        var powerUpPosition = snakeHead + Direction.Right.ToPosition();

        typeof(GameEngineClass)
            .GetField("_powerUps", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
            ?.SetValue(engine, new List<PowerUp> { new PowerUp(PowerUpType.Shrink, powerUpPosition) });

        // Act
        engine.Update(100); // Move snake into power-up        // Assert
        engine.Snake.Count.Should().BeLessThan(grownLength);
        engine.Snake.Count.Should().BeGreaterOrEqualTo(3); // Never shrink below minimum length
    }

    [Fact]
    public void GameEngine_PowerUpEffects_ShouldExpire()
    {
        // Arrange
        var engine = new GameEngineClass();
        engine.Initialize(20, 20);

        // Add shield power-up
        var snakeHead = engine.Snake[0];
        var powerUpPosition = snakeHead + Direction.Right.ToPosition();
        var shield = new PowerUp(PowerUpType.Shield, powerUpPosition);

        typeof(GameEngineClass)
            .GetField("_powerUps", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
            ?.SetValue(engine, new List<PowerUp> { shield });

        // Act
        engine.Update(100); // Collect power-up
        engine.IsShieldActive.Should().BeTrue();

        // Fast forward time
        typeof(PowerUp)
            .GetProperty(nameof(PowerUp.ActivationTime))
            ?.SetValue(shield, DateTime.UtcNow.AddSeconds(-11)); // Shield lasts 10 seconds

        engine.Update(100); // Update to process expired effect

        // Assert
        engine.IsShieldActive.Should().BeFalse();
    }
}
