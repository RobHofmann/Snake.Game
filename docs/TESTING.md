# Testing Strategy - Snake Game

**Date: June 4, 2025**

## 1. Overview

This document outlines the testing strategy for the Snake Game application, including test types, tools, coverage requirements, and best practices.

## 2. Testing Pyramid

The testing approach follows the standard testing pyramid:

```
    ╱╲
   ╱  ╲   E2E Tests (Functional)
  ╱────╲
 ╱      ╲  Integration Tests
╱────────╲
╱          ╲ Unit Tests
────────────
```

## 3. Test Types

### 3.1 Unit Tests

- **Framework**: XUnit
- **Assertion Library**: FluentAssertions
- **Location**: `tests/Snake.UnitTests`
- **Coverage Target**: 80% code coverage for domain and application layers
- **Focus Areas**:
  - Game engine logic
  - Direction and movement calculation
  - Collision detection
  - Scoring logic
  - Input handling
  - PowerUp expiration and activation
  - Time-based mechanics

**Example Unit Test**:

```csharp
public class GameEngineTests
{
    [Fact]
    public void WhenSnakeEatsFood_ThenSnakeShouldGrow()
    {
        // Arrange
        var gameEngine = new GameEngine();
        gameEngine.Initialize(10, 10);

        // Position the food where the snake will be after one move
        var snake = gameEngine.Snake;
        var initialLength = snake.Length;
        var nextHeadPosition = snake.HeadPosition.MoveIn(Direction.Right);
        gameEngine.PlaceFoodAt(nextHeadPosition);

        // Act
        gameEngine.Update(100);

        // Assert
        snake.Length.Should().Be(initialLength + 1, "because the snake should grow by 1 when eating food");
    }
}
```

**Example Time-Based PowerUp Test**:

```csharp
public class PowerUpTests
{
    [Fact]
    public void PowerUp_ShouldExpireAfterSpecifiedTime()
    {
        // Arrange
        var position = new Position(5, 5);
        var powerUp = new PowerUp(PowerUpType.SpeedBoost, position, 1); // 1 second duration for deterministic test

        // Act & Assert
        powerUp.IsExpired.Should().BeFalse();

        // Fast forward time by simulating maximum disappear time
        var expireTime = powerUp.ExpireTime;
        powerUp.SetSpawnTime(expireTime.AddSeconds(-20));

        powerUp.IsExpired.Should().BeTrue();
    }
}
```

### 3.2 Integration Tests

- **Framework**: XUnit
- **Location**: `tests/Snake.IntegrationTests`
- **Coverage Target**: 70% coverage of API endpoints and SignalR hubs
- **Focus Areas**:
  - SignalR real-time communication
  - API endpoint behavior
  - Database interactions
  - External service integrations

**Example Integration Test**:

```csharp
public class GameHubIntegrationTests
{
    [Fact]
    public async Task WhenDirectionChanges_ThenAllClientsReceiveUpdate()
    {
        // Arrange
        var factory = new WebApplicationFactory<Program>();
        var server = factory.Server;

        var client1 = new TestClient();
        var client2 = new TestClient();

        await client1.ConnectAsync(server);
        await client2.ConnectAsync(server);

        // Act
        await client1.SendAsync("StartGame");
        await client1.SendAsync("ChangeDirection", "Right");

        // Assert
        var gameState1 = await client1.WaitForMessageAsync<GameState>("ReceiveGameState");
        var gameState2 = await client2.WaitForMessageAsync<GameState>("ReceiveGameState");

        gameState1.Direction.Should().Be(Direction.Right);
        gameState2.Direction.Should().Be(Direction.Right);
    }
}
```

### 3.3 Functional Tests

- **Framework**: XUnit + Playwright
- **Location**: `tests/Snake.FunctionalTests`
- **Coverage Target**: Key user journeys and critical paths
- **Focus Areas**:
  - Complete game lifecycle
  - User interface interactions
  - Performance under load
  - Browser compatibility

**Example Functional Test**:

```csharp
public class GamePlayTests
{
    [Fact]
    public async Task FullGameCycle_ShouldWorkCorrectly()
    {
        // Arrange
        await using var playwright = await Playwright.CreateAsync();
        await using var browser = await playwright.Chromium.LaunchAsync();
        var page = await browser.NewPageAsync();

        await page.GotoAsync("https://app-snake-game-dev.azurewebsites.net");

        // Act - Start game
        await page.ClickAsync("#startButton");

        // Move snake using keyboard
        await page.Keyboard.PressAsync("ArrowRight");
        await page.WaitForTimeoutAsync(1000);

        // Assert game is running
        var gameStatus = await page.TextContentAsync("#gameStatus");
        gameStatus.Should().Contain("Playing");

        // Game over scenario
        // Simulate moves until game over

        // Assert game over screen appears
        await page.WaitForSelectorAsync("#gameOver", new() { State = WaitForSelectorState.Visible });
        var finalScore = await page.TextContentAsync("#finalScore");
        finalScore.Should().NotBeNull();
    }
}
```

