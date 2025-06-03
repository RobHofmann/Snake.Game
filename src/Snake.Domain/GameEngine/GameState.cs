namespace Snake.Domain.GameEngine;

public enum GameState
{
    /// <summary>
    /// The game has not started yet or is ready for a new game.
    /// </summary>
    Ready,

    /// <summary>
    /// The game is currently being played.
    /// </summary>
    Playing,

    /// <summary>
    /// The game is paused.
    /// </summary>
    Paused,

    /// <summary>
    /// The game has ended (collision with wall or self).
    /// </summary>
    GameOver
}
