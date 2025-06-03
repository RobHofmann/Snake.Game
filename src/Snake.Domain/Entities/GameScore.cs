using System.Text.Json.Serialization;

namespace Snake.Domain.Entities;

public class GameScore
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("partitionKey")]
    public string PartitionKey { get; set; } = string.Empty; // Format: "{region}_{yyyy-MM}"

    [JsonPropertyName("playerName")]
    public string PlayerName { get; set; } = string.Empty;

    [JsonPropertyName("score")]
    public int Score { get; set; }

    [JsonPropertyName("gameTime")]
    public int GameTime { get; set; } // Duration in seconds

    [JsonPropertyName("region")]
    public string Region { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
