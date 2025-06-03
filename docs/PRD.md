# Product Requirements Document - Snake Game

**Date: May 30, 2025**

## 1. Overview

A modern web-based implementation of the classic Snake game, featuring retro pixel art style with neon colors and power-ups. The game will be deployed as a Progressive Web App (PWA) with offline capabilities, high score synchronization, and comprehensive analytics tracking.

## 2. Target Audience

- **Primary Users**: Casual players
- **Age Group**: All ages (suitable for general audience)
- **Platform**: Web browsers (desktop and mobile)

## 3. Core Game Features

### 3.1 Basic Gameplay

- Classic snake movement mechanics
  - Desktop: Arrow keys and WASD support
  - Mobile: Both swipe gestures and on-screen directional buttons
- Snake grows when eating food
- Game over on wall/self collision
- Instant retry option after game over

### 3.2 Power-ups

1. **Speed Boost** (blue neon)

   - Temporary increased movement speed
   - Duration: 15 seconds
   - Random disappear time: 5-15 seconds

2. **Shield** (yellow neon)

   - Temporary invincibility from wall/self collision
   - Duration: 10 seconds
   - Random disappear time: 8-20 seconds

3. **Double Points** (pink neon)

   - Points multiplier (2x)
   - Duration: 20 seconds
   - Random disappear time: 10-25 seconds

4. **Shrink** (green neon)
   - Reduces snake length by 3 segments
   - Instant effect
   - Random disappear time: 3-10 seconds

Power-up System Rules:

- Maximum 2 power-ups on screen simultaneously
- Random generation intervals
- Visual indication before disappearing
- Power-ups timeout if not collected
- Collecting the same powerup type while active resets timer to full duration

### 3.3 Scoring System

- Base points:
  - Regular food: 100 points
  - Power-up collection: 50 points
- Multipliers:
  - Double Points power-up: 2x points
  - Consecutive food collection streak: +10% per item (max 50%)

### 3.4 Leaderboard

- Top 200 high scores (synced between offline/online)
- Separate webpage for leaderboard display
- Display:
  - Player nickname (3 characters)
  - Score
  - Date achieved
- Online scores take precedence over offline scores
- Anti-cheat measures:
  - Score validation
  - Replay hash verification
  - Rate limiting
  - Pattern detection for unusual scores

## 4. User Interface

### 4.1 Main Menu

- Play button
- Settings
  - Sound effects toggle
  - Background music toggle
  - Volume control slider
- Leaderboard button
- About/Credits
  - Version number (from pipeline: yyyy.MM.dd.r)
  - Developer information (Rob Hofmann)
  - GitHub profile link (robhofmann)

### 4.2 In-Game UI

- Current score
- Current snake length
- Active power-up effects panel:
  - Located below the game field
  - Horizontal layout with:
    - Power-up icon (with color-matched glow)
    - Effect name
    - Progress bar showing remaining duration
    - Countdown timer in seconds
  - Semi-transparent background for better visibility
  - Automatic spacing based on number of active effects
- Time played
- Power-ups collected
- Pause functionality
- Visual/audio indicators for:
  - Power-up spawning
  - Power-up collection
  - Power-up expiration
  - Score multipliers

## 5. Visual Design

- **Style**: Retro pixel art
- **Color Scheme**: Neon colors
  - Background: Dark purple (#1a0b2e)
  - Snake: Neon green (#39ff14)
  - Food: Neon red (#ff3131)
  - Power-ups: As specified in section 3.2
  - UI Elements: Neon blue (#4deeea)

## 6. Audio Design

### 6.1 Sound Effects

- Food collection
- Power-up activation/expiration
- Collision/game over
- UI interaction sounds
- Menu navigation

### 6.2 Background Music

- Retro 8-bit style music
- Toggle on/off functionality
- Volume control slider

## 7. Technical Requirements

### 7.1 Platform Support

- **Web Browsers**:
  - Chrome (latest 2 versions)
  - Firefox (latest 2 versions)
  - Safari (latest 2 versions)
  - Edge (latest 2 versions)

### 7.2 Mobile Support

- **iOS**: Version 14+
- **Android**: Version 8+
- Responsive design
- Touch controls optimization

### 7.3 Performance Targets

- Load time: < 3 seconds on 4G
- Frame rate: 60 FPS
- No visible lag during gameplay

### 7.4 PWA Features

- Installable on devices
- Full offline functionality
- Asset caching for offline play
- High score synchronization when online
- Auto-update notification system
- Cache all assets (images/sounds)

## 8. Security Implementation

- Rate limiting for score submissions
- Game replay hash validation
- Pattern detection for unusual scores
- Server-side validation for all score submissions
- IP-based rate limiting
- Session-based security measures
- Secure score synchronization

## 9. Analytics Implementation (Azure Application Insights)

### 9.1 Game Analytics

- Session metrics
  - Duration
  - Games per session
  - Average/high scores
  - Power-up usage
  - Collision points
  - Control method used (keyboard/touch)

### 9.2 Technical Analytics

- Load times
- Frame rates
- Error tracking with stack traces
- Browser/device distribution
- PWA installation rate
- Online/offline usage
- Score sync events
- Performance metrics

### 9.3 User Behavior

- Menu navigation patterns
- Settings changes
- Feature usage statistics
- Retry patterns
- Game duration distribution
- Control method preferences
- PWA installation conversion

## 10. Success Metrics

- Average session duration > 5 minutes
- Daily active users > 100
- PWA installation rate > 15%
- Player retention rate > 30% (7 days)
- Error rate < 1%

## Sign-off

- [x] Product Owner - Approved May 30, 2025
- [x] Technical Lead - Approved May 30, 2025
- [x] UX Designer - Approved May 30, 2025
- [x] QA Lead - Approved May 30, 2025

**Version:** 1.0
**Last Updated:** May 30, 2025
