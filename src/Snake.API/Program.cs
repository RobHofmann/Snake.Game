using Snake.Domain.Entities;
using Snake.Domain.GameEngine;
using Snake.Domain.Repositories;
using Snake.Persistence.Repositories;
using Snake.API.Hubs;
using Snake.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddSignalR();
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

// Map SignalR hub
app.MapHub<GameHub>("/gamehub");

// Map health check endpoint
app.MapGet("/api/healthcheck", () => "API is running!");

app.Run();
