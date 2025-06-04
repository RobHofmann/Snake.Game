// Quick debug script for Snake Game Modal Issue
// Run this in browser console on http://localhost:5080

console.log('🔍 DEBUGGING MODAL ISSUE');
console.log('========================');

// Check if we're in the game context
if (typeof score === 'undefined') {
    console.log('❌ Run this in the game browser tab console');
} else {
    console.log('✅ Game context detected');
    
    // Check current state
    console.log('\n📊 Current Game State:');
    console.log('- gameState:', gameState);
    console.log('- score:', score);
    console.log('- gameStartTime:', gameStartTime);
    console.log('- gameWasPlayed:', gameWasPlayed);
    console.log('- scoreSubmitted:', scoreSubmitted);
    console.log('- pageLoadTime:', pageLoadTime);
    
    // Check modal elements
    console.log('\n🎭 Modal Elements:');
    const modal = document.getElementById('nameInputModal');
    const input = document.getElementById('playerNameInput');
    console.log('- nameInputModal exists:', !!modal);
    console.log('- playerNameInput exists:', !!input);
    
    if (modal) {
        console.log('- modal classes:', modal.className);
        console.log('- modal display:', getComputedStyle(modal).display);
    }
    
    // Check functions
    console.log('\n🔧 Function Availability:');
    console.log('- checkForHighScore exists:', typeof checkForHighScore);
    console.log('- showNameInputModal exists:', typeof showNameInputModal);
    console.log('- updateUI exists:', typeof updateUI);
    
    // Test modal directly
    console.log('\n🧪 TESTING MODAL DIRECTLY:');
    
    // Set up test conditions
    window.score = 100;
    window.gameWasPlayed = true;
    window.gameStartTime = Date.now() - 10000;
    window.scoreSubmitted = false;
    window.pageLoadTime = Date.now() - 30000;
    
    console.log('✅ Test conditions set');
    
    // Test showNameInputModal
    if (typeof showNameInputModal === 'function') {
        console.log('🚀 Calling showNameInputModal...');
        try {
            showNameInputModal();
            
            setTimeout(() => {
                const isVisible = modal && !modal.classList.contains('hide');
                console.log('📊 Result: Modal visible =', isVisible);
                
                if (isVisible) {
                    console.log('✅ SUCCESS: Modal is working!');
                } else {
                    console.log('❌ FAILED: Modal not visible');
                    if (modal) {
                        console.log('- Modal classes:', modal.className);
                        console.log('- Modal display:', getComputedStyle(modal).display);
                    }
                }
            }, 500);
        } catch (error) {
            console.log('❌ Error calling showNameInputModal:', error);
        }
    } else {
        console.log('❌ showNameInputModal function not found');
    }
}

console.log('\n🎮 Manual Test Instructions:');
console.log('1. Press SPACE to start game');
console.log('2. Play until game over');
console.log('3. Watch for modal or console messages');
