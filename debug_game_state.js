// Debug script to check game state in real-time
// Run this in browser console while playing the Snake game

function checkGameState() {
    console.log('🔍 Current Game State Check:');
    console.log('- gameState:', window.gameState);
    console.log('- score:', window.score);
    console.log('- gameStartTime:', window.gameStartTime);
    console.log('- gameWasPlayed:', window.gameWasPlayed);
    console.log('- scoreSubmitted:', window.scoreSubmitted);
    console.log('- pageLoadTime:', window.pageLoadTime);
    
    if (window.gameStartTime > 0) {
        const timeSinceGameStart = Date.now() - window.gameStartTime;
        console.log('- timeSinceGameStart:', timeSinceGameStart + 'ms');
    }
    
    if (window.pageLoadTime > 0) {
        const timeSincePageLoad = Date.now() - window.pageLoadTime;
        console.log('- timeSincePageLoad:', timeSincePageLoad + 'ms');
    }
    
    // Check if conditions for modal are met
    const shouldShowModal = !window.scoreSubmitted && 
                           window.gameStartTime > 0 && 
                           window.score > 0 && 
                           window.gameWasPlayed;
    
    console.log('- shouldShowModal:', shouldShowModal);
    
    // Check modal element
    const modal = document.getElementById('nameInputModal');
    if (modal) {
        console.log('- modal element exists:', true);
        console.log('- modal has hide class:', modal.classList.contains('hide'));
        console.log('- modal computed display:', window.getComputedStyle(modal).display);
    } else {
        console.log('- modal element exists:', false);
    }
    
    console.log('---');
}

// Check state every 2 seconds
console.log('🚀 Starting real-time game state monitoring...');
console.log('💡 Play the game now - this will show state changes in real-time');

const interval = setInterval(checkGameState, 2000);

// Stop monitoring after 60 seconds
setTimeout(() => {
    clearInterval(interval);
    console.log('⏹️ Monitoring stopped');
}, 60000);

// Also check immediately
checkGameState();
