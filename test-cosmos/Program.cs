using System;
using System.Threading.Tasks;
using Microsoft.Azure.Cosmos;
using Snake.Domain.Entities;
using Snake.Persistence.Serialization;

namespace Snake.Test
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("Testing Cosmos DB JSON serialization...");

            var options = new CosmosClientOptions
            {
                ConnectionMode = ConnectionMode.Direct,
                ConsistencyLevel = ConsistencyLevel.Session,
                Serializer = new CosmosSystemTextJsonSerializer()
            };

            var client = new CosmosClient(
                "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
                options);

            try
            {
                // Create database and container
                var database = await client.CreateDatabaseIfNotExistsAsync("TestDB");
                var containerProps = new ContainerProperties("TestContainer", "/partitionKey");
                var container = await database.Database.CreateContainerIfNotExistsAsync(containerProps);

                // Create a test GameScore
                var gameScore = new GameScore
                {
                    Id = Guid.NewGuid().ToString(),
                    PlayerName = "TestPlayer",
                    Score = 1000,
                    GameTime = 120,
                    Timestamp = DateTime.UtcNow,
                    Region = "global",
                    PartitionKey = $"global_{DateTime.UtcNow:yyyy-MM}"
                };

                Console.WriteLine($"Creating GameScore: {gameScore.Id}");
                Console.WriteLine($"JSON should contain: id, partitionKey, playerName, score, gameTime, region, timestamp");

                // Try to create the item
                var response = await container.Container.CreateItemAsync(
                    gameScore,
                    new PartitionKey(gameScore.PartitionKey));

                Console.WriteLine($"SUCCESS! Created item with ID: {response.Resource.Id}");
                Console.WriteLine($"Request charge: {response.RequestCharge}");

                // Clean up
                await database.Database.DeleteAsync();
                Console.WriteLine("Cleaned up test database");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
            }
            finally
            {
                client.Dispose();
            }

            Console.WriteLine("Test completed. Press any key to exit.");
            Console.ReadKey();
        }
    }
}
