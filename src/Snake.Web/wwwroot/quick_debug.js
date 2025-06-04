// Quick debug test
console.log('🧪 Quick Diagnostic Test');
console.log('Current time:', Date.now());
console.log('Testing modal conditions...');

// Test with conditions that should work
window.score = 100;
window.gameWasPlayed = true;
window.gameStartTime = Date.now() - 10000;
window.scoreSubmitted = false;
window.pageLoadTime = Date.now() - 60000;

console.log('✅ Test conditions set:');
console.log('- score:', window.score);
console.log('- gameWasPlayed:', window.gameWasPlayed);
console.log('- gameStartTime:', window.gameStartTime);
console.log('- scoreSubmitted:', window.scoreSubmitted);
console.log('- pageLoadTime age:', Date.now() - window.pageLoadTime, 'ms');

// Test checkForHighScore
if (typeof window.checkForHighScore === 'function') {
    console.log('🚀 Calling checkForHighScore()...');
    window.checkForHighScore();
} else {
    console.log('❌ checkForHighScore function not found');
}
