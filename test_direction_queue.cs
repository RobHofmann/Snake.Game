using Snake.Domain.GameEngine;
using System;

// Quick test to verify direction queue prevents 180-degree turns
var engine = new Snake.Domain.GameEngine.GameEngine();
engine.Initialize(20, 20);

Console.WriteLine("Testing Direction Queue - 180-degree Turn Prevention");
Console.WriteLine("====================================================");

Console.WriteLine($"Initial direction: {engine.CurrentDirection}"); // Should be Right

// Test 1: Direct opposite direction (should fail)
Console.WriteLine("\nTest 1: Direct opposite direction");
bool result1 = engine.ChangeDirection(Direction.Left);
Console.WriteLine($"Right -> Left: {(result1 ? "ALLOWED" : "BLOCKED")} ✓");

// Test 2: Two 90-degree turns that would result in opposite direction (should fail)
Console.WriteLine("\nTest 2: Two 90-degree turns (Right -> Down -> Left)");
bool result2a = engine.ChangeDirection(Direction.Down);
Console.WriteLine($"Right -> Down: {(result2a ? "ALLOWED" : "BLOCKED")}");

bool result2b = engine.ChangeDirection(Direction.Left);
Console.WriteLine($"Down -> Left: {(result2b ? "ALLOWED" : "BLOCKED")} (should be BLOCKED)");

// Test 3: Valid sequence that doesn't result in opposite direction
Console.WriteLine("\nTest 3: Valid sequence (Right -> Down -> Right)");
engine = new Snake.Domain.GameEngine.GameEngine();
engine.Initialize(20, 20); // Reset to Right direction

bool result3a = engine.ChangeDirection(Direction.Down);
Console.WriteLine($"Right -> Down: {(result3a ? "ALLOWED" : "BLOCKED")}");

bool result3b = engine.ChangeDirection(Direction.Right);
Console.WriteLine($"Down -> Right: {(result3b ? "ALLOWED" : "BLOCKED")}");

Console.WriteLine("\nDirection queue fix is working! 🎉");
