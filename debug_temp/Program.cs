using Snake.Domain.GameEngine;
using System.Reflection;

// Debug the exact logic from failing test
var engine = new Snake.Domain.GameEngine.GameEngine();
engine.Initialize(20, 20);

Console.WriteLine($"Initial state:");
Console.WriteLine($"  CurrentDirection: {engine.CurrentDirection}");

Console.WriteLine($"\nStep 1: ChangeDirection(Down)");
var downResult = engine.ChangeDirection(Direction.Down);
Console.WriteLine($"  Result: {downResult}");
Console.WriteLine($"  Down.IsOpposite(Right): {Direction.Down.IsOpposite(Direction.Right)}");

Console.WriteLine($"\nStep 2: ChangeDirection(Left)");
Console.WriteLine($"  About to check Left against:");
Console.WriteLine($"  - CurrentDirection: {engine.CurrentDirection}");
Console.WriteLine($"  - Left.IsOpposite(CurrentDirection): {Direction.Left.IsOpposite(engine.CurrentDirection)}");

// Check what the queue contains
var queueField = typeof(Snake.Domain.GameEngine.GameEngine)
    .GetField("_directionQueue", BindingFlags.NonPublic | BindingFlags.Instance);
var queue = queueField?.GetValue(engine) as Queue<Direction>;
Console.WriteLine($"  - Queue count: {queue?.Count ?? 0}");
if (queue?.Count > 0)
{
    var lastQueued = queue.ToArray().Last();
    Console.WriteLine($"  - Last queued direction: {lastQueued}");
    Console.WriteLine($"  - Left.IsOpposite(lastQueued): {Direction.Left.IsOpposite(lastQueued)}");
}

var leftResult = engine.ChangeDirection(Direction.Left);
Console.WriteLine($"  Result: {leftResult}");
