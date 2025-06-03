using Snake.Domain.Entities;

namespace Snake.Domain.Repositories;

public interface ILeaderboardRepository
{
    Task<GameScore> AddScoreAsync(GameScore score, CancellationToken cancellationToken = default);
    Task<IEnumerable<GameScore>> GetTopScoresAsync(string region, int limit = 10, CancellationToken cancellationToken = default);
    Task<IEnumerable<GameScore>> GetPlayerScoresAsync(string playerName, string? region = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<string>> GetRegionsAsync(CancellationToken cancellationToken = default);
}
