// Direct modal test script
// Run this in the browser console while the game is open

console.log('🔧 DIRECT MODAL TEST');
console.log('==================');

// Check if we're in the game context
if (typeof score === 'undefined') {
    console.log('❌ This script must be run in the game browser tab console');
    console.log('1. Open http://localhost:5080 in a new tab');
    console.log('2. Open browser dev tools (F12)');
    console.log('3. Go to Console tab');
    console.log('4. Paste and run this script');
} else {
    console.log('✅ Game context detected');
    
    // Display current game state
    console.log('\n📊 Current Game State:');
    console.log('- gameState:', gameState);
    console.log('- score:', score);
    console.log('- gameStartTime:', gameStartTime);
    console.log('- gameWasPlayed:', gameWasPlayed);
    console.log('- scoreSubmitted:', scoreSubmitted);
    console.log('- pageLoadTime:', pageLoadTime);
    
    // Check modal element
    const modal = document.getElementById('nameInputModal');
    console.log('\n🎭 Modal Element Check:');
    console.log('- modal exists:', !!modal);
    if (modal) {
        console.log('- modal classes:', modal.className);
        console.log('- modal display:', getComputedStyle(modal).display);
    }
    
    // Test 1: Force all conditions to be valid and test
    console.log('\n🧪 TEST 1: Setting up valid conditions...');
    window.score = 100;
    window.gameWasPlayed = true;
    window.gameStartTime = Date.now() - 10000; // 10 seconds ago
    window.scoreSubmitted = false;
    window.pageLoadTime = Date.now() - 30000; // 30 seconds ago
    
    console.log('✅ Test conditions set:');
    console.log('- score:', score, '(should be > 0)');
    console.log('- gameWasPlayed:', gameWasPlayed, '(should be true)');
    console.log('- gameStartTime:', gameStartTime, '(should be > 0)');
    console.log('- scoreSubmitted:', scoreSubmitted, '(should be false)');
    console.log('- pageLoadTime age:', Date.now() - pageLoadTime, 'ms (should be > 2000)');
    
    // Test checkForHighScore
    console.log('\n🚀 TEST 2: Testing checkForHighScore()...');
    if (typeof checkForHighScore === 'function') {
        checkForHighScore();
    } else {
        console.log('❌ checkForHighScore function not found');
    }
    
    // Test direct modal show
    console.log('\n🚀 TEST 3: Testing showNameInputModal() directly...');
    if (typeof showNameInputModal === 'function') {
        showNameInputModal();
        
        // Check result
        setTimeout(() => {
            const isVisible = !modal.classList.contains('hide');
            console.log('\n📊 Modal Test Result:');
            console.log('- Modal visible:', isVisible);
            console.log('- Modal classes after show:', modal.className);
            
            if (isVisible) {
                console.log('✅ SUCCESS! Modal is now visible');
                console.log('💡 Try typing in the input field to test keyboard functionality');
            } else {
                console.log('❌ FAILED! Modal is still hidden');
                console.log('🔍 Check console for error messages');
            }
        }, 500);
    } else {
        console.log('❌ showNameInputModal function not found');
    }
    
    console.log('\n🎮 MANUAL TEST:');
    console.log('1. Press SPACE to start a new game');
    console.log('2. Play until game over (let snake hit wall or itself)');
    console.log('3. Watch console for modal trigger messages');
    console.log('4. Modal should appear if score > 0');
}
