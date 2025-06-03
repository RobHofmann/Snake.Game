namespace Snake.Persistence.Configuration;

public class CosmosDbSettings
{
    public string Endpoint { get; set; } = string.Empty;
    public string? ConnectionString { get; set; }
    public string DatabaseName { get; set; } = string.Empty;
    public string ContainerName { get; set; } = string.Empty;
    public bool UseManagedIdentity { get; set; } = true;
}
