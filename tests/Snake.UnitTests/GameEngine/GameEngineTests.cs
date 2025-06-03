using FluentAssertions;
using Snake.Domain.GameEngine;
using Xunit;

namespace Snake.UnitTests.GameEngine;

public class GameEngineTests
{
    private readonly IGameEngine _engine;
    private const int DefaultWidth = 20;
    private const int DefaultHeight = 20; public GameEngineTests()
    {
        _engine = new Snake.Domain.GameEngine.GameEngine();
    }

    [Fact]
    public void Initialize_ShouldSetCorrectInitialState()
    {
        // Act
        _engine.Initialize(DefaultWidth, DefaultHeight);

        // Assert
        _engine.State.Should().Be(GameState.Playing);
        _engine.BoardSize.Should().Be((DefaultWidth, DefaultHeight));
        _engine.Score.Should().Be(0);
        _engine.Snake.Count.Should().Be(3); // Initial snake length
        _engine.CurrentDirection.Should().Be(Direction.Right);
    }

    [Theory]
    [InlineData(9, 20)]
    [InlineData(20, 9)]
    [InlineData(0, 0)]
    public void Initialize_WithInvalidSize_ShouldThrowArgumentException(int width, int height)
    {
        // Act & Assert
        var action = () => _engine.Initialize(width, height);
        action.Should().Throw<ArgumentException>();
    }
    [Fact]
    public void Update_ShouldMoveSnakeInCurrentDirection()
    {
        // Arrange
        _engine.Initialize(DefaultWidth, DefaultHeight);
        var initialHead = _engine.Snake[0];

        // Act
        _engine.Update(100); // One game tick (100ms at base 10 Hz)

        // Assert
        var newHead = _engine.Snake[0];
        newHead.Should().Be(new Position(initialHead.X + 1, initialHead.Y)); // Moved right
        _engine.Snake.Count.Should().Be(3); // Length unchanged
    }
    [Fact]
    public void Update_WhenCollectingFood_ShouldIncreaseScoreAndLength()
    {
        // Arrange
        _engine.Initialize(DefaultWidth, DefaultHeight);
        // Place food directly in front of the snake to guarantee a safe path
        var head = _engine.Snake[0];
        var foodPos = head + Direction.Right.ToPosition();
        _engine.GetType()
            .GetField("_food", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
            ?.SetValue(_engine, foodPos);
        // Move right into the food
        _engine.ChangeDirection(Direction.Right);
        _engine.Update(100);

        // Assert
        Console.WriteLine($"Snake head: {_engine.Snake[0]}, Food: {_engine.Food}, State: {_engine.State}");
        _engine.State.Should().Be(GameState.Playing, "Game should still be playing when food is collected");
        _engine.Score.Should().Be(100); // Food gives 100 points
        _engine.Snake.Count.Should().Be(4);
    }

    [Fact]
    public void ChangeDirection_ToOppositeDirection_ShouldReturnFalse()
    {
        // Arrange
        _engine.Initialize(DefaultWidth, DefaultHeight);

        // Act & Assert
        _engine.ChangeDirection(Direction.Left).Should().BeFalse();
        _engine.CurrentDirection.Should().Be(Direction.Right);
    }
    [Fact]
    public void ChangeDirection_RapidInputsPrevent180Turn_ShouldQueueDirections()
    {
        // Arrange
        _engine.Initialize(DefaultWidth, DefaultHeight);
        _engine.CurrentDirection.Should().Be(Direction.Right); // Snake starts moving right

        // Act - Simulate rapid inputs: Right -> Down -> Left (should not allow immediate 180)
        var downResult = _engine.ChangeDirection(Direction.Down);
        System.Console.WriteLine($"Down.IsOpposite(Right): {Direction.Down.IsOpposite(Direction.Right)}");
        var leftResult = _engine.ChangeDirection(Direction.Left);
        System.Console.WriteLine($"Left.IsOpposite(Down): {Direction.Left.IsOpposite(Direction.Down)}");

        // Assert
        downResult.Should().BeTrue();
        leftResult.Should().BeTrue();
        _engine.CurrentDirection.Should().Be(Direction.Right); // Still moving right until update

        // Update to process first queued direction (down)
        _engine.Update(100); // One game tick to process down direction
        _engine.CurrentDirection.Should().Be(Direction.Down);

        // Update to process next queued direction (left)
        _engine.Update(100); // One game tick to process left direction

        // After update, snake should be moving left (not crashed)
        _engine.State.Should().Be(GameState.Playing);
        _engine.CurrentDirection.Should().Be(Direction.Left);
    }

    [Fact]
    public void ChangeDirection_QueuedOppositeDirection_ShouldBeIgnored()
    {
        // Arrange
        _engine.Initialize(DefaultWidth, DefaultHeight);

        // Act - Queue down, then try to queue up (opposite to down)
        _engine.ChangeDirection(Direction.Down);
        var oppositeResult = _engine.ChangeDirection(Direction.Up);

        // Assert
        oppositeResult.Should().BeFalse();

        // Update and verify down direction is processed
        _engine.Update(1000);
        _engine.CurrentDirection.Should().Be(Direction.Down);
    }
    [Fact]
    public void ChangeDirection_MaxQueueLimit_ShouldRejectExcessDirections()
    {
        // Arrange
        _engine.Initialize(DefaultWidth, DefaultHeight);

        // Act - Try to queue more than the maximum allowed directions
        var result1 = _engine.ChangeDirection(Direction.Down);
        var result2 = _engine.ChangeDirection(Direction.Right); // Changed from Left to Right to avoid 180-degree turn detection
        var result3 = _engine.ChangeDirection(Direction.Up); // Should be rejected (queue full)

        // Assert
        result1.Should().BeTrue();
        result2.Should().BeTrue();
        result3.Should().BeFalse(); // Should be rejected due to queue limit
    }

    [Fact]
    public void ChangeDirection_DuplicateDirection_ShouldBeIgnored()
    {
        // Arrange
        _engine.Initialize(DefaultWidth, DefaultHeight);

        // Act - Try to queue the same direction twice
        var result1 = _engine.ChangeDirection(Direction.Down);
        var result2 = _engine.ChangeDirection(Direction.Down); // Duplicate

        // Assert
        result1.Should().BeTrue();
        result2.Should().BeFalse(); // Should be rejected as duplicate
    }

    [Fact]
    public void Update_WhenHittingWall_ShouldEndGame()
    {
        // Arrange
        _engine.Initialize(DefaultWidth, DefaultHeight);

        // Move to right wall
        while (_engine.State == GameState.Playing)
        {
            _engine.Update(1000);
        }

        // Assert
        _engine.State.Should().Be(GameState.GameOver);
    }

    [Fact]
    public void Update_WhenHittingSelf_ShouldEndGame()
    {
        // Arrange
        _engine.Initialize(DefaultWidth, DefaultHeight);

        // Create a U-turn to hit self
        _engine.Update(1000); // Move right
        _engine.ChangeDirection(Direction.Down);
        _engine.Update(1000);
        _engine.ChangeDirection(Direction.Left);
        _engine.Update(1000);

        // Assert
        _engine.State.Should().Be(GameState.GameOver);
    }

    [Fact]
    public void TogglePause_ShouldToggleGameState()
    {
        // Arrange
        _engine.Initialize(DefaultWidth, DefaultHeight);

        // Act & Assert
        _engine.State.Should().Be(GameState.Playing);

        _engine.TogglePause();
        _engine.State.Should().Be(GameState.Paused);

        _engine.TogglePause();
        _engine.State.Should().Be(GameState.Playing);
    }
}
