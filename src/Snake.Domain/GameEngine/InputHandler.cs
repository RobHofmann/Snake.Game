namespace Snake.Domain.GameEngine;

public class InputHandler : IInputHandler
{
    private readonly IGameEngine _engine;

    public InputHandler(IGameEngine engine)
    {
        _engine = engine;
    }

    public bool HandleKeyPress(string key)
    {
        if (_engine.State == GameState.GameOver || string.IsNullOrEmpty(key))
            return false;

        key = key.ToLower();

        if (key == " ")
        {
            _engine.TogglePause();
            return true;
        }

        return key switch
        {
            "arrowup" or "w" => _engine.ChangeDirection(Direction.Up),
            "arrowdown" or "s" => _engine.ChangeDirection(Direction.Down),
            "arrowleft" or "a" => _engine.ChangeDirection(Direction.Left),
            "arrowright" or "d" => _engine.ChangeDirection(Direction.Right),
            _ => false
        };
    }
}