## 4. Testing Tools and Libraries

### 4.1 Unit and Integration Testing

- **XUnit**: Core testing framework
- **FluentAssertions**: Fluent assertion syntax
- **Moq**: Mocking framework
- **Bogus**: Test data generation

### 4.2 Functional Testing

- **Playwright**: Browser automation
- **k6**: Performance testing

### 4.3 Code Quality

- **SonarQube**: Code quality analysis
- **Coverlet**: Code coverage
- **ReportGenerator**: Coverage reporting

## 5. Testing Environments

| Environment | Purpose             | Constraints                                  |
| ----------- | ------------------- | -------------------------------------------- |
| Local       | Development testing | Developer workstation                        |
| Dev         | Integration testing | Shared environment, mocked external services |
| Test        | Full system testing | Isolated environment, test data              |
| Acceptance  | UAT                 | Production-like environment                  |
| Production  | Smoke tests         | Minimal impact, no test data                 |

## 6. Testing in CI/CD Pipeline

### 6.1 Pull Request Validation

- Run unit tests
- Run critical integration tests
- Code coverage validation
- Code quality scanning

### 6.2 Build Pipeline

- Complete unit test suite
- Integration test suite
- Generate coverage reports

### 6.3 Release Pipeline

- Smoke tests after deployment
- Performance tests on non-production environments

## 7. Test Data Management

- Use `Bogus` for generating synthetic test data
- Reset databases between test runs
- Use Docker containers for isolated database testing
- Avoid hard-coded test data

## 8. Best Practices

1. **Test Naming**: Use descriptive names following the pattern: `UnitOfWork_StateUnderTest_ExpectedBehavior`
2. **Arrange-Act-Assert**: Structure tests with clear separation
3. **One Assert Per Test**: Focus on testing one behavior per test
4. **Avoid Logic in Tests**: Keep tests simple and straightforward
5. **Isolate Tests**: No dependency between tests
6. **Deterministic Time-Based Testing**: For components relying on time (like PowerUps):
   - Use constructor parameters for test-controlled durations
   - Provide test-specific methods to control time values (e.g., `SetSpawnTime`)
   - Avoid depending on actual system time in tests

## 9. Recent Testing Improvements (June 4, 2025)

### 9.1 PowerUp Test Stability Enhancement

- **Issue**: PowerUp expiration tests were flaky due to timing dependencies
- **Solution**: Implemented deterministic time handling with `SetSpawnTime()` method
- **Result**: 100% consistent test results for time-based PowerUp mechanics

### 9.2 Client-Side Data Stability Testing

- **Issue**: Powerup panel flashing due to inconsistent server data
- **Solution**: Implemented client-side data filtering with history tracking
- **Testing**: Added validation for data consistency patterns and alternation detection
- **Result**: Eliminated visual flashing while maintaining accurate game state

### 9.3 Visual Regression Prevention

- **Added**: Client-side data stability system prevents UI inconsistencies
- **Implemented**: Powerup data history tracking for pattern detection
- **Coverage**: Enhanced frontend stability testing for real-time data

## 10. Key Test Scenarios

| Feature     | Test Scenario        | Test Type   |
| ----------- | -------------------- | ----------- |
| Game Engine | Snake movement       | Unit        |
| Game Engine | Collision detection  | Unit        |
| Game Engine | Scoring logic        | Unit        |
| SignalR     | Real-time updates    | Integration |
| SignalR     | Client reconnection  | Integration |
| Game UI     | Responsive layout    | Functional  |
| Game UI     | Touch controls       | Functional  |
| Game UI     | Keyboard controls    | Functional  |
| Performance | 100 concurrent users | Performance |
| Security    | Input validation     | Security    |

## 9.1 Recent Bug Fix Testing (June 4, 2025)

### High Score Modal State Transition Bug

**Issue**: High score modal not appearing for certain game state transitions  
**Root Cause**: Flags only set for Ready→Playing transitions, missing other patterns

**Test Files Created**:
- `test_final_fix.html` - Standalone logic verification
- `test_modal_race_condition_fix.html` - Race condition testing  
- `test_race_condition_fix_verification.html` - Full game integration test

**Test Scenarios Covered**:
1. **Direct Ready→GameOver** with score 450 (should show modal)
2. **GameOver→Playing→GameOver** with score 500 (should show modal)  
3. **Standard Ready→Playing** transition (should still work)
4. **Race condition protection** with 100ms delays
5. **Flag validation** across all transition patterns

**Test Results**: ✅ All scenarios pass, modal appears correctly for scores ≥ 300

## 10. Test Coverage Requirements

| Component            | Minimum Coverage | Current Coverage |
| -------------------- | ---------------- | ---------------- |
| Domain Layer         | 80%              | 85%              |
| Application Layer    | 75%              | 70%              |
| Infrastructure Layer | 70%              | 55%              |
| API Layer            | 75%              | 60%              |
| Frontend             | 60%              | 65%              |

**Version:** 1.1  
**Last Updated:** June 4, 2025
