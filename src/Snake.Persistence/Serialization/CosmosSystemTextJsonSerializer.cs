using Microsoft.Azure.Cosmos;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Snake.Persistence.Serialization;

/// <summary>
/// Custom Cosmos DB serializer that uses System.Text.Json instead of the default Newtonsoft.Json.
/// This ensures that JsonPropertyName attributes are respected for property naming.
/// </summary>
public class CosmosSystemTextJsonSerializer : CosmosSerializer
{
    private readonly JsonSerializerOptions _serializerOptions;

    public CosmosSystemTextJsonSerializer()
    {
        _serializerOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNameCaseInsensitive = true
        };
    }

    public override T FromStream<T>(Stream stream)
    {
        if (stream == null)
            throw new ArgumentNullException(nameof(stream));

        using var streamReader = new StreamReader(stream);
        var content = streamReader.ReadToEnd();

        if (string.IsNullOrEmpty(content))
            return default(T)!;

        return JsonSerializer.Deserialize<T>(content, _serializerOptions)!;
    }

    public override Stream ToStream<T>(T input)
    {
        if (input == null)
            throw new ArgumentNullException(nameof(input));

        var json = JsonSerializer.Serialize(input, _serializerOptions);
        return new MemoryStream(System.Text.Encoding.UTF8.GetBytes(json));
    }
}
