import puppeteer from 'puppeteer';

async function testUserWorkflow() {
  console.log('🚀 Starting end-to-end user workflow test with debugging...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Capture console logs
    page.on('console', msg => {
      console.log('   Browser console:', msg.type(), msg.text());
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      console.error('   Page error:', error.message);
    });
    
    // Capture response errors
    page.on('response', response => {
      if (!response.ok() && response.url().includes('/api/')) {
        console.error(`   API Error: ${response.status()} ${response.statusText()} for ${response.url()}`);
      }
    });
    
    // Step 1: Navigate to the application
    console.log('📍 Step 1: Navigating to http://localhost:3001');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    console.log('   ✅ Page loaded\n');
    
    // Wait for React to initialize
    await page.waitForSelector('select', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Check if pathway already exists
    console.log('📍 Step 2: Checking initial pathway state');
    const initialPathway = await page.evaluate(() => {
      const skillGaps = document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.border');
      return skillGaps.length;
    });
    console.log('   Initial skill gap sections:', initialPathway);
    
    // Step 3: Click generate button
    console.log('\n📍 Step 3: Clicking Generate My Pathway button');
    
    const buttonClicked = await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Generate My Pathway'));
      if (button) {
        (button as HTMLButtonElement).click();
        return true;
      }
      return false;
    });
    
    if (!buttonClicked) {
      console.log('   ❌ Could not find Generate button');
      return;
    }
    
    console.log('   ✅ Clicked Generate button');
    
    // Wait a bit to see if loading state appears
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if button shows loading state
    const loadingState = await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Generating'));
      return !!button;
    });
    
    console.log('   Loading state visible:', loadingState);
    
    // Wait for API response
    console.log('   Waiting for API response...');
    
    try {
      // Wait for either success or error state
      await page.waitForFunction(() => {
        // Check if loading finished
        const loadingButton = Array.from(document.querySelectorAll('button'))
          .find(btn => (btn.textContent || '').includes('Generating'));
        
        // Check if pathway appeared
        const skillGaps = document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.border');
        
        // Check if any error toast appeared
        const toast = document.querySelector('.fixed.top-4.right-4');
        
        return !loadingButton && (skillGaps.length > 2 || toast);
      }, { timeout: 15000 });
      
      console.log('   ✅ API response received\n');
    } catch (e) {
      console.log('   ❌ Timeout waiting for API response\n');
    }
    
    // Step 4: Check final state
    console.log('📍 Step 4: Checking final state');
    
    const finalState = await page.evaluate(() => {
      const skillGaps = document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.border');
      const toast = document.querySelector('.fixed.top-4.right-4');
      const milestones = document.querySelectorAll('button.w-5.h-5.border-2');
      const resources = document.querySelectorAll('.border.border-gray-200.rounded-lg.p-4');
      
      return {
        skillGapCount: skillGaps.length,
        hasToast: !!toast,
        toastText: toast ? toast.textContent : null,
        milestoneCount: milestones.length,
        resourceCount: resources.length
      };
    });
    
    console.log('   Skill gap sections:', finalState.skillGapCount);
    console.log('   Toast visible:', finalState.hasToast);
    if (finalState.toastText) {
      console.log('   Toast message:', finalState.toastText);
    }
    console.log('   Milestones found:', finalState.milestoneCount);
    console.log('   Resources found:', finalState.resourceCount);
    
    await page.screenshot({ path: 'screenshots/debug-final-state.png' });
    
    if (finalState.skillGapCount > 2 && finalState.milestoneCount > 0) {
      console.log('\n✅ Pathway generated successfully!');
    } else {
      console.log('\n❌ Pathway generation failed or incomplete');
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testUserWorkflow().catch(console.error);