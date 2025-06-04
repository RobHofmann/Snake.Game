// Test script to manually test the modal conditions
// This can be pasted into the browser console

console.log('🧪 Manual Modal Test Starting...');

// First, check current game state
console.log('📊 Current Game State:');
console.log('- gameState:', window.gameState);
console.log('- score:', window.score);
console.log('- gameStartTime:', window.gameStartTime);
console.log('- gameWasPlayed:', window.gameWasPlayed);
console.log('- scoreSubmitted:', window.scoreSubmitted);
console.log('- pageLoadTime:', window.pageLoadTime);

// Set up perfect test conditions
console.log('\n🔧 Setting up test conditions...');
window.gameState = 'GameOver';
window.score = 150;
window.gameStartTime = Date.now() - 10000; // 10 seconds ago
window.gameWasPlayed = true;
window.scoreSubmitted = false;
window.pageLoadTime = Date.now() - 60000; // 60 seconds ago

console.log('✅ Test conditions set:');
console.log('- gameState:', window.gameState);
console.log('- score:', window.score);
console.log('- gameStartTime:', window.gameStartTime);
console.log('- gameWasPlayed:', window.gameWasPlayed);
console.log('- scoreSubmitted:', window.scoreSubmitted);
console.log('- pageLoadTime age:', Date.now() - window.pageLoadTime, 'ms');

// Check updateUI condition
const updateUICondition = !window.scoreSubmitted && 
                         window.gameStartTime > 0 && 
                         window.score > 0 && 
                         window.gameWasPlayed;

console.log('\n📋 UpdateUI condition check:');
console.log('- !scoreSubmitted:', !window.scoreSubmitted);
console.log('- gameStartTime > 0:', window.gameStartTime > 0);
console.log('- score > 0:', window.score > 0);
console.log('- gameWasPlayed:', window.gameWasPlayed);
console.log('- Overall condition met:', updateUICondition);

// Test calling updateUI
console.log('\n🚀 Calling updateUI()...');
if (typeof window.updateUI === 'function') {
    window.updateUI();
    
    // Check if modal appeared
    setTimeout(() => {
        const modal = document.getElementById('nameInputModal');
        const isVisible = modal && !modal.classList.contains('hide');
        
        console.log('\n📊 MODAL TEST RESULT:');
        console.log('- Modal element exists:', !!modal);
        console.log('- Modal visible (no hide class):', !modal?.classList.contains('hide'));
        console.log('- Modal computed display:', modal ? window.getComputedStyle(modal).display : 'N/A');
        console.log('- Modal is actually visible:', isVisible);
        
        if (isVisible) {
            console.log('✅ SUCCESS! Modal is visible!');
        } else {
            console.log('❌ FAILED! Modal is not visible');
            console.log('🔍 Modal classes:', modal?.className);
        }
    }, 500);
} else {
    console.log('❌ updateUI function not found');
}

console.log('\n🎯 Test complete. Check results above.');
