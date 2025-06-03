using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Azure.Identity;
using Snake.Domain.Entities;
using Snake.Persistence.Configuration;
using Snake.Persistence.Serialization;
using System.Collections.ObjectModel;

namespace Snake.Persistence.Services;

/// <summary>
/// Service for initializing Cosmos DB database and containers on application startup.
/// Ensures proper database setup with containers, partition keys, and indexing policies.
/// </summary>
public class CosmosDbInitializationService : IDatabaseInitializationService
{
    private readonly CosmosClient _client;
    private readonly CosmosDbSettings _settings;
    private readonly ILogger<CosmosDbInitializationService> _logger; public CosmosDbInitializationService(
        IConfiguration configuration,
        ILogger<CosmosDbInitializationService> logger)
    {
        _logger = logger;
        _settings = new CosmosDbSettings();
        configuration.GetSection("CosmosDb").Bind(_settings); var options = new CosmosClientOptions
        {
            ConnectionMode = ConnectionMode.Direct,
            ConsistencyLevel = ConsistencyLevel.Session,
            MaxRetryAttemptsOnRateLimitedRequests = 3,
            MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromSeconds(30),
            Serializer = new CosmosSystemTextJsonSerializer()
        };

        try
        {
            _client = _settings.UseManagedIdentity
                ? new CosmosClient(_settings.Endpoint, new DefaultAzureCredential(), options)
                : new CosmosClient(_settings.ConnectionString, options);

            _logger.LogInformation("Successfully initialized Cosmos DB client for database initialization with {AuthType} authentication",
                _settings.UseManagedIdentity ? "Managed Identity" : "Connection String");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Cosmos DB client for database initialization");
            throw;
        }
    }

    /// <summary>
    /// Ensures the database and all required containers are created.
    /// This operation is idempotent and safe to run multiple times.
    /// </summary>
    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Starting database initialization for database: {DatabaseName}", _settings.DatabaseName);

            // Create database if it doesn't exist
            var database = await CreateDatabaseIfNotExistsAsync(cancellationToken);

            // Create leaderboard container if it doesn't exist
            await CreateLeaderboardContainerIfNotExistsAsync(database, cancellationToken);

            _logger.LogInformation("Database initialization completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database initialization failed");
            throw;
        }
    }    /// <summary>
         /// Seeds the database with initial data if empty.
         /// This is typically used for development and testing environments.
         /// </summary>
    public async Task SeedDataAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Starting database seeding for development data");

            var database = _client.GetDatabase(_settings.DatabaseName);
            var container = database.GetContainer(_settings.ContainerName);

            // Check if container is empty
            var countQuery = new QueryDefinition("SELECT VALUE COUNT(1) FROM c");
            using var countIterator = container.GetItemQueryIterator<int>(countQuery);
            var countResponse = await countIterator.ReadNextAsync(cancellationToken);
            var itemCount = countResponse.FirstOrDefault();

            if (itemCount > 0)
            {
                _logger.LogInformation("Database already contains {ItemCount} items, skipping seeding", itemCount);
                return;
            }

            // Seed with sample data for development
            var sampleScores = new[]
            {
                new GameScore
                {
                    Id = Guid.NewGuid().ToString(),
                    PlayerName = "DEV",
                    Score = 1500,
                    GameTime = 180,
                    Timestamp = DateTime.UtcNow.AddDays(-7),
                    Region = "global"
                },
                new GameScore
                {
                    Id = Guid.NewGuid().ToString(),
                    PlayerName = "TST",
                    Score = 1200,
                    GameTime = 150,
                    Timestamp = DateTime.UtcNow.AddDays(-5),
                    Region = "global"
                },
                new GameScore
                {
                    Id = Guid.NewGuid().ToString(),
                    PlayerName = "DEM",
                    Score = 800,
                    GameTime = 90,
                    Timestamp = DateTime.UtcNow.AddDays(-3),
                    Region = "global"
                }
            };

            foreach (var score in sampleScores)
            {
                // Ensure ID is set
                if (string.IsNullOrEmpty(score.Id))
                {
                    score.Id = Guid.NewGuid().ToString();
                }

                // Set partition key for proper document routing
                score.PartitionKey = $"{score.Region}_{score.Timestamp:yyyy-MM}";

                // Create item with proper partition key
                try
                {
                    var response = await container.CreateItemAsync(
                        score,
                        new PartitionKey(score.PartitionKey),
                        cancellationToken: cancellationToken);

                    _logger.LogInformation("Seeded score: {PlayerName} - {Score} (RequestCharge: {RequestCharge})",
                        score.PlayerName, score.Score, response.RequestCharge);
                }
                catch (CosmosException cex)
                {
                    _logger.LogError(cex, "Failed to seed score for {PlayerName}: {ErrorMessage}",
                        score.PlayerName, cex.Message);
                }
            }

            _logger.LogInformation("Database seeding completed successfully with {Count} sample scores", sampleScores.Length);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database seeding failed");
            throw;
        }
    }

    private async Task<Database> CreateDatabaseIfNotExistsAsync(CancellationToken cancellationToken)
    {
        try
        {
            var databaseResponse = await _client.CreateDatabaseIfNotExistsAsync(
                _settings.DatabaseName,
                cancellationToken: cancellationToken);

            if (databaseResponse.StatusCode == System.Net.HttpStatusCode.Created)
            {
                _logger.LogInformation("Created new database: {DatabaseName}", _settings.DatabaseName);
            }
            else
            {
                _logger.LogInformation("Database already exists: {DatabaseName}", _settings.DatabaseName);
            }

            return databaseResponse.Database;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create database: {DatabaseName}", _settings.DatabaseName);
            throw;
        }
    }
    private async Task CreateLeaderboardContainerIfNotExistsAsync(Database database, CancellationToken cancellationToken)
    {
        try
        {
            // Define the container properties
            var containerProperties = new ContainerProperties
            {
                Id = _settings.ContainerName,
                PartitionKeyPath = "/partitionKey",
                IndexingPolicy = new IndexingPolicy
                {
                    IndexingMode = IndexingMode.Consistent,
                    IncludedPaths =
                    {
                        new IncludedPath { Path = "/*" }
                    },
                    CompositeIndexes =
                    {
                        new Collection<CompositePath>
                        {
                            new CompositePath { Path = "/score", Order = CompositePathSortOrder.Descending },
                            new CompositePath { Path = "/timestamp", Order = CompositePathSortOrder.Descending }
                        }
                    }
                }
            };

            // Create the container if it doesn't exist
            var throughputProperties = ThroughputProperties.CreateAutoscaleThroughput(1000); // Use autoscale with 1000 RU/s minimum
            var containerResponse = await database.CreateContainerIfNotExistsAsync(
                containerProperties,
                throughputProperties,
                cancellationToken: cancellationToken);

            if (containerResponse.StatusCode == System.Net.HttpStatusCode.Created)
            {
                _logger.LogInformation("Created new container: {ContainerName} with partition key: {PartitionKey}",
                    _settings.ContainerName, containerProperties.PartitionKeyPath);
            }
            else
            {
                _logger.LogInformation("Container already exists: {ContainerName}", _settings.ContainerName);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create container: {ContainerName}", _settings.ContainerName);
            throw;
        }
    }
}
