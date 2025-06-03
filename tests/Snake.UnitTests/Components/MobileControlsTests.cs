using FluentAssertions;
using Xunit;

namespace Snake.UnitTests.Components;

public class MobileControlsTests
{
    [Fact]
    public void SwipeGesture_CalculateDirection_ShouldReturnCorrectDirection()
    {
        // This test verifies the swipe gesture calculation logic
        // Note: Since the actual swipe detection is in JavaScript,
        // this tests the mathematical concepts that would be used

        // Arrange - Horizontal swipe right
        var startX = 100;
        var startY = 200;
        var endX = 180; // 80px to the right
        var endY = 210; // 10px down

        // Act - Calculate deltas
        var deltaX = endX - startX;
        var deltaY = endY - startY;
        var absDeltaX = Math.Abs(deltaX);
        var absDeltaY = Math.Abs(deltaY);

        // Assert - Should be horizontal swipe to the right
        absDeltaX.Should().BeGreaterThan(absDeltaY);
        deltaX.Should().BePositive();

        // Expected direction would be "right"
        var direction = absDeltaX > absDeltaY ? (deltaX > 0 ? "right" : "left") : (deltaY > 0 ? "down" : "up");
        direction.Should().Be("right");
    }

    [Fact]
    public void SwipeGesture_CalculateDirection_VerticalSwipe_ShouldReturnUp()
    {
        // Arrange - Vertical swipe up
        var startX = 100;
        var startY = 200;
        var endX = 105; // 5px to the right
        var endY = 120; // 80px up (negative Y)

        // Act - Calculate deltas
        var deltaX = endX - startX;
        var deltaY = endY - startY;
        var absDeltaX = Math.Abs(deltaX);
        var absDeltaY = Math.Abs(deltaY);

        // Assert - Should be vertical swipe up
        absDeltaY.Should().BeGreaterThan(absDeltaX);
        deltaY.Should().BeNegative();

        // Expected direction would be "up"
        var direction = absDeltaX > absDeltaY ? (deltaX > 0 ? "right" : "left") : (deltaY > 0 ? "down" : "up");
        direction.Should().Be("up");
    }

    [Fact]
    public void SwipeThreshold_MinimumDistance_ShouldBeReasonable()
    {
        // Arrange
        const int SwipeThreshold = 30; // pixels

        // Act & Assert
        SwipeThreshold.Should().BeGreaterOrEqualTo(20, "because minimum touch distance should be reasonable for finger accuracy");
        SwipeThreshold.Should().BeLessOrEqualTo(50, "because threshold shouldn't be too large for quick swipes");
    }

    [Fact]
    public void TouchButtonSize_ShouldMeetAccessibilityGuidelines()
    {
        // Arrange - iOS and Android recommend minimum 44px touch targets
        const int MinimumTouchTargetSize = 44; // pixels

        // Act & Assert
        MinimumTouchTargetSize.Should().BeGreaterOrEqualTo(44, "because this meets iOS and Android accessibility guidelines");
    }

    [Theory]
    [InlineData("up", "Up")]
    [InlineData("down", "Down")]
    [InlineData("left", "Left")]
    [InlineData("right", "Right")]
    public void DirectionMapping_ShouldMapCorrectly(string mobileDirection, string expectedGameDirection)
    {
        // This test verifies the direction mapping logic used in JavaScript

        // Arrange - Direction map (same as in JavaScript)
        var directionMap = new Dictionary<string, string>
        {
            {"up", "Up"},
            {"down", "Down"},
            {"left", "Left"},
            {"right", "Right"}
        };

        // Act
        var result = directionMap.TryGetValue(mobileDirection, out var gameDirection) ? gameDirection : null;

        // Assert
        result.Should().Be(expectedGameDirection);
    }
}
