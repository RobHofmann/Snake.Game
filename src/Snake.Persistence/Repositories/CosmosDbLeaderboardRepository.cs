using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Azure.Identity;
using System.Net;
using Snake.Domain.Entities;
using Snake.Domain.Repositories;
using Snake.Persistence.Configuration;

namespace Snake.Persistence.Repositories;

/// <summary>
/// Implements the leaderboard repository using Azure Cosmos DB with support for both managed identity
/// and connection string based authentication.
/// </summary>
public class CosmosDbLeaderboardRepository : ILeaderboardRepository, IAsyncDisposable
{
    private readonly CosmosClient _client;
    private readonly Container _container;
    private readonly ILogger<CosmosDbLeaderboardRepository> _logger;
    private const int MaxRetries = 3;

    public CosmosDbLeaderboardRepository(IConfiguration configuration, ILogger<CosmosDbLeaderboardRepository> logger)
    {
        _logger = logger;
        var settings = new CosmosDbSettings();
        configuration.GetSection("CosmosDb").Bind(settings);

        var options = new CosmosClientOptions
        {
            ConnectionMode = ConnectionMode.Direct,
            ConsistencyLevel = ConsistencyLevel.Session,
            MaxRetryAttemptsOnRateLimitedRequests = MaxRetries,
            MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromSeconds(30)
        };

        try
        {
            _client = settings.UseManagedIdentity
                ? new CosmosClient(settings.Endpoint, new DefaultAzureCredential(), options)
                : new CosmosClient(settings.ConnectionString, options);

            _container = _client.GetContainer(settings.DatabaseName, settings.ContainerName);
            _logger.LogInformation("Successfully initialized Cosmos DB client with {AuthType} authentication",
                settings.UseManagedIdentity ? "Managed Identity" : "Connection String");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Cosmos DB client");
            throw;
        }
    }

    public async Task<GameScore> AddScoreAsync(GameScore score, CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrEmpty(score.Id))
            {
                score.Id = Guid.NewGuid().ToString();
            }

            score.Timestamp = DateTime.UtcNow;
            score.PartitionKey = $"{score.Region}_{score.Timestamp:yyyy-MM}";

            var response = await _container.CreateItemAsync(
                score,
                new PartitionKey(score.PartitionKey),
                cancellationToken: cancellationToken);

            _logger.LogInformation("Successfully added score {ScoreId} for player {PlayerName}",
                score.Id, score.PlayerName);

            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.TooManyRequests)
        {
            _logger.LogWarning("Rate limited when adding score. Suggestion: Review RU allocation");
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding score for player {PlayerName}", score.PlayerName);
            throw;
        }
    }

    public async Task<IEnumerable<GameScore>> GetTopScoresAsync(string region, int limit = 10, CancellationToken cancellationToken = default)
    {
        try
        {
            var currentMonth = DateTime.UtcNow.ToString("yyyy-MM");
            var partitionKey = $"{region}_{currentMonth}";

            var query = new QueryDefinition(
                "SELECT TOP @limit * FROM c WHERE c.partitionKey = @partitionKey ORDER BY c.score DESC")
                .WithParameter("@limit", limit)
                .WithParameter("@partitionKey", partitionKey);

            var options = new QueryRequestOptions
            {
                PartitionKey = new PartitionKey(partitionKey),
                MaxItemCount = limit
            };

            var results = new List<GameScore>();
            using var iterator = _container.GetItemQueryIterator<GameScore>(query, requestOptions: options);

            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync(cancellationToken);
                results.AddRange(response);
            }

            _logger.LogInformation("Retrieved {Count} top scores for region {Region}", results.Count, region);
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving top scores for region {Region}", region);
            throw;
        }
    }

    public async Task<IEnumerable<GameScore>> GetPlayerScoresAsync(string playerName, string? region = null, CancellationToken cancellationToken = default)
    {
        try
        {
            QueryDefinition query;
            QueryRequestOptions options = new();

            if (region != null)
            {
                var currentMonth = DateTime.UtcNow.ToString("yyyy-MM");
                var partitionKey = $"{region}_{currentMonth}";
                query = new QueryDefinition(
                    "SELECT * FROM c WHERE c.playerName = @playerName AND c.partitionKey = @partitionKey ORDER BY c.score DESC")
                    .WithParameter("@playerName", playerName)
                    .WithParameter("@partitionKey", partitionKey);
                options.PartitionKey = new PartitionKey(partitionKey);
            }
            else
            {
                query = new QueryDefinition(
                    "SELECT * FROM c WHERE c.playerName = @playerName ORDER BY c.score DESC")
                    .WithParameter("@playerName", playerName);
            }

            var results = new List<GameScore>();
            using var iterator = _container.GetItemQueryIterator<GameScore>(query, requestOptions: options);

            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync(cancellationToken);
                results.AddRange(response);
            }

            _logger.LogInformation("Retrieved {Count} scores for player {PlayerName} {RegionFilter}",
                results.Count, playerName, region != null ? $"in region {region}" : "across all regions");

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving scores for player {PlayerName}", playerName);
            throw;
        }
    }

    public async Task<IEnumerable<string>> GetRegionsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var query = new QueryDefinition("SELECT DISTINCT VALUE c.region FROM c");
            var results = new List<string>();

            using var iterator = _container.GetItemQueryIterator<string>(query);
            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync(cancellationToken);
                results.AddRange(response);
            }

            _logger.LogInformation("Retrieved {Count} unique regions", results.Count);
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving regions");
            throw;
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_client != null)
        {
            try
            {
                // CosmosClient implements IDisposable, not IAsyncDisposable
                _client.Dispose();
                _logger.LogInformation("Successfully disposed Cosmos DB client");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disposing Cosmos DB client");
            }
        }
    }
}
