using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Snake.Domain.Entities;
using Snake.Domain.Repositories;

namespace Snake.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LeaderboardController : ControllerBase
{
    private readonly ILeaderboardRepository _leaderboardRepository;
    private readonly ILogger<LeaderboardController> _logger;

    public LeaderboardController(ILeaderboardRepository leaderboardRepository, ILogger<LeaderboardController> logger)
    {
        _leaderboardRepository = leaderboardRepository;
        _logger = logger;
    }

    [HttpPost("scores")]
    public async Task<ActionResult<GameScore>> SubmitScore(GameScore score, CancellationToken cancellationToken)
    {
        try
        {
            score.Region = score.Region ?? "global"; // Default to global region if none specified
            var result = await _leaderboardRepository.AddScoreAsync(score, cancellationToken);
            return Created($"/api/leaderboard/scores/{result.Id}", result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting score for player {PlayerName}", score.PlayerName);
            return StatusCode(500, "An error occurred while submitting the score");
        }
    }

    [HttpGet("scores/top")]
    public async Task<ActionResult<IEnumerable<GameScore>>> GetTopScores(
        [FromQuery] string region = "global",
        [FromQuery] int limit = 10,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var scores = await _leaderboardRepository.GetTopScoresAsync(region, limit, cancellationToken);
            return Ok(scores);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving top scores for region {Region}", region);
            return StatusCode(500, "An error occurred while retrieving top scores");
        }
    }

    [HttpGet("scores/player/{playerName}")]
    public async Task<ActionResult<IEnumerable<GameScore>>> GetPlayerScores(
        string playerName,
        [FromQuery] string? region = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var scores = await _leaderboardRepository.GetPlayerScoresAsync(playerName, region, cancellationToken);
            return Ok(scores);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving scores for player {PlayerName}", playerName);
            return StatusCode(500, "An error occurred while retrieving player scores");
        }
    }

    [HttpGet("regions")]
    public async Task<ActionResult<IEnumerable<string>>> GetRegions(CancellationToken cancellationToken = default)
    {
        try
        {
            var regions = await _leaderboardRepository.GetRegionsAsync(cancellationToken);
            return Ok(regions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving regions");
            return StatusCode(500, "An error occurred while retrieving regions");
        }
    }
}
