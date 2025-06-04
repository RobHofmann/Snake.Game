// Test script for browser console
// Run this in the browser console on http://localhost:5080

console.log('🔍 MODAL DEBUG TEST');
console.log('==================');

// Check game variables
console.log('📊 Current game variables:');
console.log('- gameState:', typeof gameState !== 'undefined' ? gameState : 'undefined');
console.log('- score:', typeof score !== 'undefined' ? score : 'undefined');
console.log('- gameStartTime:', typeof gameStartTime !== 'undefined' ? gameStartTime : 'undefined');
console.log('- gameWasPlayed:', typeof gameWasPlayed !== 'undefined' ? gameWasPlayed : 'undefined');
console.log('- scoreSubmitted:', typeof scoreSubmitted !== 'undefined' ? scoreSubmitted : 'undefined');
console.log('- pageLoadTime:', typeof pageLoadTime !== 'undefined' ? pageLoadTime : 'undefined');

// Check modal elements
console.log('\n🎭 Modal elements:');
const modal = document.getElementById('nameInputModal');
const input = document.getElementById('playerNameInput');
console.log('- nameInputModal exists:', !!modal);
console.log('- playerNameInput exists:', !!input);

if (modal) {
    console.log('- modal classes:', modal.className);
    console.log('- modal display:', getComputedStyle(modal).display);
}

// Check functions
console.log('\n🔧 Function availability:');
console.log('- checkForHighScore:', typeof checkForHighScore);
console.log('- showNameInputModal:', typeof showNameInputModal);
console.log('- updateUI:', typeof updateUI);

// Manual test - set up conditions and trigger modal
console.log('\n🧪 MANUAL TEST:');
if (typeof score !== 'undefined') {
    // Set test conditions
    score = 100;
    gameWasPlayed = true;
    gameStartTime = Date.now() - 10000;
    scoreSubmitted = false;
    
    console.log('✅ Test conditions set');
    
    // Try to call checkForHighScore
    if (typeof checkForHighScore === 'function') {
        console.log('🚀 Calling checkForHighScore()...');
        checkForHighScore();
    } else {
        console.log('❌ checkForHighScore function not available');
    }
    
    // Also try showNameInputModal directly
    if (typeof showNameInputModal === 'function') {
        console.log('🚀 Calling showNameInputModal() directly...');
        showNameInputModal();
    } else {
        console.log('❌ showNameInputModal function not available');
    }
    
    // Check modal state after test
    setTimeout(() => {
        const modalAfter = document.getElementById('nameInputModal');
        const isVisible = modalAfter && !modalAfter.classList.contains('hide');
        console.log('\n📊 MODAL TEST RESULT:');
        console.log('- Modal visible:', isVisible);
        console.log('- Modal classes:', modalAfter ? modalAfter.className : 'N/A');
    }, 1000);
    
} else {
    console.log('❌ Cannot set test conditions - game variables not available');
}
