using FluentAssertions;
using Snake.Domain.GameEngine;
using Xunit;

namespace Snake.UnitTests.GameEngine;

public class InputHandlerTests
{
    private readonly IGameEngine _engine;
    private readonly IInputHandler _inputHandler; public InputHandlerTests()
    {
        _engine = new Snake.Domain.GameEngine.GameEngine();
        _inputHandler = new InputHandler(_engine);
    }
    [Fact]
    public void HandleKeyPress_ArrowKeys_ShouldChangeDirection()
    {
        // Arrange
        _engine.Initialize(20, 20);

        // Act & Assert - Direction changes are queued and applied on next update
        _inputHandler.HandleKeyPress("ArrowUp").Should().BeTrue();
        _engine.Update(100); // Process queued direction
        _engine.CurrentDirection.Should().Be(Direction.Up);

        _inputHandler.HandleKeyPress("ArrowRight").Should().BeTrue();
        _engine.Update(100); // Process queued direction
        _engine.CurrentDirection.Should().Be(Direction.Right);

        _inputHandler.HandleKeyPress("ArrowDown").Should().BeTrue();
        _engine.Update(100); // Process queued direction
        _engine.CurrentDirection.Should().Be(Direction.Down);

        _inputHandler.HandleKeyPress("ArrowLeft").Should().BeTrue();
        _engine.Update(100); // Process queued direction
        _engine.CurrentDirection.Should().Be(Direction.Left);
    }
    [Fact]
    public void HandleKeyPress_WASDKeys_ShouldChangeDirection()
    {
        // Arrange
        _engine.Initialize(20, 20);

        // Act & Assert - Direction changes are queued and applied on next update
        _inputHandler.HandleKeyPress("w").Should().BeTrue();
        _engine.Update(100); // Process queued direction
        _engine.CurrentDirection.Should().Be(Direction.Up);

        _inputHandler.HandleKeyPress("d").Should().BeTrue();
        _engine.Update(100); // Process queued direction
        _engine.CurrentDirection.Should().Be(Direction.Right);

        _inputHandler.HandleKeyPress("s").Should().BeTrue();
        _engine.Update(100); // Process queued direction
        _engine.CurrentDirection.Should().Be(Direction.Down); _inputHandler.HandleKeyPress("a").Should().BeTrue();
        _engine.Update(100); // Process queued direction
        _engine.CurrentDirection.Should().Be(Direction.Left);
    }

    [Fact]
    public void HandleKeyPress_OppositeDirection_ShouldReturnFalse()
    {
        // Arrange
        _engine.Initialize(20, 20); // Snake starts facing right

        // Act & Assert
        _inputHandler.HandleKeyPress("ArrowLeft").Should().BeFalse();
        _engine.CurrentDirection.Should().Be(Direction.Right);
    }

    [Fact]
    public void HandleKeyPress_SpaceBar_ShouldTogglePause()
    {
        // Arrange
        _engine.Initialize(20, 20);
        var initialState = _engine.State;

        // Act
        _inputHandler.HandleKeyPress(" ");

        // Assert
        _engine.State.Should().NotBe(initialState);
        _inputHandler.HandleKeyPress(" ");
        _engine.State.Should().Be(initialState);
    }

    [Fact]
    public void HandleKeyPress_InvalidKey_ShouldReturnFalse()
    {
        // Arrange
        _engine.Initialize(20, 20);
        var initialDirection = _engine.CurrentDirection;

        // Act & Assert
        _inputHandler.HandleKeyPress("InvalidKey").Should().BeFalse();
        _engine.CurrentDirection.Should().Be(initialDirection);
    }
}
