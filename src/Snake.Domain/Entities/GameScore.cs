namespace Snake.Domain.Entities;

public class GameScore
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PartitionKey { get; set; } // Format: "{region}_{yyyy-MM}"
    public string PlayerName { get; set; } = string.Empty;
    public int Score { get; set; }
    public int GameTime { get; set; } // Duration in seconds
    public string Region { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
