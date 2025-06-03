using FluentAssertions;
using Snake.Domain.GameEngine;
using Xunit;

namespace Snake.UnitTests.GameEngine;

public class GameEngineTests
{
    private readonly IGameEngine _engine;
    private const int DefaultWidth = 20;
    private const int DefaultHeight = 20;    public GameEngineTests()
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
        _engine.Update(1000); // 1 second

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
        var initialLength = _engine.Snake.Count;
        var initialScore = _engine.Score;

        // Move snake to food position
        while (_engine.Snake[0] != _engine.Food)
        {
            if (_engine.Snake[0].X < _engine.Food.X)
                _engine.ChangeDirection(Direction.Right);
            else if (_engine.Snake[0].X > _engine.Food.X)
                _engine.ChangeDirection(Direction.Left);
            else if (_engine.Snake[0].Y < _engine.Food.Y)
                _engine.ChangeDirection(Direction.Down);
            else
                _engine.ChangeDirection(Direction.Up);

            _engine.Update(1000);
        }

        // Assert
        _engine.Score.Should().Be(initialScore + 1);
        _engine.Snake.Count.Should().Be(initialLength + 1);
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
        var leftResult = _engine.ChangeDirection(Direction.Left);

        // Assert
        downResult.Should().BeTrue();
        leftResult.Should().BeTrue();
        _engine.CurrentDirection.Should().Be(Direction.Down); // Should change to down immediately

        // Update to process next queued direction
        _engine.Update(1000); // This should move down and then process left direction

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
        var result2 = _engine.ChangeDirection(Direction.Left);
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
