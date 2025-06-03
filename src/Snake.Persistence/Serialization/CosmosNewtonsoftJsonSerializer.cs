using Microsoft.Azure.Cosmos;
using Newtonsoft.Json;
using System.IO;
using System.Text;

namespace Snake.Persistence.Serialization;

/// <summary>
/// Custom Cosmos DB serializer using Newtonsoft.Json to handle property naming correctly
/// </summary>
public class CosmosNewtonsoftJsonSerializer : CosmosSerializer
{
    private static readonly JsonSerializer Serializer = new JsonSerializer
    {
        NullValueHandling = NullValueHandling.Ignore,
        DateFormatHandling = DateFormatHandling.IsoDateFormat,
        DateTimeZoneHandling = DateTimeZoneHandling.Utc
    };

    public override T FromStream<T>(Stream stream)
    {
        using var streamReader = new StreamReader(stream);
        using var jsonReader = new JsonTextReader(streamReader);
        return Serializer.Deserialize<T>(jsonReader)!;
    }

    public override Stream ToStream<T>(T input)
    {
        var stream = new MemoryStream();
        using var streamWriter = new StreamWriter(stream, new UTF8Encoding(false, true), 1024, true);
        using var jsonWriter = new JsonTextWriter(streamWriter);
        Serializer.Serialize(jsonWriter, input);
        jsonWriter.Flush();
        streamWriter.Flush();
        stream.Position = 0;
        return stream;
    }
}
