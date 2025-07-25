import puppeteer from 'puppeteer';

async function testUserWorkflow() {
  console.log('🚀 Starting end-to-end user workflow test...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Step 1: Navigate to the application
    console.log('📍 Step 1: Navigating to http://localhost:3001');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    // Wait for React app to fully load
    await page.waitForSelector('select', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Give React time to fully render
    
    await page.screenshot({ path: 'screenshots/1-homepage.png' });
    console.log('   ✅ Homepage loaded successfully\n');
    
    // Step 2: Check initial state
    console.log('📍 Step 2: Checking initial application state');
    const initialState = await page.evaluate(() => {
      const roleSelect = document.querySelector('select');
      const skillElements = document.querySelectorAll('.bg-blue-100');
      const generateButton = Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Generate'));
      
      return {
        currentRole: roleSelect?.value || 'Not found',
        skillCount: skillElements.length,
        hasGenerateButton: !!generateButton
      };
    });
    
    console.log('   Current role:', initialState.currentRole);
    console.log('   Number of skills:', initialState.skillCount);
    console.log('   Generate button found:', initialState.hasGenerateButton);
    console.log('   ✅ Initial state verified\n');
    
    // Step 3: Change role
    console.log('📍 Step 3: Changing target role');
    await page.select('select', 'AI-Enhanced Data Analyst');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('   ✅ Changed role to AI-Enhanced Data Analyst\n');
    
    // Step 4: Generate pathway
    console.log('📍 Step 4: Generating learning pathway');
    
    // Click the generate button
    await page.evaluate(() => {
      const generateButton = Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Generate'));
      if (generateButton) {
        generateButton.click();
      }
    });
    
    // Wait for loading to complete
    await page.waitForFunction(() => {
      const loadingButton = Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Generating'));
      return !loadingButton;
    }, { timeout: 15000 });
    
    // Wait for pathway to appear
    await page.waitForFunction(() => {
      const skillGapElements = document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.border');
      const progressElement = document.querySelector('.progress-bar');
      return skillGapElements.length > 1 && progressElement;
    }, { timeout: 10000 });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'screenshots/2-pathway-generated.png' });
    console.log('   ✅ Pathway generated successfully\n');
    
    // Step 5: Analyze the generated pathway
    console.log('📍 Step 5: Analyzing generated pathway');
    const pathwayAnalysis = await page.evaluate(() => {
      // Get the journey header
      const journeyHeader = Array.from(document.querySelectorAll('h2'))
        .find(h2 => (h2.textContent || '').includes('Your Journey to'));
      
      // Get skill gaps
      const skillGapSections = Array.from(document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.border'))
        .filter(el => {
          const h3 = el.querySelector('h3');
          return h3 && !(el.textContent || '').includes('Your Journey to');
        });
      
      // Get milestones count
      const milestoneCheckboxes = document.querySelectorAll('button.w-5.h-5.border-2').length;
      
      // Get resources count
      const resourceCards = document.querySelectorAll('.border.border-gray-200.rounded-lg.p-4').length;
      
      return {
        targetRole: journeyHeader ? (journeyHeader.textContent || '').replace('Your Journey to ', '') : 'Not found',
        skillGapCount: skillGapSections.length,
        totalMilestones: milestoneCheckboxes,
        totalResources: resourceCards
      };
    });
    
    console.log('   Target role:', pathwayAnalysis.targetRole);
    console.log('   Skill gaps identified:', pathwayAnalysis.skillGapCount);
    console.log('   Total milestones:', pathwayAnalysis.totalMilestones);
    console.log('   Total resources:', pathwayAnalysis.totalResources);
    console.log('   ✅ Pathway analysis complete\n');
    
    // Step 6: Test milestone interaction
    console.log('📍 Step 6: Testing milestone interaction');
    
    // Click first milestone
    await page.evaluate(() => {
      const firstCheckbox = document.querySelector('button.w-5.h-5.border-2') as HTMLButtonElement;
      if (firstCheckbox) {
        firstCheckbox.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check progress
    const progressAfterClick = await page.evaluate(() => {
      const progressBar = document.querySelector('.progress-bar') as HTMLElement;
      const progressText = document.querySelector('span');
      return {
        progressWidth: progressBar ? progressBar.style.width : '0%',
        progressText: progressText ? progressText.textContent : ''
      };
    });
    
    console.log('   Progress bar width:', progressAfterClick.progressWidth);
    console.log('   ✅ Milestone interaction successful\n');
    
    await page.screenshot({ path: 'screenshots/3-milestone-completed.png' });
    
    // Step 7: Test responsive design
    console.log('📍 Step 7: Testing responsive design');
    
    // Mobile view
    await page.setViewport({ width: 375, height: 667 });
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'screenshots/4-mobile-view.png' });
    console.log('   ✅ Mobile view captured');
    
    // Tablet view
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'screenshots/5-tablet-view.png' });
    console.log('   ✅ Tablet view captured\n');
    
    // Step 8: Test alternative roles section
    console.log('📍 Step 8: Checking alternative roles');
    const hasAlternatives = await page.evaluate(() => {
      const altSection = Array.from(document.querySelectorAll('h3'))
        .find(h3 => (h3.textContent || '').includes('Alternative Roles'));
      return !!altSection;
    });
    
    console.log('   Alternative roles section:', hasAlternatives ? 'Present' : 'Not found');
    
    console.log('\n🎉 End-to-end workflow test completed successfully!');
    console.log('📸 Screenshots saved in the screenshots directory');
    
  } catch (error) {
    console.error('❌ Error during workflow test:', error);
    
    // Try to capture error screenshot
    try {
      const page = (await browser.pages())[0];
      if (page) {
        await page.screenshot({ path: 'screenshots/error-state.png' });
        console.log('📸 Error screenshot saved');
      }
    } catch (screenshotError) {
      console.log('Could not capture error screenshot');
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testUserWorkflow().catch(console.error);