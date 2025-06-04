// Quick console test script for Snake Game Modal
// Run this in the browser console while on http://localhost:5080

console.log('🧪 Starting quick modal test...');

// Check if all required elements exist
const requiredElements = {
    'nameInputModal': document.getElementById('nameInputModal'),
    'playerNameInput': document.getElementById('playerNameInput'),
    'submitHighScore': document.getElementById('submitHighScore'),
    'skipHighScore': document.getElementById('skipHighScore'),
    'highScoreValue': document.getElementById('highScoreValue')
};

console.log('📋 Element check:');
let allElementsExist = true;
for (const [name, element] of Object.entries(requiredElements)) {
    const exists = element !== null;
    console.log(`- ${name}: ${exists ? '✅' : '❌'}`);
    if (!exists) allElementsExist = false;
}

if (!allElementsExist) {
    console.log('❌ Some required elements are missing. Check HTML structure.');
    return;
}

// Force set test conditions
console.log('🔧 Setting up test conditions...');
window.score = 50;
window.gameWasPlayed = true;
window.gameStartTime = Date.now() - 5000; // 5 seconds ago
window.scoreSubmitted = false;
window.pageLoadTime = Date.now() - 10000; // 10 seconds ago

console.log('📊 Test conditions:');
console.log(`- score: ${window.score}`);
console.log(`- gameWasPlayed: ${window.gameWasPlayed}`);
console.log(`- gameStartTime: ${window.gameStartTime}`);
console.log(`- scoreSubmitted: ${window.scoreSubmitted}`);
console.log(`- timeSincePageLoad: ${Date.now() - window.pageLoadTime}ms`);

// Test checkForHighScore function
if (typeof window.checkForHighScore === 'function') {
    console.log('🚀 Testing checkForHighScore function...');
    window.checkForHighScore();
} else {
    console.log('❌ checkForHighScore function not found');
}

// Test showNameInputModal directly
if (typeof window.showNameInputModal === 'function') {
    console.log('🚀 Testing showNameInputModal function directly...');
    window.showNameInputModal();
} else {
    console.log('❌ showNameInputModal function not found');
}

// Check modal state
setTimeout(() => {
    const modal = document.getElementById('nameInputModal');
    if (modal) {
        const isVisible = !modal.classList.contains('hide');
        const computedDisplay = window.getComputedStyle(modal).display;
        
        console.log('📊 Modal state after test:');
        console.log(`- Has 'hide' class: ${modal.classList.contains('hide')}`);
        console.log(`- Computed display: ${computedDisplay}`);
        console.log(`- Is visible: ${isVisible && computedDisplay !== 'none'}`);
        
        if (isVisible && computedDisplay !== 'none') {
            console.log('✅ SUCCESS: Modal is now visible!');
            
            // Test typing in input field
            const input = document.getElementById('playerNameInput');
            if (input) {
                input.value = 'TestPlayer';
                console.log('✅ Input field test: Can set value to "TestPlayer"');
                input.focus();
                console.log('✅ Input field focused');
            }
        } else {
            console.log('❌ FAIL: Modal is not visible');
        }
    }
}, 500);

console.log('🎯 Test complete. Check console output above for results.');
