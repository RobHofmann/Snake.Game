using Bunit;
using FluentAssertions;
using Microsoft.AspNetCore.Components;
using Snake.Application.Components;
using Snake.Domain.GameEngine;
using Xunit;

namespace Snake.UnitTests.Components;

public class SnakeGameTests : TestContext
{
    [Fact]
    public void SnakeGame_ShouldRenderInitialState()
    {
        // Act
        var component = RenderComponent<SnakeGame>();

        // Assert
        component.Find(".snake-game").Should().NotBeNull();
        component.Find(".score").TextContent.Should().Be("Score: 0");
        component.FindAll("rect").Count.Should().BeGreaterThan(0); // At least the background rect
        component.Find("circle").Should().NotBeNull(); // Food should be present
    }

    [Fact]
    public void SnakeGame_WhenGameEnds_ShouldShowGameOver()
    {
        // Arrange
        var component = RenderComponent<SnakeGame>();
        var gameEngine = new GameEngine();
        gameEngine.Initialize(30, 20);

        // Simulate game over by moving into wall
        while (gameEngine.State == GameState.Playing)
        {
            gameEngine.Update(1000);
        }

        // Force component to re-render
        component.Render();

        // Assert
        var gameOver = component.Find(".game-over");
        gameOver.Should().NotBeNull();
        gameOver.TextContent.Should().Contain("Game Over!");
    }

    [Fact]
    public void SnakeGame_WhenPauseButtonClicked_ShouldTogglePauseState()
    {
        // Arrange
        var component = RenderComponent<SnakeGame>();

        // Act
        var button = component.Find("button");
        button.Click();

        // Assert
        button.TextContent.Trim().Should().Be("Resume");
    }
}
