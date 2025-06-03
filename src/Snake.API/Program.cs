using Snake.Domain.Entities;
using Snake.Domain.GameEngine;
using Snake.Domain.Repositories;
using Snake.Persistence.Repositories;
using Snake.Persistence.Services;
using Snake.API.Hubs;
using Snake.API.Services;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
}).AddJsonProtocol(options =>
{
    options.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .WithOrigins("http://localhost:5080");
    });
});

// Register services
builder.Services.AddSingleton<IGameEngine, GameEngine>();
builder.Services.AddScoped<IInputHandler, InputHandler>();
builder.Services.AddScoped<ILeaderboardRepository, CosmosDbLeaderboardRepository>();
builder.Services.AddHostedService<GameService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors();

// Map controllers and SignalR hub
app.MapControllers();
app.MapHub<GameHub>("/gamehub");

// Map health check endpoint
app.MapGet("/api/healthcheck", () => "API is running!");

// Initialize database on startup
await InitializeDatabaseAsync(app.Services);

app.Run();

// Database initialization method
static async Task InitializeDatabaseAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    
    try
    {
        logger.LogInformation("Starting database initialization...");
        
        // Create the database initialization directly since we're having DI issues
        var dbLogger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
            .CreateLogger("DatabaseInitialization");
            
        var settings = new Snake.Persistence.Configuration.CosmosDbSettings();
        configuration.GetSection("CosmosDb").Bind(settings);

        var options = new Microsoft.Azure.Cosmos.CosmosClientOptions
        {
            ConnectionMode = Microsoft.Azure.Cosmos.ConnectionMode.Direct,
            ConsistencyLevel = Microsoft.Azure.Cosmos.ConsistencyLevel.Session,
            MaxRetryAttemptsOnRateLimitedRequests = 3,
            MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromSeconds(30)
        };

        Microsoft.Azure.Cosmos.CosmosClient client = settings.UseManagedIdentity
            ? new Microsoft.Azure.Cosmos.CosmosClient(settings.Endpoint, new Azure.Identity.DefaultAzureCredential(), options)
            : new Microsoft.Azure.Cosmos.CosmosClient(settings.ConnectionString, options);

        // Create database if it doesn't exist
        var databaseResponse = await client.CreateDatabaseIfNotExistsAsync(
            settings.DatabaseName);

        var database = databaseResponse.Database;

        // Create container if it doesn't exist  
        var containerProperties = new Microsoft.Azure.Cosmos.ContainerProperties
        {
            Id = settings.ContainerName,
            PartitionKeyPath = "/partitionKey"
        };

        await database.CreateContainerIfNotExistsAsync(containerProperties);
        
        dbLogger.LogInformation("Database and container initialization completed");
        
        // Seed data in development environment
        if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
        {
            var container = database.GetContainer(settings.ContainerName);
            
            // Check if container is empty
            var countQuery = new Microsoft.Azure.Cosmos.QueryDefinition("SELECT VALUE COUNT(1) FROM c");
            using var countIterator = container.GetItemQueryIterator<int>(countQuery);
            var countResponse = await countIterator.ReadNextAsync();
            var itemCount = countResponse.FirstOrDefault();

            if (itemCount == 0)
            {
                // Seed with sample data
                var sampleScore = new Snake.Domain.Entities.GameScore
                {
                    Id = Guid.NewGuid().ToString(),
                    PlayerName = "DEV",
                    Score = 1500,
                    GameTime = 180,
                    Timestamp = DateTime.UtcNow,
                    Region = "global",
                    PartitionKey = $"global_{DateTime.UtcNow:yyyy-MM}"
                };

                await container.CreateItemAsync(sampleScore, new Microsoft.Azure.Cosmos.PartitionKey(sampleScore.PartitionKey));
                dbLogger.LogInformation("Seeded initial development data");
            }
        }
        
        client.Dispose();
        logger.LogInformation("Database initialization completed successfully");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database initialization failed");
        throw;
    }
}
