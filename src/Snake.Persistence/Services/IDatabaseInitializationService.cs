namespace Snake.Persistence.Services;

/// <summary>
/// Service interface for initializing the database and containers on application startup.
/// </summary>
public interface IDatabaseInitializationService
{
    /// <summary>
    /// Ensures the database and all required containers are created.
    /// This operation is idempotent and safe to run multiple times.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A task representing the initialization operation</returns>
    Task InitializeAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Seeds the database with initial data if empty.
    /// This is typically used for development and testing environments.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for the operation</param>
    /// <returns>A task representing the seeding operation</returns>
    Task SeedDataAsync(CancellationToken cancellationToken = default);
}
