using Snake.Domain.GameEngine;
using System;

Console.WriteLine("Testing Direction opposites:");
Console.WriteLine($"Down.IsOpposite(Left): {Direction.Down.IsOpposite(Direction.Left)}");
Console.WriteLine($"Down.IsOpposite(Up): {Direction.Down.IsOpposite(Direction.Up)}");
Console.WriteLine($"Right.IsOpposite(Left): {Direction.Right.IsOpposite(Direction.Left)}");
Console.WriteLine($"Right.IsOpposite(Down): {Direction.Right.IsOpposite(Direction.Down)}");

// Test the exact sequence from the failing test
var engine = new Snake.Domain.GameEngine.GameEngine();
engine.Initialize(20, 20);

Console.WriteLine($"\nInitial direction: {engine.CurrentDirection}");

var downResult = engine.ChangeDirection(Direction.Down);
Console.WriteLine($"Right -> Down: {downResult}");

var leftResult = engine.ChangeDirection(Direction.Left);
Console.WriteLine($"Down -> Left: {leftResult}");

Console.WriteLine("Expected: both should be True");
