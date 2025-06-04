// Debug script to force show the modal for testing
// Run this in the browser console on the Snake game page

console.log('🧪 Starting modal debug test...');

// Check if modal elements exist
const modal = document.getElementById('nameInputModal');
const input = document.getElementById('playerNameInput');
const submitBtn = document.getElementById('submitHighScore');
const skipBtn = document.getElementById('skipHighScore');

console.log('Modal elements check:');
console.log('- nameInputModal:', modal ? '✅ Found' : '❌ Missing');
console.log('- playerNameInput:', input ? '✅ Found' : '❌ Missing');
console.log('- submitHighScore:', submitBtn ? '✅ Found' : '❌ Missing');
console.log('- skipHighScore:', skipBtn ? '✅ Found' : '❌ Missing');

if (modal) {
    console.log('Modal current state:');
    console.log('- Classes:', modal.className);
    console.log('- Display:', window.getComputedStyle(modal).display);
    console.log('- Visibility:', window.getComputedStyle(modal).visibility);
}

// Force set game conditions for modal to appear
console.log('🔧 Setting up test conditions...');
window.score = 150;
window.gameWasPlayed = true;
window.gameStartTime = Date.now() - 10000; // 10 seconds ago
window.scoreSubmitted = false;

console.log('Test conditions set:');
console.log('- score:', window.score);
console.log('- gameWasPlayed:', window.gameWasPlayed);
console.log('- gameStartTime:', window.gameStartTime);
console.log('- scoreSubmitted:', window.scoreSubmitted);

// Test the checkForHighScore function
if (window.checkForHighScore) {
    console.log('🚀 Calling checkForHighScore...');
    window.checkForHighScore();
} else {
    console.log('❌ checkForHighScore function not found');
}

// Test the showNameInputModal function directly
if (window.showNameInputModal) {
    console.log('🚀 Calling showNameInputModal directly...');
    window.showNameInputModal();
} else {
    console.log('❌ showNameInputModal function not found');
}

// Check modal state after attempts
setTimeout(() => {
    if (modal) {
        console.log('📊 Modal state after tests:');
        console.log('- Classes:', modal.className);
        console.log('- Display:', window.getComputedStyle(modal).display);
        console.log('- Is hidden:', modal.classList.contains('hide'));
        
        // Force show the modal by removing hide class
        console.log('🔥 Force removing hide class...');
        modal.classList.remove('hide');
        
        setTimeout(() => {
            console.log('📊 Final modal state:');
            console.log('- Classes:', modal.className);
            console.log('- Display:', window.getComputedStyle(modal).display);
            console.log('- Should be visible now!');
        }, 100);
    }
}, 500);
