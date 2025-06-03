namespace Snake.Domain.GameEngine;

public enum Direction
{
    Up,
    Right,
    Down,
    Left
}

public static class DirectionExtensions
{
    public static Position ToPosition(this Direction direction) => direction switch
    {
        Direction.Up => new Position(0, -1),
        Direction.Right => new Position(1, 0),
        Direction.Down => new Position(0, 1),
        Direction.Left => new Position(-1, 0),
        _ => throw new ArgumentException("Invalid direction", nameof(direction))
    };

    public static bool IsOpposite(this Direction direction, Direction other) => direction switch
    {
        Direction.Up => other == Direction.Down,
        Direction.Right => other == Direction.Left,
        Direction.Down => other == Direction.Up,
        Direction.Left => other == Direction.Right,
        _ => throw new ArgumentException("Invalid direction", nameof(direction))
    };
}
