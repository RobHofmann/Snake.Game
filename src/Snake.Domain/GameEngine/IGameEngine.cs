namespace Snake.Domain.GameEngine;

public interface IGameEngine
{
    /// <summary>
    /// Gets the current state of the game.
    /// </summary>
    GameState State { get; }

    /// <summary>
    /// Gets the current score.
    /// </summary>
    int Score { get; }

    /// <summary>
    /// Gets the current game board size.
    /// </summary>
    (int Width, int Height) BoardSize { get; }

    /// <summary>
    /// Gets the current snake positions, with the head being the first element.
    /// </summary>
    IReadOnlyList<Position> Snake { get; }

    /// <summary>
    /// Gets the current food position.
    /// </summary>
    Position Food { get; }

    /// <summary>
    /// Gets the current direction of the snake.
    /// </summary>
    Direction CurrentDirection { get; }

    /// <summary>
    /// Gets the time elapsed during the last frame in milliseconds.
    /// </summary>
    float LastFrameTime { get; }    /// <summary>
    /// Gets the list of current power-ups on the board.
    /// </summary>
    IReadOnlyList<PowerUp> PowerUps { get; }

    /// <summary>
    /// Gets the list of currently active power-up effects.
    /// </summary>
    IReadOnlyList<PowerUp> ActivePowerUpEffects { get; }

    /// <summary>
    /// Gets whether the shield powerup is active.
    /// </summary>
    bool IsShieldActive { get; }

    /// <summary>
    /// Gets whether the double points powerup is active.
    /// </summary>
    bool IsDoublePointsActive { get; }

    /// <summary>
    /// Gets the current speed multiplier (affected by speed boost powerup).
    /// </summary>
    float SpeedMultiplier { get; }

    /// <summary>
    /// Initializes or resets the game with the specified board size.
    /// </summary>
    /// <param name="width">The width of the game board.</param>
    /// <param name="height">The height of the game board.</param>
    void Initialize(int width, int height);

    /// <summary>
    /// Updates the game state based on the current direction and time delta.
    /// </summary>
    /// <param name="deltaTime">The time elapsed since the last update in milliseconds.</param>
    /// <returns>True if the game state was updated, false if the game is over or paused.</returns>
    bool Update(float deltaTime);

    /// <summary>
    /// Changes the snake's direction.
    /// </summary>
    /// <param name="newDirection">The new direction.</param>
    /// <returns>True if the direction was changed successfully.</returns>
    bool ChangeDirection(Direction newDirection);

    /// <summary>
    /// Pauses or unpauses the game.
    /// </summary>
    void TogglePause();
}
