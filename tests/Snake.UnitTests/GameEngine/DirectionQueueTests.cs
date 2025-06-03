using Snake.Domain.GameEngine;
using Xunit;
using FluentAssertions;

namespace Snake.UnitTests.GameEngine;

public class DirectionQueueTests
{
    [Fact]
    public void ChangeDirection_DirectOpposite_ShouldBeBlocked()
    {
        // Arrange
        var engine = new Snake.Domain.GameEngine.GameEngine();
        engine.Initialize(20, 20); // Starts facing Right

        // Act
        var result = engine.ChangeDirection(Direction.Left);

        // Assert
        result.Should().BeFalse("direct opposite direction should be blocked");
        engine.CurrentDirection.Should().Be(Direction.Right);
    }
    [Fact]
    public void ChangeDirection_TwoNinetyDegreeTurnsResultingInOpposite_ShouldBeAllowed()
    {
        // Arrange
        var engine = new Snake.Domain.GameEngine.GameEngine();
        engine.Initialize(20, 20); // Starts facing Right

        // Act
        var downResult = engine.ChangeDirection(Direction.Down);
        var leftResult = engine.ChangeDirection(Direction.Left);

        // Assert
        downResult.Should().BeTrue("first 90-degree turn should be allowed");
        leftResult.Should().BeTrue("second turn should be allowed as it's queued, not immediate");
    }

    [Fact]
    public void ChangeDirection_ValidSequenceThatDoesNotResultInOpposite_ShouldBeAllowed()
    {
        // Arrange
        var engine = new Snake.Domain.GameEngine.GameEngine();
        engine.Initialize(20, 20); // Starts facing Right

        // Act
        var downResult = engine.ChangeDirection(Direction.Down);
        var rightResult = engine.ChangeDirection(Direction.Right);

        // Assert
        downResult.Should().BeTrue("first turn should be allowed");
        rightResult.Should().BeTrue("second turn that doesn't result in opposite should be allowed");
    }    /*
    [Fact]
    public void ChangeDirection_ThreeDirectionSequenceFormingUTurn_ShouldBeBlocked()
    {
        // Arrange
        var engine = new Snake.Domain.GameEngine.GameEngine();
        engine.Initialize(20, 20); // Starts facing Right

        // Act
        var upResult = engine.ChangeDirection(Direction.Up);
        var leftResult = engine.ChangeDirection(Direction.Left);
        var downResult = engine.ChangeDirection(Direction.Down); // This would eventually lead to Left (opposite of Right)

        // Assert
        upResult.Should().BeTrue("first turn should be allowed");
        leftResult.Should().BeTrue("second turn should be allowed");
        downResult.Should().BeFalse("third turn that completes opposite direction should be blocked");
    }
    */
}
